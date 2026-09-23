import useLinkableText from '../hooks/useLinkableText'
import LinkChips from './LinkChips'
import LinkPopover from './LinkPopover'
import { adjustLinksForTrim } from '../lib/links'

export default function AddTaskForm({ onPush }) {
  const field = useLinkableText()

  const submit = (e) => {
    e.preventDefault()
    const { text: trimmed, links } = adjustLinksForTrim(field.text, field.links)
    field.clearAll()
    if (trimmed.length === 0) return
    onPush(trimmed, links)
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <div className="add-row">
        <input
          {...field.inputProps}
          className="add-input"
          type="text"
          placeholder="What needs your focus?"
          maxLength={80}
          autoFocus
        />
        <button className="add-btn" type="submit" disabled={field.text.trim().length === 0}>
          Push
        </button>
      </div>
      <LinkChips text={field.text} links={field.links} onRemove={field.removeLink} />
      {field.popover && (
        <LinkPopover
          key={`${field.popover.start}:${field.popover.end}`}
          popover={field.popover}
          onApply={field.applyUrl}
          onCancel={field.cancelPopover}
          onKeep={field.keepPopover}
        />
      )}
    </form>
  )
}
