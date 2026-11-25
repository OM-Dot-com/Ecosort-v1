import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set GEMINI_API_KEY in your environment variables.' },
        { status: 503 }
      )
    }

    // Auth check
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    // Check daily scan limit
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('daily_scan_count, last_scan_date')
      .eq('id', user.id)
      .single()

    const today = new Date().toISOString().split('T')[0]
    let dailyCount = profile?.daily_scan_count || 0
    if (profile?.last_scan_date !== today) {
      dailyCount = 0
    }
    if (dailyCount >= 10) {
      return NextResponse.json({ error: 'Daily scan limit reached (10 per day). Try again tomorrow!' }, { status: 429 })
    }

    // Get image from form data
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Convert to base64
    const bytes = await imageFile.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = imageFile.type || 'image/jpeg'

    // Call Gemini API with retry and fallback models
    const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    const requestBody = JSON.stringify({
      contents: [{
        parts: [
          {
            text: `Analyze this waste image. Identify the waste item and return a JSON object with these fields:
- waste_name: string (name of the waste item)
- waste_category: string (one of: "Wet Waste", "Dry Waste", "Recyclable", "Non-Recyclable", "Hazardous", "E-Waste")
- recommended_bin: string (which bin to use)
- bin_color: string (hex color code for the bin, e.g. "#16a34a" for green)
- recyclable: boolean
- disposal_instructions: string (2-3 sentences on how to properly dispose)
- environmental_impact: string (2-3 sentences on environmental impact)
- confidence_score: number (0 to 1, your confidence in the classification)

Return ONLY valid JSON, no markdown formatting, no code blocks.`
          },
          {
            inlineData: {
              mimeType,
              data: base64,
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      }
    })

    let geminiResponse: Response | null = null
    let lastError = ''

    for (const model of models) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`

      // Try up to 2 times per model
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const resp = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          })

          if (resp.ok) {
            geminiResponse = resp
            break
          }

          lastError = await resp.text()
          console.error(`Gemini ${model} attempt ${attempt + 1} error:`, lastError)

          // If 404 (model not found), skip to next model immediately
          if (resp.status === 404) break

          // If 503/429 (overloaded/rate limited), wait before retry
          if (resp.status === 503 || resp.status === 429) {
            await new Promise(r => setTimeout(r, 1500))
          }
        } catch (e) {
          console.error(`Gemini ${model} attempt ${attempt + 1} fetch error:`, e)
          lastError = String(e)
        }
      }

      if (geminiResponse) break
    }

    if (!geminiResponse) {
      console.error('All Gemini models failed. Last error:', lastError)
      return NextResponse.json(
        { error: 'AI analysis failed. The service is temporarily unavailable. Please try again in a few seconds.' },
        { status: 502 }
      )
    }

    const geminiData = await geminiResponse.json()
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textContent) {
      return NextResponse.json({ error: 'AI returned no results. Try with a clearer image.' }, { status: 422 })
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let scanResult
    try {
      const jsonStr = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      scanResult = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse Gemini response:', textContent)
      return NextResponse.json({ error: 'AI returned an unexpected format. Please try again.' }, { status: 422 })
    }

    // Determine if verification needed
    const needsVerification = (scanResult.confidence_score || 0) < 0.6

    // Save scan to database
    const { data: scan, error: scanError } = await serviceClient
      .from('waste_scans')
      .insert({
        user_id: user.id,
        waste_name: scanResult.waste_name || 'Unknown',
        waste_category: scanResult.waste_category || 'Non-Recyclable',
        recommended_bin: scanResult.recommended_bin || 'General Waste',
        bin_color: scanResult.bin_color || '#6b7280',
        recyclable: scanResult.recyclable ?? false,
        disposal_instructions: scanResult.disposal_instructions || '',
        environmental_impact: scanResult.environmental_impact || '',
        confidence_score: scanResult.confidence_score || 0,
        needs_verification: needsVerification,
        points_awarded: 5,
      })
      .select()
      .single()

    if (scanError) {
      console.error('DB error:', scanError)
      return NextResponse.json({ error: 'Failed to save scan results.' }, { status: 500 })
    }

    // Award points
    await serviceClient.from('point_transactions').insert({
      user_id: user.id,
      points: 5,
      transaction_type: 'scan',
      description: `Scanned: ${scanResult.waste_name}`,
      reference_id: scan.id,
      reference_type: 'waste_scan',
    })

    // Update profile with points
    const { data: currentProfile } = await serviceClient
      .from('profiles')
      .select('total_points, waste_scans_count')
      .eq('id', user.id)
      .single()

    if (currentProfile) {
      await serviceClient
        .from('profiles')
        .update({
          total_points: (currentProfile.total_points || 0) + 5,
          waste_scans_count: (currentProfile.waste_scans_count || 0) + 1,
          daily_scan_count: dailyCount + 1,
          last_scan_date: today,
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      scan,
      pointsAwarded: 5,
    })
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
