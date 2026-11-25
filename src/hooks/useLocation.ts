'use client'
import { useState, useEffect } from 'react'

interface LocationData {
  latitude: number
  longitude: number
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ latitude: 28.6139, longitude: 77.209 })
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLoading(false)
      },
      () => {
        setPermissionDenied(true)
        setLocation({ latitude: 28.6139, longitude: 77.209 })
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }, [])

  const setManualLocation = (lat: number, lng: number) => {
    setLocation({ latitude: lat, longitude: lng })
    setPermissionDenied(false)
  }

  return { location, loading, permissionDenied, setManualLocation }
}
