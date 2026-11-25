export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getBinColor(category: string): string {
  const colors: Record<string, string> = {
    'Wet Waste': '#16a34a',
    'Dry Waste': '#2563eb',
    'Recyclable': '#eab308',
    'Non-Recyclable': '#ef4444',
    'Hazardous': '#dc2626',
    'E-Waste': '#7c3aed',
  }
  return colors[category] || '#6b7280'
}

export function getBinName(category: string): string {
  const bins: Record<string, string> = {
    'Wet Waste': 'Green Bin',
    'Dry Waste': 'Blue Bin',
    'Recyclable': 'Yellow Bin',
    'Non-Recyclable': 'Red Bin',
    'Hazardous': 'Red Bin (Hazardous)',
    'E-Waste': 'E-Waste Collection Point',
  }
  return bins[category] || 'General Waste Bin'
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
