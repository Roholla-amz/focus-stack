import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import useLinkableText from '../hooks/useLinkableText'
import LinkChips from './LinkChips'
import LinkPopover from './LinkPopover'

function renderTextWithLinks(text, links) {
  const parts = []
  let pos = 0
  ;(links ?? []).forEach((l, i) => {
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

export default function StackItem({ item, isTop, isPopping, drift, depth, onDone, onRename }) {
  const [editing, setEditing] = useState(false)
  const edit = useLinkableText()
  const pointerStart = useRef(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  useEffect(() => {
    if (editing) {
      const input = edit.inputProps.ref.current
      if (input) {
        input.focus()
        input.setSelectionRange(input.value.length, input.value.length)
      }
    }
  }, [editing])

  const startEdit = (e) => {
    const start = pointerStart.current
    if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 8) return
    edit.beginEdit(item.text, item.links ?? [])
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    onRename(item.id, edit.text, edit.links)
  }

  const cancel = () => setEditing(false)

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
            {...edit.inputProps}
            className="edit-input"
            type="text"
            maxLength={80}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') cancel()
            }}
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
                edit.beginEdit(item.text, item.links ?? [])
                setEditing(true)
              }
            }}
          >
            {renderTextWithLinks(item.text, item.links)}
          </span>
        )}
        {isTop && (
          <button className="done-btn" onClick={onDone} onKeyDown={(e) => e.stopPropagation()}>
            Done
          </button>
        )}
      </div>
      {editing && <LinkChips text={edit.text} links={edit.links} onRemove={edit.removeLink} />}
      {editing && edit.popover && (
        <LinkPopover
          key={`${edit.popover.start}:${edit.popover.end}`}
          popover={edit.popover}
          onApply={edit.applyUrl}
          onCancel={edit.cancelPopover}
          onKeep={edit.keepPopover}
        />
      )}
    </li>
  )
}
