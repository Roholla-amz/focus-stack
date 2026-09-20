export default function StackItem({ item, isTop, isPopping, drift, depth, onDone }) {
  const classes = ['stack-item']
  if (isTop) classes.push('top')
  if (isPopping) classes.push('popping')

  return (
    <li
      className={classes.join(' ')}
      style={{
        '--depth': depth,
        '--drift': `${drift}px`,
        '--tilt': drift < 0 ? '-9deg' : '9deg',
      }}
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
