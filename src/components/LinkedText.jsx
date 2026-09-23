export default function LinkedText({ text, links }) {
  if (!links || links.length === 0) return text
  const parts = []
  let pos = 0
  links.forEach((l, i) => {
    if (l.start > pos) parts.push(<span key={`t${i}`}>{text.slice(pos, l.start)}</span>)
    parts.push(
      <a
        key={`l${i}`}
        href={l.url}
        target="_blank"
        rel="noreferrer"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {text.slice(l.start, l.end)}
      </a>
    )
    pos = l.end
  })
  if (pos < text.length) parts.push(<span key="tail">{text.slice(pos)}</span>)
  return parts
}
