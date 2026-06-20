# AI Visibility Auditor

A Next.js MVP for QueryCite, an AI Visibility Audit and AEO/GEO fix generator SaaS. The app uses deterministic website checks for audit scoring and Gemini for the private-beta AI Visibility Advisor chat.

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local` from `.env.example` and add your Gemini API key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Optional model overrides:

```bash
GEMINI_MODEL=gemini-3.5-flash
GEMINI_ADVISOR_MODEL=gemini-3.5-flash
```

Do not commit `.env.local`.

3. Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Gemini Environment Variables

Required:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Local setup:

- Add `GEMINI_API_KEY` to `.env.local`.
- Restart the dev server after changing environment variables.

Vercel setup:

- Open the Vercel project.
- Go to Settings > Environment Variables.
- Add `GEMINI_API_KEY` for Production, Preview, and Development as needed.
- Redeploy after saving the variable.

## AI Visibility Advisor

The private beta Advisor is available at `/report?demo=full`. The frontend calls `/api/advisor/chat`, and the API route uses `GEMINI_API_KEY` only on the server. The Advisor is scoped to the current report data and should only answer questions about the AI Visibility report, AEO/GEO fixes, competitor gaps, content improvements, developer notes, exports, and next steps.

## Checks

```bash
pnpm lint
pnpm build
```
