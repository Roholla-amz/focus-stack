import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  if (topSince === null) return { stack, topSince: null }
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
    const paused = parsed?.paused === true
    const pausedSince =
      paused && typeof parsed?.pausedSince === 'number' ? parsed.pausedSince : null
    let pausedTotalMs =
      typeof parsed?.pausedTotalMs === 'number' && parsed.pausedTotalMs >= 0
        ? parsed.pausedTotalMs
        : 0
    if (paused && pausedSince !== null) {
      pausedTotalMs += Math.max(0, Date.now() - pausedSince)
    }
    const topSince =
      typeof parsed?.topSince === 'number'
        ? parsed.topSince
        : stack.length > 0 && !paused
          ? Date.now()
          : null
    return {
      stack,
      done,
      topSince: paused ? null : topSince,
      paused,
      pausedSince: paused ? Date.now() : null,
      pausedTotalMs,
    }
  } catch {
    return { stack: [], done: [], topSince: null, paused: false, pausedSince: null, pausedTotalMs: 0 }
  }
}

export default function App() {
  const [{ stack, done, topSince, paused, pausedSince, pausedTotalMs }, setState] = useState(loadState)
  const [popping, setPopping] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [flipTick, setFlipTick] = useState(0)
  const stackListRef = useRef(null)
  const flipFirst = useRef(null)

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
      return { ...prev, stack: arrayMove(settled.stack, from, to), topSince: settled.topSince }
    })
  }

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ stack, done, topSince, paused, pausedSince, pausedTotalMs })
    )
  }, [stack, done, topSince, paused, pausedSince, pausedTotalMs])

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
        topSince: prev.paused ? null : now,
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
        if (!popped) return { ...prev, ...settled }
        return {
          ...prev,
          ...settled,
          stack: settled.stack.filter((item) => item.id !== poppedId),
          done: [{ ...popped, doneAt: now }, ...prev.done],
        }
      })
      setPopping(null)
    }, POP_ANIMATION_MS)
  }

  const togglePause = () => {
    setState((prev) => {
      const now = Date.now()
      if (prev.paused) {
        return {
          ...prev,
          paused: false,
          pausedSince: null,
          pausedTotalMs: prev.pausedTotalMs + Math.max(0, now - prev.pausedSince),
          topSince: prev.stack.length > 0 ? now : null,
        }
      }
      const settled = settleFocus(prev.stack, prev.topSince, now)
      return {
        ...prev,
        stack: settled.stack,
        topSince: null,
        paused: true,
        pausedSince: now,
      }
    })
  }

  const reverseStack = () => {
    if (stack.length < 2 || popping) return
    const first = new Map()
    stackListRef.current?.querySelectorAll('.stack-item').forEach((li) => {
      first.set(li.dataset.id, li.getBoundingClientRect().top)
    })
    flipFirst.current = first
    setFlipTick((t) => t + 1)
    setState((prev) => {
      const now = Date.now()
      const settled = settleFocus(prev.stack, prev.topSince, now)
      return {
        ...prev,
        stack: settled.stack.slice().reverse(),
        topSince: prev.paused ? null : settled.topSince,
      }
    })
  }

  useLayoutEffect(() => {
    if (flipTick === 0) return
    const list = stackListRef.current
    const first = flipFirst.current
    flipFirst.current = null
    if (!list || !first || first.size === 0) return
    const anims = []
    list.querySelectorAll('.stack-item').forEach((li) => {
      const from = first.get(li.dataset.id)
      if (typeof from !== 'number') return
      const dy = from - li.getBoundingClientRect().top
      if (Math.abs(dy) < 1) return
      li.style.pointerEvents = 'none'
      const anim = li.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
        { duration: 1250, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      )
      const restore = () => {
        li.style.pointerEvents = ''
      }
      anim.finished.then(restore).catch(restore)
      anims.push(anim)
    })
    return () => {
      anims.forEach((a) => a.cancel())
    }
  }, [flipTick])

  const topItem = stack.length > 0 ? stack[stack.length - 1] : null
  const topId = topItem?.id ?? null
  const focusMs = topItem
    ? (topItem.timeSpent ?? 0) + (typeof topSince === 'number' ? now - topSince : 0)
    : 0
  const effectiveNow =
    paused && typeof pausedSince === 'number' ? pausedSince - pausedTotalMs : now - pausedTotalMs
  const waiting = stack.length - 1

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1 className="title">Focus Stack</h1>
          <p className="subtitle">One task at a time. New stuff goes on top.</p>
        </div>
        <button
          type="button"
          className={`pause-btn${paused ? ' paused' : ''}`}
          onClick={togglePause}
          aria-label={paused ? 'Resume tracking' : 'Pause tracking'}
          title={paused ? 'Resume tracking' : 'Pause tracking'}
        >
          {paused ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <path d="M3.5 1.5v11l9-5.5z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <rect x="2.5" y="1.5" width="3.2" height="11" rx="1" />
              <rect x="8.3" y="1.5" width="3.2" height="11" rx="1" />
            </svg>
          )}
        </button>
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
              <ol className="stack" ref={stackListRef}>
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
                      now={effectiveNow}
                      focusMs={item.id === topId ? focusMs : null}
                      paused={paused}
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
        <div className="depth-hint">
          <span className="depth-hint-text">
            {waiting} task{waiting === 1 ? '' : 's'} waiting underneath
          </span>
          <button
            type="button"
            className="reverse-btn"
            onClick={reverseStack}
            aria-label="Reverse stack"
            title="Reverse stack"
          />
        </div>
      )}
      <DonePanel done={done} onRemove={removeDone} />
    </main>
  )
}
