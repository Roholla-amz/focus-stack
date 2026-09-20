import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import AddTaskForm from './components/AddTaskForm'
import StackItem from './components/StackItem'
import './App.css'

const STORAGE_KEY = 'focus-stack'

function loadStack() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function App() {
  const [stack, setStack] = useState(loadStack)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stack))
  }, [stack])

  const push = (text) => {
    setStack((prev) => [...prev, { id: crypto.randomUUID(), text, createdAt: Date.now() }])
  }

  const pop = () => {
    if (stack.length === 0) return
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#a78bfa', '#f472b6', '#34d399', '#fbbf24'],
    })
    setStack(stack.slice(0, -1))
  }

  const topId = stack.length > 0 ? stack[stack.length - 1].id : null
  const waiting = stack.length - 1

  return (
    <main className="app">
      <header>
        <h1 className="title">Focus Stack</h1>
        <p className="subtitle">One task at a time. New stuff goes on top.</p>
      </header>
      <AddTaskForm onPush={push} />
      <div className="stack-box">
        {stack.length === 0 ? (
          <p className="empty">Stack is empty — nothing to focus on. Add a task to begin.</p>
        ) : (
          <ol className="stack">
            {stack
              .slice()
              .reverse()
              .map((item, reverseIndex) => (
                <StackItem
                  key={item.id}
                  item={item}
                  isTop={item.id === topId}
                  depth={reverseIndex}
                  onDone={pop}
                />
              ))}
          </ol>
        )}
      </div>
      {waiting > 0 && (
        <p className="depth-hint">
          {waiting} task{waiting === 1 ? '' : 's'} waiting underneath
        </p>
      )}
    </main>
  )
}
