# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (usually http://localhost:5173 or 5174)
npm run build        # Production build
npm run check        # TypeScript + Svelte type checking
npm run db:push      # Push schema changes to SQLite (drizzle-kit push)
npm run db:studio    # Open Drizzle Studio (DB browser UI)
```

Run a single type check without watch mode: `npm run check` (no test runner — verify manually in browser).

## Architecture

**Stack:** SvelteKit 2 (Svelte 5 runes) + Tailwind CSS v4 + Drizzle ORM + better-sqlite3

**Database:** SQLite file at `./data/ollamaui.db`. Schema in `src/lib/server/db/schema.ts`, DB client in `src/lib/server/db/index.ts` (tables created via inline `CREATE TABLE IF NOT EXISTS`). Use `npm run db:push` after schema changes.

**Ollama integration:** All Ollama calls go to `http://localhost:11434`. The chat endpoint (`src/routes/api/chat/+server.ts`) proxies streaming responses from Ollama's `/api/chat` as SSE (`text/event-stream`) to the browser. Each `data:` event contains `{ content: string }` chunks, and a final `{ done: true, id: string }` event.

**Route structure:**
- `src/routes/+layout.server.ts` — loads all conversations for the sidebar on every page
- `src/routes/+layout.svelte` — renders `<Sidebar>` + page slot
- `src/routes/+page.svelte` — welcome screen with "Start new chat" button
- `src/routes/chat/[id]/` — the main chat page (server loads conversation + messages + available models)
- `src/routes/api/conversations/` — CRUD for conversations
- `src/routes/api/conversations/[id]/` — GET (with messages), PATCH (title), DELETE
- `src/routes/api/chat/` — POST: saves user message, streams Ollama response, saves assistant message
- `src/routes/api/models/` — proxies Ollama's `/api/tags`

**Sidebar reactivity:** `invalidateAll()` is called after creating/deleting conversations to re-run `+layout.server.ts` and refresh the sidebar list.

**Streaming pattern in the chat page:** The client reads SSE chunks, appends to `streamingContent` (shown live), then on `done` pushes a final message object into the `messages` array and clears `streamingContent`.

**Auto-titling:** The first user message in a conversation automatically sets the conversation title (truncated to 60 chars) — handled server-side in the chat API route.

**Tailwind v4:** Uses `@import 'tailwindcss'` (not `@tailwind base/components/utilities`). Custom prose styles for assistant message rendering are in `src/app.css` under `.prose-chat`.

**Markdown rendering:** `renderContent()` in the chat page is a lightweight hand-rolled renderer (no external lib). Handles code blocks, inline code, bold, italic, headers, lists.
