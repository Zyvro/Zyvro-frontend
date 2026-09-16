"use client"

import { useCallback, useState, type ReactNode } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

// A small Markdown renderer for model output.
//
// It builds React elements and never touches dangerouslySetInnerHTML, so text
// that came out of a model cannot introduce markup: React escapes every string
// it renders as a child. That property is the reason this exists rather than a
// library that can be configured, correctly or otherwise, to allow raw HTML.
//
// It covers what an assistant actually emits: fenced code, inline code,
// emphasis, headings, lists, quotes, tables, rules and links. It is not a
// CommonMark implementation and does not try to be.

type Props = {
  text: string
  className?: string
  // Compact trims the vertical rhythm for a narrow side panel, where the
  // spacing of a document would waste most of the column.
  compact?: boolean
}

export function Markdown({ text, className, compact = false }: Props) {
  return (
    <div className={cn("zy-selectable break-words", className)}>
      {renderBlocks(text, compact)}
    </div>
  )
}

// ---------- blocks ----------

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([\w+-]*)\s*$/
const HEADING = /^(#{1,6})\s+(.*)$/
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/
const QUOTE = /^\s*>\s?(.*)$/
const BULLET = /^(\s*)[-*+]\s+(.*)$/
const ORDERED = /^(\s*)(\d+)[.)]\s+(.*)$/
const TABLE_DIVIDER = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/

function renderBlocks(source: string, compact: boolean): ReactNode[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n")
  const out: ReactNode[] = []
  let i = 0
  let key = 0

  const gap = compact ? "mt-2" : "mt-3"
  const first = () => out.length === 0

  while (i < lines.length) {
    const line = lines[i]
    // Every branch below is meant to consume at least one line. This records
    // where the pass started so the end of the loop can prove it did: a branch
    // that fell through without advancing would spin here, appending forever,
    // on text a model is free to invent.
    const entered = i

    if (line.trim() === "") {
      i++
      continue
    }

    const fence = FENCE.exec(line)
    if (fence) {
      const marker = fence[2][0]
      const language = fence[3]
      const body: string[] = []
      i++
      // An unterminated fence is the normal state while a reply is streaming,
      // so running to the end of the text is the right behaviour, not a parse
      // error. Anything else would make code flash in and out as it arrives.
      while (i < lines.length) {
        const close = FENCE.exec(lines[i])
        if (close && close[2][0] === marker) {
          i++
          break
        }
        body.push(lines[i])
        i++
      }
      out.push(
        <CodeBlock
          key={key++}
          language={language}
          code={body.join("\n")}
          className={first() ? undefined : gap}
        />
      )
      continue
    }

    if (RULE.test(line)) {
      out.push(<hr key={key++} className={cn("border-white/[0.1]", first() ? undefined : gap)} />)
      i++
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const level = heading[1].length
      const size =
        level <= 1 ? "text-[15px]" : level === 2 ? "text-[14px]" : "text-[13px]"
      out.push(
        <p
          key={key++}
          className={cn("font-semibold text-foreground", size, first() ? undefined : gap)}
        >
          {renderInline(heading[2])}
        </p>
      )
      i++
      continue
    }

    if (QUOTE.test(line)) {
      const body: string[] = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        body.push(QUOTE.exec(lines[i])![1])
        i++
      }
      out.push(
        <blockquote
          key={key++}
          className={cn(
            "border-l-2 border-white/[0.15] pl-3 text-muted-foreground",
            first() ? undefined : gap
          )}
        >
          {renderBlocks(body.join("\n"), compact)}
        </blockquote>
      )
      continue
    }

    // A table is only a table when the row after the header is a divider.
    // Without that check, any prose containing a pipe becomes one.
    if (line.includes("|") && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const rows: string[] = []
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(lines[i])
        i++
      }
      out.push(<Table key={key++} rows={rows} className={first() ? undefined : gap} />)
      continue
    }

    if (BULLET.test(line) || ORDERED.test(line)) {
      const items: string[] = []
      while (i < lines.length && (BULLET.test(lines[i]) || ORDERED.test(lines[i]) || continuation(lines, i))) {
        items.push(lines[i])
        i++
      }
      out.push(
        <List key={key++} lines={items} compact={compact} className={first() ? undefined : gap} />
      )
      continue
    }

    const paragraph: string[] = []
    while (i < lines.length && lines[i].trim() !== "" && !startsBlock(lines, i)) {
      paragraph.push(lines[i])
      i++
    }
    if (paragraph.length > 0) {
      out.push(
        <p key={key++} className={cn("leading-relaxed", first() ? undefined : gap)}>
          {renderInline(paragraph.join("\n"))}
        </p>
      )
    }

    if (i === entered) i++
  }

  return out
}

