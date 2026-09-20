export default function StackItem({ item, isTop, depth, onDone }) {
  return (
    <li
      className={isTop ? 'stack-item top' : 'stack-item'}
      style={{ '--depth': depth }}
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
