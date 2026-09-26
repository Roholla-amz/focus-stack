import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import useLinkableText from '../hooks/useLinkableText'
import LinkedText from './LinkedText'
import LinkChips from './LinkChips'
import LinkPopover from './LinkPopover'
import { formatDuration, formatAge } from '../lib/format'

export default function StackItem({ item, isTop, isPopping, drift, depth, now, focusMs, onDone, onRename }) {
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
      {isTop && (
        <div className="focus-meta">
          <span className="focus-label">Current focus</span>
          <span className="time-badge">{formatDuration(focusMs)}</span>
        </div>
      )}
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
            <LinkedText text={item.text} links={item.links} />
          </span>
        )}
        {!isTop && now - item.createdAt >= 60000 && (
          <span className="wait-age">waiting {formatAge(now - item.createdAt)}</span>
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
