import { useState } from 'react'
import LinkedText from './LinkedText'
import { formatDuration } from '../lib/format'

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DonePanel({ done, onRemove, onUndo }) {
  const [open, setOpen] = useState(false)

  return (
    <aside className={`done-panel${open ? ' open' : ''}`} aria-label="Completed tasks">
      <button
        type="button"
        className={`done-toggle${open ? ' open' : ''}`}
        aria-expanded={open}
        title={open ? 'Hide completed tasks' : 'Show completed tasks'}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="done-toggle-arrow">{open ? '‹' : '›'}</span>
        <span className="done-toggle-label">
          Done{done.length > 0 ? ` (${done.length})` : ''}
        </span>
      </button>
      <div className="done-panel-inner">
        <header className="done-panel-head">
          <h2 className="done-panel-title">Done</h2>
        </header>
        {done.length === 0 ? (
          <p className="done-panel-empty">Nothing completed yet.</p>
        ) : (
          <ul className="done-list">
            {done.map((item) => (
              <li key={item.id} className="done-item">
                <div className="done-item-main">
                  <span className="done-item-text">
                    <LinkedText text={item.text} links={item.links} />
                  </span>
                  <div className="done-item-meta">
                    <span className="done-item-time">Created {formatTime(item.createdAt)}</span>
                    <span className="done-item-time">Done {formatTime(item.doneAt)}</span>
                    {item.timeSpent > 0 && (
                      <span className="done-item-time">
                        Focused {formatDuration(item.timeSpent)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="done-undo"
                  aria-label={`Put back on stack: ${item.text}`}
                  title="Put back on stack"
                  onClick={() => onUndo(item.id)}
                />
                <button
                  type="button"
                  className="done-remove"
                  aria-label={`Remove: ${item.text}`}
                  title="Remove"
                  onClick={() => onRemove(item.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
