# Zyvro Frontend

The web app for [Zyvro](https://zyv.ro): a visual builder for AI workflows, where
a workflow is a graph of text, image and vision nodes that runs on the user's own
provider accounts.

Next.js 14 (App Router), React 18, React Flow, TanStack Query, Tailwind.

## Running it

```sh
npm install
npm run dev
```

The app talks to the Go backend, which it finds through `NEXT_PUBLIC_API_URL`
(default `http://localhost:4102`). Put it in `.env.local` if your backend is
somewhere else.

## Layout

```
src/
  app/           Pages: landing, auth, dashboard, builder, explore, providers, admin
  components/    Builder (the graph editor), Zynode, ShareDialog, ProviderKeys, admin tabs
  lib/           API client, node registry, TanStack Query hooks, host capabilities
```

The graph editor is `components/Builder.tsx`. It renders the canvas, the node
palette, the inspector and the run controls, and it is also what the desktop app
mounts inside an editor tab, through its `embedded` prop. That is why it carries
a few seams that look odd for a page: they exist so one editor serves both
products instead of two copies drifting apart.

## No `useEffect`

`useEffect` is banned in this codebase. `DOCTRINE-SANS-USEEFFECT.md` has the full
rule; the short version is that each of its usual jobs has a better-fitting tool:

| Need | Use |
|---|---|
| Server state | TanStack Query |
| A subscription (keyboard, socket, clock) | `useSyncExternalStore` |
| Imperative setup bound to a node | a callback ref with teardown |
| Derived state | compute it during render |
| Reaction to an action | an event handler |

One thing in particular is not a loophole: a hidden `<span ref={...}/>` used as a
mount trigger is `useEffect` rebuilt out of junk DOM. It has been proposed twice
and rejected twice.

## Provider keys

Workflows spend the user's own provider account, never the platform's. A run that
needs a key the user has not configured is refused before any model call, with a
dedicated error code the UI turns into a panel explaining what to add and where.

## Related

- [Zyvro-backend](https://github.com/Zyvro/Zyvro-backend) — the Go API and graph engine
- [Zyvro-desktop](https://github.com/Zyvro/Zyvro-desktop) — Zyvro Studio, the desktop app
