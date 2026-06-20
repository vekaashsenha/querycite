# AI Visibility Auditor

A Next.js MVP for scanning a website URL and generating an AI Search Visibility report for AEO/GEO readiness using Gemini.

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local` from `.env.example` and add your Gemini API key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Optional:

```bash
GEMINI_MODEL=gemini-3.5-flash
```

3. Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Checks

```bash
pnpm lint
pnpm build
```