// continuation recognizes an indented line that belongs to the list item above
// rather than starting something new.
function continuation(lines: string[], i: number): boolean {
  const line = lines[i]
  if (line.trim() === "") return false
  return /^\s{2,}\S/.test(line)
}

function startsBlock(lines: string[], i: number): boolean {
  const line = lines[i]
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    BULLET.test(line) ||
    ORDERED.test(line) ||
    (line.includes("|") && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1]))
  )
}

// ---------- lists ----------

type Item = { indent: number; ordered: boolean; marker: string; body: string[] }

function List({ lines, compact, className }: { lines: string[]; compact: boolean; className?: string }) {
  const items: Item[] = []
  for (const line of lines) {
    const bullet = BULLET.exec(line)
    const ordered = ORDERED.exec(line)
    if (bullet) {
      items.push({ indent: bullet[1].length, ordered: false, marker: "•", body: [bullet[2]] })
    } else if (ordered) {
      items.push({ indent: ordered[1].length, ordered: true, marker: `${ordered[2]}.`, body: [ordered[3]] })
    } else if (items.length > 0) {
      // A wrapped or indented line continues the item it follows.
      items[items.length - 1].body.push(line.trim())
    }
  }
  return <>{renderItems(items, 0, compact, className)}</>
}

function renderItems(items: Item[], from: number, compact: boolean, className?: string): ReactNode {
  if (items.length === 0) return null
  const baseIndent = items[from].indent
  const nodes: ReactNode[] = []
  let i = from

  while (i < items.length && items[i].indent >= baseIndent) {
    if (items[i].indent > baseIndent) {
      // Deeper items belong to the entry just rendered, so they are attached
      // there rather than opening a sibling list.
      const start = i
      while (i < items.length && items[i].indent > baseIndent) i++
      const nested = renderItems(items.slice(start, i), 0, compact)
      const last = nodes.pop()
      nodes.push(
        <li key={`n${start}`} className="list-none">
          {last}
          <div className="ml-4">{nested}</div>
        </li>
      )
      continue
    }
    const item = items[i]
    nodes.push(
      <li key={i} className="flex gap-2">
        <span className="select-none text-muted-foreground" aria-hidden>
          {item.marker}
        </span>
        <span className="min-w-0 flex-1 leading-relaxed">{renderInline(item.body.join(" "))}</span>
      </li>
    )
    i++
  }

  return (
    <ul className={cn("space-y-1", className)}>
      {nodes}
    </ul>
  )
}

// ---------- tables ----------

function splitRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
}

