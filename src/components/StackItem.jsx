import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function StackItem({ item, isTop, isPopping, drift, depth, onDone, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const inputRef = useRef(null)
  const pointerStart = useRef(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const startEdit = (e) => {
    const start = pointerStart.current
    if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 8) return
    setDraft(item.text)
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    onRename(item.id, draft)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(item.text)
  }

  const classes = ['stack-item']
  if (isTop) classes.push('top')
  if (isPopping) classes.push('popping')
  if (isDragging) classes.push('dragging')

  return (
    <li
      ref={setNodeRef}
      className={classes.join(' ')}
      style={{
        '--depth': depth,
        '--drift': `${drift}px`,
        '--tilt': drift < 0 ? '-9deg' : '9deg',
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
      }}
      onPointerDownCapture={(e) => {
        pointerStart.current = [e.clientX, e.clientY]
      }}
      {...attributes}
      {...listeners}
    >
      {isTop && <span className="focus-label">Current focus</span>}
      <div className="item-row">
        {editing ? (
          <input
            ref={inputRef}
            className="edit-input"
            type="text"
            value={draft}
            maxLength={80}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') cancel()
            }}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="item-text"
            role="button"
            tabIndex={0}
            aria-label={`Edit task: ${item.text}`}
            title="Click to edit"
            onClick={startEdit}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setDraft(item.text)
                setEditing(true)
              }
            }}
          >
            {item.text}
          </span>
        )}
        {isTop && (
          <button className="done-btn" onClick={onDone} onKeyDown={(e) => e.stopPropagation()}>
            Done
          </button>
        )}
      </div>
    </li>
  )
}
