import { useState } from 'react'

export default function AddTaskForm({ onPush }) {
  const [text, setText] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    onPush(trimmed)
    setText('')
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <input
        className="add-input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs your focus?"
        maxLength={80}
        autoFocus
      />
      <button className="add-btn" type="submit" disabled={text.trim().length === 0}>
        Push
      </button>
    </form>
  )
}
