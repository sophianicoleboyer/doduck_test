# DoDuck Test (AlgoBo-like MVP)

Prototype web app for a teachable-agent experience:

- Left panel: chat where the **user is the teacher**
- Right panel: evolving **Python code draft**
- In-browser Python execution using **Pyodide** (single-file script mode)

This project is a Next.js App Router app (`app/` at repo root) using TypeScript and Tailwind.

## Features

- **Teachable novice agent loop**
  - `/api/chat` calls OpenAI server-side
  - model returns strict JSON with:
    - `assistantMessage`
    - `codeDraft`
    - `knowledgeState`
- **Two-panel interface**
  - teacher chat + editable task prompt
  - Python draft editor + Run button + stdout/stderr
- **Client-side Python sandbox**
  - `src/lib/pyRunner.ts` loads Pyodide in the browser
  - executes the entire editor content as one script

## Project Structure

- `app/page.tsx`: main two-panel UI
- `app/api/chat/route.ts`: server route for novice-agent responses
- `src/lib/prompts/novice.ts`: system prompt + JSON contract
- `src/lib/pyRunner.ts`: browser Python execution runtime
- `src/lib/types.ts`: shared app types

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables (required)

Create a local env file at project root:

```bash
cat > .env.local << 'EOF'
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
EOF
```

Optional Pyodide overrides:

```env
NEXT_PUBLIC_PYODIDE_VERSION=0.29.3
# or
NEXT_PUBLIC_PYODIDE_INDEX_URL=https://cdn.jsdelivr.net/pyodide/v0.29.3/full/
```

### 3) Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How To Use

1. Click **Start bubble sort lesson** to load a starter teacher prompt.
2. Edit or keep the prompt, then click **Send**.
3. Continue teaching through chat; the novice agent updates `codeDraft`.
4. Click **Run** to execute current Python draft in-browser.
5. Check `stdout` and `stderr` panels for program output/errors.

## Troubleshooting

- **`Chat request failed` + `insufficient_quota`**
  - Your OpenAI project has no available API quota.
  - Add billing/credits or use another API key/project.
- **`Failed to load Pyodide runtime`**
  - Check internet access (Pyodide assets are loaded from CDN by default).
  - Refresh page and rerun.
- **Browser error code `-102` on localhost**
  - Dev server is not running. Restart with `npm run dev`.

## Notes

- `.env.local` is local-only and should not be committed.
- OpenAI keys stay server-side in `app/api/chat/route.ts` and are never sent to the client.
