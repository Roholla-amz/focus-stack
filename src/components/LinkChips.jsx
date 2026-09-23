export default function LinkChips({ text, links, onRemove }) {
  if (!links || links.length === 0) return null
  return (
    <div className="link-chips">
      {links.map((l) => (
        <span key={`${l.start}-${l.end}`} className="link-chip">
          <a
            href={l.url}
            target="_blank"
            rel="noreferrer"
            title={l.url}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {text.slice(l.start, l.end)}
          </a>
          <button type="button" className="chip-remove" aria-label="Remove link" onClick={() => onRemove(l)}>
            ×
          </button>
        </span>
      ))}
    </div>
  )
}
