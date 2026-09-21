import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function StackItem({ item, isTop, isPopping, drift, depth, onDone }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

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
      {...attributes}
      {...listeners}
    >
      {isTop && <span className="focus-label">Current focus</span>}
      <span className="item-text">{item.text}</span>
      {isTop && (
        <button className="done-btn" onClick={onDone}>
          Done
        </button>
      )}
    </li>
  )
}
