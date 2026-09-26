export function formatDuration(ms) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000))
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, '0')}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

export function formatAge(ms) {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000))
  if (total < 60) return 'moments'
  if (total < 3600) return `${Math.floor(total / 60)}m`
  if (total < 86400) return `${Math.floor(total / 3600)}h`
  return `${Math.floor(total / 86400)}d`
}
