"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { API_URL } from "@/lib/api"

export const MCP_URL = `${API_URL}/mcp`

type McpClient = {
  id: string
  label: string
  where: string
  note?: string
  snippet: (url: string, key: string) => string
}

export const MCP_CLIENTS: McpClient[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    where: "terminal — one line",
    snippet: (url, key) => `claude mcp add --transport http zyvro ${url} \\\n  --header "Authorization: Bearer ${key}"`,
  },
  {
    id: "codex",
    label: "Codex",
    where: "~/.codex/config.toml",
    note: "Streamable HTTP servers (experimental rmcp support).",
    snippet: (url, key) => `[mcp_servers.zyvro]\nurl = "${url}"\nhttp_headers = { "Authorization" = "Bearer ${key}" }`,
  },
  {
    id: "cursor",
    label: "Cursor",
    where: ".cursor/mcp.json (project) or ~/.cursor/mcp.json (global)",
    snippet: (url, key) =>
      JSON.stringify({ mcpServers: { zyvro: { url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2),
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    where: "~/.gemini/settings.json",
    snippet: (url, key) =>
      JSON.stringify({ mcpServers: { zyvro: { httpUrl: url, httpHeaders: { Authorization: `Bearer ${key}` } } } }, null, 2),
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    where: "claude_desktop_config.json (macOS: ~/Library/Application Support/Claude)",
    note: "Claude Desktop only speaks stdio — the mcp-remote bridge (npx, needs Node.js) proxies the HTTP endpoint.",
    snippet: (url, key) =>
      JSON.stringify(
        { mcpServers: { zyvro: { command: "npx", args: ["mcp-remote", url, "--header", `Authorization: Bearer ${key}`] } } },
        null,
        2
      ),
  },
  {
    id: "vscode",
    label: "VS Code",
    where: ".vscode/mcp.json (workspace)",
    snippet: (url, key) =>
      JSON.stringify({ servers: { zyvro: { type: "http", url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2),
  },
  {
    id: "windsurf",
    label: "Windsurf",
    where: "~/.codeium/windsurf/mcp_config.json",
    snippet: (url, key) =>
      JSON.stringify({ mcpServers: { zyvro: { serverUrl: url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2),
  },
  {
    id: "kimi",
    label: "Kimi",
    where: "terminal — one line",
    snippet: (url, key) => `kimi mcp add --transport http zyvro ${url} \\\n  --header "Authorization: Bearer ${key}"`,
  },
]

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // clipboard unavailable (non-secure context); user can still select the text
        }
      }}
    >
      {copied ? "Copied!" : label}
    </Button>
  )
}

export function McpConnect({ apiKey, compact = false }: { apiKey: string | null; compact?: boolean }) {
  const [tab, setTab] = useState(MCP_CLIENTS[0].id)
  const client = MCP_CLIENTS.find((c) => c.id === tab) ?? MCP_CLIENTS[0]
  const key = apiKey || "<your-key>"
  const snippet = client.snippet(MCP_URL, key)
  const rest = `curl -X POST ${API_URL}/api/executions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"workflow_id":"<workflow-id>","inputs":{}}'`

  return (
    <div className={`rounded-xl border border-white/[0.08] bg-card p-4 ${compact ? "space-y-3" : "space-y-4"}`}>
      {!compact && (
        <div>
          <div className="font-medium">Connect the MCP</div>
          <p className="text-xs text-muted-foreground mt-1">
            Streamable HTTP JSON-RPC at <code className="bg-muted rounded px-1">{MCP_URL}</code>. Pick your client and
            paste —{" "}
            {apiKey ? (
              <>the snippets already carry your new API key. Manage or rotate keys above.</>
            ) : (
              <>create a key above and the snippets will carry it.</>
            )}
          </p>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-px" role="tablist" aria-label="MCP clients">
        {MCP_CLIENTS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === tab}
            onClick={() => setTab(c.id)}
            className={`flex-none whitespace-nowrap border-b-2 px-3 py-2 font-mono text-xs transition-colors ${
              c.id === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between rounded-t-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
          <span className="text-[11px] text-muted-foreground">{client.where}</span>
          <CopyButton text={snippet} />
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-b-lg border border-t-0 border-white/[0.06] bg-black/30 px-3 py-2 font-mono text-xs leading-relaxed text-foreground/85">
          {snippet}
        </pre>
        {client.note && <p className="mt-1 text-[11px] text-muted-foreground">{client.note}</p>}
      </div>

      {!compact && (
        <div>
          <div className="flex items-center justify-between rounded-t-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
            <span className="text-[11px] text-muted-foreground">REST API — same key, same engine</span>
            <CopyButton text={rest} />
          </div>
          <pre className="overflow-x-auto whitespace-pre rounded-b-lg border border-t-0 border-white/[0.06] bg-black/30 px-3 py-2 font-mono text-xs leading-relaxed text-foreground/85">
            {rest}
          </pre>
        </div>
      )}
    </div>
  )
}
