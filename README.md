# OllamaUI

```
  ___  _ _                         _   _ ___
 / _ \| | | __ _ _ __ ___   __ _  | | | |_ _|
| | | | | |/ _` | '_ ` _ \ / _` | | | | || |
| |_| | | | (_| | | | | | | (_| | | |_| || |
 \___/|_|_|\__,_|_| |_| |_|\__,_|  \___/|___|
```

A local chat interface for [Ollama](https://ollama.com), built with SvelteKit. Designed to feel like Gemini or Claude — left sidebar with full chat history, streaming responses, and everything stored locally in SQLite.

## Features

- **Streaming chat** — responses stream token by token directly from your local Ollama instance
- **Persistent history** — all conversations and messages saved in a local SQLite database
- **Sidebar navigation** — browse, search, and delete past conversations grouped by date
- **Model selector** — switch between any model available in your Ollama instance per conversation
- **Auto-titling** — conversations are automatically titled from your first message
- **Markdown rendering** — code blocks, inline code, bold, italic, headers, and lists
- **Analytics dashboard** — usage stats, token counts, model performance, and access logs

## Requirements

- [Node.js](https://nodejs.org) v18+
- [Ollama](https://ollama.com) running locally on `http://localhost:11434`
- At least one model pulled in Ollama (e.g. `ollama pull qwen2.5:7b`)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Development

```bash
npm run dev          # Start dev server with HMR
npm run build        # Production build
npm run preview      # Preview the production build
npm run check        # TypeScript + Svelte type checking
npm run db:push      # Apply schema changes to the local SQLite database
npm run db:studio    # Open Drizzle Studio to browse the database
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [SvelteKit 2](https://kit.svelte.dev) (Svelte 5 runes) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| AI Backend | [Ollama](https://ollama.com) (local) |

## Project Structure

```
src/
├── hooks.server.ts                # Request logger (all routes → access_logs)
├── lib/
│   ├── components/
│   │   └── Sidebar.svelte        # Conversation list, search, new chat
│   └── server/
│       └── db/
│           ├── schema.ts          # Drizzle table definitions
│           └── index.ts           # DB client + auto-migration on startup
└── routes/
    ├── +layout.server.ts          # Loads conversations for sidebar
    ├── +layout.svelte             # App shell (sidebar + main)
    ├── +page.svelte               # Welcome / landing page
    ├── analytics/
    │   ├── +page.server.ts        # Aggregates usage + access log queries
    │   └── +page.svelte           # Dashboard UI
    ├── chat/[id]/
    │   ├── +page.server.ts        # Loads conversation, messages, models
    │   └── +page.svelte           # Chat UI with streaming
    └── api/
        ├── chat/+server.ts        # Streams Ollama responses as SSE
        ├── conversations/
        │   ├── +server.ts         # GET list, POST create
        │   └── [id]/+server.ts    # GET with messages, PATCH title, DELETE
        └── models/+server.ts      # Proxies Ollama /api/tags
```

## Database

SQLite database is stored at `./data/ollamaui.db` (excluded from version control). Schema auto-migrates on startup — new columns are added via `ALTER TABLE` if not present.

| Table | Key columns |
|---|---|
| `conversations` | id, title, model, created_at, updated_at |
| `messages` | id, conversation_id, role, content, **tokens_prompt**, **tokens_completion**, **duration_ms**, created_at |
| `access_logs` | id, method, path, status, duration_ms, user_agent, created_at |

After modifying `src/lib/server/db/schema.ts`, run `npm run db:push` to apply changes.

## Configuration

No configuration file is needed. The app connects to Ollama at `http://localhost:11434` by default. To change this, update the fetch URLs in:
- `src/routes/api/chat/+server.ts`
- `src/routes/api/models/+server.ts`
- `src/routes/chat/[id]/+page.server.ts`

## Roadmap

- **Change Ollama model** — swap the active model mid-conversation or set a default per chat

## License

MIT