function Table({ rows, className }: { rows: string[]; className?: string }) {
  if (rows.length === 0) return null
  const header = splitRow(rows[0])
  const body = rows.slice(2).map(splitRow)

  return (
    // A table is the one thing here allowed to be wider than the column, so it
    // scrolls on its own rather than forcing the whole panel sideways.
    <div className={cn("zy-scroll overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {header.map((cell, index) => (
              <th
                key={index}
                className="border-b border-white/[0.12] px-2 py-1 text-left font-medium text-muted-foreground"
              >
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              {cells.map((cell, index) => (
                <td key={index} className="border-b border-white/[0.06] px-2 py-1 align-top">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- code ----------

function CodeBlock({
  code,
  language,
  className,
}: {
  code: string
  language?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }, [code])

  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-white/[0.08] bg-black/40", className)}>
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-2.5 py-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {language || "code"}
        </span>
        <div className="flex-1" />
        <button
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:bg-white/[0.08] hover:text-foreground focus:opacity-100 group-hover:opacity-100"
          onClick={copy}
          title="Copy"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="zy-scroll overflow-x-auto px-2.5 py-2">
        <code className="font-mono text-[12px] leading-relaxed text-foreground/90">{code}</code>
      </pre>
    </div>
  )
}

// ---------- inline ----------

// One pass over the line, longest and most binding constructs first: a code
// span suppresses everything inside it, so it has to win before emphasis is
// even considered.
//
// This is the pattern source, not a regex object, and that is deliberate.
// renderInline recurses into itself to format the contents of bold and italic
// spans. A shared /g/ regex carries lastIndex across those calls: the inner
// call would rewind the cursor into its own shorter string, the outer loop
// would resume from that earlier offset, re-emit what it had already emitted,
// and never terminate. It ran the renderer out of memory. A matcher per call
// costs one allocation and cannot do that.
const INLINE_SOURCE = [
  "(`+)([\\s\\S]*?)\\1", // 1,2  code span
  "!?\\[([^\\]]*)\\]\\(([^()\\s]+)(?:\\s+\"[^\"]*\")?\\)", // 3,4  link
  "(\\*\\*|__)(?=\\S)([\\s\\S]*?\\S)\\5", // 5,6  strong
  "(~~)(?=\\S)([\\s\\S]*?\\S)\\7", // 7,8  strikethrough
  "(\\*|_)(?=\\S)([\\s\\S]*?\\S)\\9", // 9,10 emphasis
  "(https?://[^\\s<>()\\[\\]]+)", // 11   bare URL
].join("|")

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const matcher = new RegExp(INLINE_SOURCE, "g")
  let last = 0
  let key = 0

  for (let match = matcher.exec(text); match !== null; match = matcher.exec(text)) {
    // No alternative can match the empty string today, but a future one that
    // did would stall lastIndex and spin here forever. One line to make that
    // impossible is cheaper than finding it again.
    if (match[0] === "") {
      matcher.lastIndex++
      continue
    }
    if (match.index > last) out.push(text.slice(last, match.index))
    last = match.index + match[0].length

    if (match[1]) {
      out.push(
        <code key={key++} className="rounded bg-white/[0.08] px-1 py-0.5 font-mono text-[0.92em]">
          {match[2].trim()}
        </code>
      )
    } else if (match[4]) {
      out.push(
        <Link key={key++} href={match[4]}>
          {match[3] || match[4]}
        </Link>
      )
    } else if (match[5]) {
      out.push(
        <strong key={key++} className="font-semibold text-foreground">
          {renderInline(match[6])}
        </strong>
      )
    } else if (match[7]) {
      out.push(
        <span key={key++} className="line-through opacity-70">
          {renderInline(match[8])}
        </span>
      )
    } else if (match[9]) {
      out.push(
        <em key={key++} className="italic">
          {renderInline(match[10])}
        </em>
      )
    } else if (match[11]) {
      out.push(
        <Link key={key++} href={match[11]}>
          {match[11]}
        </Link>
      )
    }
  }

  if (last < text.length) out.push(text.slice(last))
  return out
}

// Link never navigates the page. In the desktop app that would replace the
// whole window with whatever the model linked to; in the browser it opens a
// tab. Schemes other than http and https are rendered as plain text, so a
// javascript: URL in model output is inert.
function Link({ href, children }: { href: string; children: ReactNode }) {
  if (!/^https?:\/\//i.test(href)) return <>{children}</>
  return (
    <a
      href={href}
      className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      onClick={(event) => {
        event.preventDefault()
        window.open(href, "_blank", "noopener,noreferrer")
      }}
    >
      {children}
    </a>
  )
}
