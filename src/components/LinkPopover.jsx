import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function LinkPopover({ popover, onApply, onCancel, onKeep }) {
  const [url, setUrl] = useState(popover.initialUrl)

  useEffect(() => {
    onKeep()
  }, [])

  return createPortal(
    <div className="link-popover" style={{ left: popover.x, top: popover.y }}>
      <span className="link-quote" title={popover.selectionText}>
        &quot;{popover.selectionText}&quot;
      </span>
      <input
        type="text"
        value={url}
        placeholder="https://…"
        onChange={(e) => setUrl(e.target.value)}
        onFocus={onKeep}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            onApply(url)
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
      />
      <button type="button" className="link-apply" onClick={() => onApply(url)}>
        Apply
      </button>
    </div>,
    document.body
  )
}
