import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import AddTaskForm from './components/AddTaskForm'
import StackItem from './components/StackItem'
import { adjustLinksForTrim } from './lib/links'
import './App.css'

const STORAGE_KEY = 'focus-stack'
const POP_ANIMATION_MS = 950

function loadStack() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.text === 'string')
      .map((item) => ({
        ...item,
        links: Array.isArray(item.links)
          ? item.links.filter(
              (l) =>
                l &&
                typeof l.url === 'string' &&
                Number.isInteger(l.start) &&
                Number.isInteger(l.end) &&
                l.start >= 0 &&
                l.end > l.start &&
                l.end <= item.text.length
            )
          : [],
      }))
  } catch {
    return []
  }
}

export default function App() {
  const [stack, setStack] = useState(loadStack)
  const [popping, setPopping] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const renameItem = (id, rawText, rawLinks) => {
    const { text, links } = adjustLinksForTrim(rawText, rawLinks ?? [])
    if (text.length === 0) return
    setStack((prev) => {
      const existing = prev.find((item) => item.id === id)
      if (!existing) return prev
      if (existing.text === text && JSON.stringify(existing.links) === JSON.stringify(links)) {
        return prev
      }
      return prev.map((item) => (item.id === id ? { ...item, text, links } : item))
    })
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setStack((prev) => {
      const from = prev.findIndex((item) => item.id === active.id)
      const to = prev.findIndex((item) => item.id === over.id)
      if (from === -1 || to === -1) return prev
      return arrayMove(prev, from, to)
    })
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stack))
  }, [stack])

  const push = (rawText, rawLinks) => {
    const { text, links } = adjustLinksForTrim(rawText, rawLinks ?? [])
    if (text.length === 0) return
    setStack((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, links, createdAt: Date.now() },
    ])
  }

  const pop = () => {
    if (stack.length === 0 || popping) return
    const top = stack[stack.length - 1]
    const drift = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 30)
    setPopping({ id: top.id, drift })
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#a78bfa', '#f472b6', '#34d399', '#fbbf24'],
    })
    setTimeout(() => {
      setStack((prev) => prev.filter((item) => item.id !== top.id))
      setPopping(null)
    }, POP_ANIMATION_MS)
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stack.slice().reverse().map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="stack">
                {stack
                  .slice()
                  .reverse()
                  .map((item, reverseIndex) => (
                    <StackItem
                      key={item.id}
                      item={item}
                      isTop={item.id === topId}
                      isPopping={item.id === popping?.id}
                      drift={item.id === popping?.id ? popping.drift : 0}
                      depth={reverseIndex}
                      onDone={pop}
                      onRename={renameItem}
                    />
                  ))}
              </ol>
            </SortableContext>
          </DndContext>
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
