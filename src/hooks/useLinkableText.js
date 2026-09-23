import { useRef, useState } from 'react'
import { adjustLinksForEdit, applyLinkToSelection, normalizeUrl } from '../lib/links'

function measureTextWidth(input, upTo) {
  const cs = getComputedStyle(input)
  const mirror = document.createElement('div')
  for (const prop of [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'textTransform',
    'wordSpacing',
  ]) {
    mirror.style[prop] = cs[prop]
  }
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre'
  mirror.textContent = input.value.slice(0, upTo)
  document.body.appendChild(mirror)
  const width = mirror.offsetWidth
  document.body.removeChild(mirror)
  return width
}

export default function useLinkableText({ initialText = '', initialLinks = [] } = {}) {
  const [text, setText] = useState(initialText)
  const [links, setLinks] = useState(initialLinks)
  const [sel, setSel] = useState(null)
  const [pos, setPos] = useState(null)
  const inputRef = useRef(null)
  const hideTimer = useRef(null)

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const hidePopover = () => {
    setSel(null)
    setPos(null)
  }

  const refreshSelection = () => {
    const input = inputRef.current
    if (!input) return
    clearHideTimer()
    const s = input.selectionStart
    const e = input.selectionEnd
    if (s === null || e === null || s === e) {
      hidePopover()
      return
    }
    setSel({ start: s, end: e })
    const rect = input.getBoundingClientRect()
    const cs = getComputedStyle(input)
    const pad =
      parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) + (input.scrollLeft || 0)
    const rawX = rect.left + pad + measureTextWidth(input, s)
    const x = Math.min(Math.max(rawX, 8), Math.max(rect.right - 280, 8))
    setPos({ x, y: rect.bottom + 8 })
  }

  const scheduleHide = () => {
    clearHideTimer()
    hideTimer.current = setTimeout(hidePopover, 150)
  }

  const keepPopover = () => clearHideTimer()

  const applyUrl = (rawUrl) => {
    if (!sel) return
    const url = normalizeUrl(rawUrl)
    setLinks((prev) => applyLinkToSelection(prev, sel.start, sel.end, url))
    const caret = sel.end
    hidePopover()
    const input = inputRef.current
    if (input) {
      requestAnimationFrame(() => {
        input.setSelectionRange(caret, caret)
        input.focus()
      })
    }
  }

  const cancelPopover = () => {
    hidePopover()
    inputRef.current?.focus()
  }

  const inputProps = {
    ref: inputRef,
    value: text,
    onFocus: refreshSelection,
    onSelect: refreshSelection,
    onMouseUp: refreshSelection,
    onKeyUp: refreshSelection,
    onBlur: scheduleHide,
    onChange: (e) => {
      const value = e.target.value
      setLinks((prev) => adjustLinksForEdit(text, value, prev))
      setText(value)
    },
  }

  const popover =
    sel && pos
      ? {
          ...sel,
          ...pos,
          selectionText: text.slice(sel.start, sel.end),
          initialUrl:
            links.find((l) => l.start === sel.start && l.end === sel.end)?.url ?? '',
        }
      : null

  const beginEdit = (newText, newLinks) => {
    setText(newText)
    setLinks(newLinks)
    hidePopover()
  }

  const clearAll = () => {
    setText('')
    setLinks([])
    hidePopover()
  }

  const removeLink = (link) => setLinks((prev) => prev.filter((l) => l !== link))

  return {
    text,
    links,
    inputProps,
    popover,
    applyUrl,
    cancelPopover,
    keepPopover,
    beginEdit,
    clearAll,
    removeLink,
    refreshSelection,
  }
}
