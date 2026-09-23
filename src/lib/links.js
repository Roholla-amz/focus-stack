export function normalizeUrl(url) {
  const trimmed = (url ?? '').trim()
  if (trimmed.length === 0) return ''
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function applyLinkToSelection(links, start, end, url) {
  const kept = (links ?? []).filter((l) => l.end <= start || l.start >= end)
  if (!url) return kept
  return [...kept, { start, end, url }].sort((a, b) => a.start - b.start)
}

function diffSingleEdit(oldText, newText) {
  let p = 0
  const maxP = Math.min(oldText.length, newText.length)
  while (p < maxP && oldText[p] === newText[p]) p++
  let s = 0
  while (
    s < oldText.length - p &&
    s < newText.length - p &&
    oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]
  ) {
    s++
  }
  return {
    start: p,
    deletedLen: oldText.length - p - s,
    insertedLen: newText.length - p - s,
  }
}

export function adjustLinksForEdit(oldText, newText, links) {
  if (oldText === newText) return links
  const { start: e0, deletedLen, insertedLen } = diffSingleEdit(oldText, newText)
  const e1 = e0 + deletedLen
  const shift = insertedLen - deletedLen
  const adjusted = []
  for (const l of links ?? []) {
    const rawStart = l.start <= e0 ? l.start : l.start >= e1 ? l.start + shift : e0
    let rawEnd = l.end <= e0 ? l.end : l.end >= e1 ? l.end + shift : e0
    const start = Math.max(0, Math.min(rawStart, newText.length))
    const end = Math.min(Math.max(rawEnd, start), newText.length)
    if (end > start) adjusted.push({ start, end, url: l.url })
  }
  return adjusted.sort((a, b) => a.start - b.start)
}

export function adjustLinksForTrim(text, links) {
  const noTrailingText = text.replace(/\s+$/, '')
  const noTrailing = adjustLinksForEdit(text, noTrailingText, links)
  const noLeadingText = noTrailingText.replace(/^\s+/, '')
  const noLeading = adjustLinksForEdit(noTrailingText, noLeadingText, noTrailing)
  return { text: noLeadingText, links: noLeading }
}
