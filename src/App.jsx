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
import DonePanel from './components/DonePanel'
import { adjustLinksForTrim } from './lib/links'
import './App.css'

const STORAGE_KEY = 'focus-stack'
const POP_ANIMATION_MS = 950

function sanitizeItem(item) {
  if (!item || typeof item.text !== 'string') return null
  return {
    id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
    text: item.text,
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
    createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
    timeSpent:
      typeof item.timeSpent === 'number' && item.timeSpent >= 0 ? item.timeSpent : 0,
    doneAt: typeof item.doneAt === 'number' ? item.doneAt : null,
  }
}

function settleFocus(stack, topSince, now) {
  if (stack.length === 0) return { stack, topSince: null }
  if (typeof topSince !== 'number') return { stack, topSince: now }
  const elapsed = Math.max(0, now - topSince)
  const idx = stack.length - 1
  const top = stack[idx]
  if (elapsed === 0) return { stack, topSince }
  const settled = stack.slice()
  settled[idx] = { ...top, timeSpent: (top.timeSpent ?? 0) + elapsed }
  return { stack: settled, topSince: now }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const stackRaw = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.stack) ? parsed.stack : []
    const doneRaw = Array.isArray(parsed?.done) ? parsed.done : []
    const stack = stackRaw.map(sanitizeItem).filter(Boolean)
    const done = doneRaw.map(sanitizeItem).filter(Boolean)
    const topSince =
      typeof parsed?.topSince === 'number' ? parsed.topSince : stack.length > 0 ? Date.now() : null
    return { stack, done, topSince }
  } catch {
    return { stack: [], done: [], topSince: null }
  }
}

export default function App() {
  const [{ stack, done, topSince }, setState] = useState(loadState)
  const [popping, setPopping] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const renameItem = (id, rawText, rawLinks) => {
    const { text, links } = adjustLinksForTrim(rawText, rawLinks ?? [])
    if (text.length === 0) return
    setState((prev) => {
      const existing = prev.stack.find((item) => item.id === id)
      if (!existing) return prev
      if (existing.text === text && JSON.stringify(existing.links) === JSON.stringify(links)) {
        return prev
      }
      return {
        ...prev,
        stack: prev.stack.map((item) => (item.id === id ? { ...item, text, links } : item)),
      }
    })
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setState((prev) => {
      const from = prev.stack.findIndex((item) => item.id === active.id)
      const to = prev.stack.findIndex((item) => item.id === over.id)
      if (from === -1 || to === -1) return prev
      const moved = arrayMove(prev.stack, from, to)
      const oldTopId = prev.stack[prev.stack.length - 1]?.id
      const newTopId = moved[moved.length - 1]?.id
      if (oldTopId === newTopId) return { ...prev, stack: moved }
      const now = Date.now()
      const settled = settleFocus(prev.stack, prev.topSince, now)
      return { ...prev, stack: arrayMove(settled.stack, from, to), topSince: now }
    })
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stack, done, topSince }))
  }, [stack, done, topSince])

  const push = (rawText, rawLinks) => {
    const { text, links } = adjustLinksForTrim(rawText, rawLinks ?? [])
    if (text.length === 0) return
    setState((prev) => {
      const now = Date.now()
      const settled = settleFocus(prev.stack, prev.topSince, now)
      return {
        ...prev,
        stack: [
          ...settled.stack,
          { id: crypto.randomUUID(), text, links, createdAt: now, timeSpent: 0 },
        ],
        topSince: now,
      }
    })
  }

  const removeDone = (id) => {
    setState((prev) => ({ ...prev, done: prev.done.filter((item) => item.id !== id) }))
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
      const poppedId = top.id
      setState((prev) => {
        const now = Date.now()
        const settled = settleFocus(prev.stack, prev.topSince, now)
        const popped = settled.stack.find((item) => item.id === poppedId)
        if (!popped) return settled
        return {
          ...settled,
          stack: settled.stack.filter((item) => item.id !== poppedId),
          done: [{ ...popped, doneAt: now }, ...prev.done],
        }
      })
      setPopping(null)
    }, POP_ANIMATION_MS)
  }

  const topItem = stack.length > 0 ? stack[stack.length - 1] : null
  const topId = topItem?.id ?? null
  const focusMs = topItem
    ? (topItem.timeSpent ?? 0) + (typeof topSince === 'number' ? now - topSince : 0)
    : 0
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
                      now={now}
                      focusMs={item.id === topId ? focusMs : null}
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
      <DonePanel done={done} onRemove={removeDone} />
    </main>
  )
}
