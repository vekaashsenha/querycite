# QueryCite Figma Redesign Plan

## Goal

Use Figma as the design workspace to explore and approve UI/UX improvements before changing application code.

This plan covers design work only. It does not include changes to business logic, payment, authentication, Razorpay, Supabase, coupons, webhook handling, billing, invoices, database schema, production deployment, or the AI Advisor backend.

## Screens In Scope

1. Homepage
2. Pricing page
3. AI Visibility Report page
4. AI Advisor experience

## Design Direction

- Clean SaaS
- Light/off-white background
- Premium but simple
- Founder-friendly
- Not too technical
- Strong blue primary CTA
- Clear hierarchy
- Better spacing
- Better mobile layout
- Clearer action cards
- More trust-building sections

Primary positioning:

> Your customers are asking AI. Is your brand showing up?

## Suggested Figma File Structure

Create one Figma file named:

`QueryCite UI/UX Redesign - Approval`

Suggested pages:

1. `00 Current Screens Reference`
2. `01 Foundations`
3. `02 Homepage`
4. `03 Pricing`
5. `04 Report`
6. `05 AI Advisor`
7. `06 Mobile`
8. `07 Prototype Flow`

## Suggested Frames

### Current Reference Frames

- Current homepage desktop
- Current pricing desktop
- Current report desktop
- Current Advisor desktop
- Current mobile homepage
- Current mobile report

Purpose: keep redesign decisions grounded in the current product.

### Homepage Frames

Desktop:

- Homepage A: Hero-first product walkthrough
- Homepage B: Founder-friendly credibility emphasis
- Homepage C: Video/demo-led flow

Mobile:

- Homepage mobile A
- Homepage mobile B

Recommended direction:

- Use Homepage A as the primary candidate.
- Use Homepage B for credibility-section exploration.
- Use Homepage C only if the video becomes a central conversion asset.

### Pricing Frames

Desktop:

- Pricing A: Three plan cards with compact comparison
- Pricing B: Starter-focused decision layout
- Pricing C: Private beta offer emphasis

Mobile:

- Pricing mobile stacked cards
- Pricing mobile comparison accordion
- IIMA beta offer mobile panel

Recommended direction:

- Keep public plans simple: Free, Starter, Pro.
- Keep IIMA beta offer as a separate private beta card below main plans.

### Report Frames

Desktop:

- Report A: Executive summary first
- Report B: Score dashboard plus findings
- Report C: Full-report unlock preview
- Report D: Full-access report state

Mobile:

- Report mobile free state
- Report mobile full state

Recommended direction:

- Use Report A as the main redesign direction.
- Prioritize clear "What this means" and "Fix this first" guidance.

### AI Advisor Frames

Desktop:

- Advisor A: Full chat workspace
- Advisor B: Advisor embedded in report
- Advisor C: Locked preview state
- Advisor D: Admin/diagnostic-free customer state

Mobile:

- Advisor mobile full access
- Advisor mobile locked preview

Recommended direction:

- Treat Advisor as a premium product workspace, not a small side card.
- Keep the chat input visible and comfortable on mobile.

## Page Section Plans

### Homepage Section Plan

1. Header
   - QueryCite logo
   - Navigation
   - Primary CTA: Scan your website free

2. Hero
   - Headline: "Your customers are asking AI. Is your brand showing up?"
   - Subheadline: "QueryCite scans your website to find why AI search may not understand, cite, or recommend your brand, then gives ready-to-use fixes."
   - URL audit input
   - Primary CTA: Scan your website free
   - Secondary CTA: See how it works
   - Mini report preview

3. Trust Strip
   - Website-based audit
   - Ready-to-use fixes
   - No guaranteed ranking/citation claims
   - Built for small teams

4. Product Flow
   - Enter URL
   - Scan AI visibility signals
   - See report
   - Ask Advisor
   - Copy fixes

5. What QueryCite Helps With
   - Brand clarity
   - AEO/GEO readiness
   - Schema and crawler guidance
   - llms.txt guidance
   - Reports and exports

6. Explainer Video
   - Video card
   - Three supporting bullets
   - CTA below

7. Founder Credibility
   - Founder/operator story
   - Built for marketers without full SEO/development teams
   - Practical, not hype-heavy

8. Pricing Teaser
   - Free, Starter, Pro
   - Link to pricing

9. FAQ
   - Buyer-focused questions

10. Final CTA
   - Scan your website free

### Pricing Page Section Plan

1. Page Hero
   - "Start free. Choose the depth of action your team needs."
   - Subcopy focused on free audit first, paid fixes when ready

2. Plan Cards
   - Free
   - Starter
   - Pro

3. Compact Comparison
   - Mobile-friendly card/accordion instead of large dense table

4. IIMA Beta Offer
   - Separate private beta panel
   - Coupon input field
   - No visible coupon codes

5. Checkout Confidence
   - Secure Razorpay checkout
   - Access after payment confirmation
   - Digital delivery
   - Receipts available

6. FAQ / Objection Handling
   - What happens after payment?
   - Is access instant?
   - Does QueryCite guarantee AI citations?

### Report Page Section Plan

1. Report Header
   - Website URL
   - Scan date
   - Free/full/admin/beta state label

2. Executive Summary
   - AI Visibility Score
   - Plain-English interpretation
   - Top gap
   - Recommended first action

3. Readiness Snapshot
   - AEO
   - GEO
   - AI crawler
   - Schema
   - Content clarity

4. Top 3 Findings
   - Issue
   - Why it matters
   - Recommended fix
   - Owner

5. Top 3 Fixes
   - Action-focused
   - Owner tags
   - PDF/CSV access where allowed

6. Full Report Preview
   - All findings
   - Competitor comparison
   - Advisor
   - Ready-to-paste fixes
   - Developer notes
   - Exports

7. Upgrade CTA
   - "Unlock complete fix plan"

### AI Advisor Section Plan

1. Advisor Header
   - "AI Visibility Advisor"
   - "Uses this report context"
   - Plan/credit status

2. Suggested Questions
   - Fix first
   - AEO/GEO plan
   - Developer notes
   - Schema and llms.txt
   - Competitor gaps

3. Chat Workspace
   - User message
   - Advisor response card
   - Markdown/code styling
   - Copy action

4. Input
   - Single focused input
   - Send button
   - Character limit helper

5. Guardrail Note
   - Report-specific guidance only
   - No guaranteed citations, rankings, traffic, or revenue

6. Locked State
   - Blurred sample chat
   - Clear unlock CTA
   - Value preview without exposing paid access

## Component List

### Global Components

- Header
- Footer
- Primary CTA button
- Secondary CTA button
- Status pill
- Trust badge
- Section header
- Surface card
- Feature card
- Info callout
- Locked overlay
- Mobile navigation

### Homepage Components

- URL audit form
- Mini report preview
- Product flow diagram
- Explainer video card
- Founder credibility block
- FAQ item
- Final CTA band

### Pricing Components

- Pricing plan card
- Recommended plan badge
- Plan limit row
- Mobile plan comparison accordion
- IIMA beta offer card
- Coupon input
- Checkout confidence strip

### Report Components

- Report executive summary
- Score card
- Score ring
- Readiness snapshot
- Finding card
- Fix card
- Report action panel
- Full report preview card
- Upgrade CTA panel

### AI Advisor Components

- Advisor shell
- Suggested question chip
- Chat message card
- Assistant response card
- Code/markdown block
- Copy button
- Credit meter
- Guardrail notice
- Locked Advisor preview

## Color and Token Direction

### Brand Tokens

- Page background: off-white / very light blue-gray
- Surface background: white
- Soft surface: light blue or light slate
- Primary: confident blue
- Primary hover: deeper blue
- Accent 1: cyan
- Accent 2: soft violet
- Accent 3: emerald
- Warning: amber
- Error: rose
- Text primary: slate-950
- Text secondary: slate-600 / slate-700
- Border: slate-200

### Recommended CSS Token Mapping

- `--qc-bg`
- `--qc-surface`
- `--qc-surface-soft`
- `--qc-text`
- `--qc-muted`
- `--qc-border`
- `--qc-primary`
- `--qc-primary-foreground`
- `--qc-success`
- `--qc-warning`
- `--qc-error`
- `--qc-code-bg`
- `--qc-code-text`

### Visual Style

- Light-first public marketing screens
- Soft shadows
- Rounded cards, but avoid oversized repeated boxes
- Subtle doodle/diagram accents
- Strong blue CTAs
- Calm, founder-friendly tone

## Typography Direction

Suggested hierarchy:

- Hero headline: 56-72 desktop, 40-48 mobile
- Page title: 44-56 desktop, 34-40 mobile
- Section title: 32-44 desktop, 28-34 mobile
- Card title: 18-24
- Body text: 15-17
- Small helper text: 12-14
- Button text: 14-15 semibold

Typography principles:

- Avoid random one-off sizes.
- Use fewer headline sizes.
- Keep card text compact.
- Prefer plain language over technical labels in primary headings.
- Put AEO/GEO/schema/llms.txt details in supporting copy or technical sections.

## Before/After Screen Plan

### Homepage

Before:

- Strong hero but many content blocks compete.
- Some card grids feel repetitive.

After:

- Clear product-start hero.
- Stronger visual flow from URL to fixes.
- Founder credibility and trust cues are easier to scan.

### Pricing

Before:

- Good plan structure, but limits dominate.

After:

- Buyer decision is clearer.
- Plan cards are compact.
- IIMA beta offer is private and visually separate.

### Report

Before:

- Useful data, but many sections compete for attention.

After:

- Executive summary tells the user what the result means.
- Next action is obvious.
- Free vs full value is clearer.

### AI Advisor

Before:

- Functional chat panel.

After:

- Premium report-specific assistant workspace.
- Suggested questions are grouped by user intent.
- Locked preview demonstrates value without misleading.

## Prototype Flow

Recommended Figma prototype:

1. Homepage hero
2. Enter URL interaction state
3. Scan progress state
4. Free report executive summary
5. Locked full report preview
6. Pricing Starter CTA
7. Full report unlocked
8. AI Advisor conversation
9. Copy-paste fix output

## Figma Approval Checklist

Designs should be approved only when:

- Homepage is light-first and founder-friendly.
- Pricing shows Free, Starter, Pro clearly.
- Report page makes the first next action obvious.
- AI Advisor feels like a core product feature.
- Mobile layouts are not long stacks of repeated cards.
- Locked states are clear and buyer-friendly.
- No private coupon codes or sensitive data are visible.
- No guaranteed ranking, citation, traffic, lead, or revenue claims are included.
- No backend/payment/auth/schema changes are implied.

## Exact Next Prompt to Create Figma Frames

Use this prompt after approving the planning docs:

> Create Figma redesign frames for QueryCite based on `docs/querycite-ui-ux-audit.md` and `docs/querycite-figma-redesign-plan.md`. Use the current QueryCite app UI as reference, but do not change app code. Create desktop and mobile frames for Homepage, Pricing, AI Visibility Report, and AI Advisor. Use a light-first premium SaaS style, strong blue CTA, founder-friendly messaging, clearer spacing, improved mobile layout, and clear locked/unlocked states. Do not include private coupon codes, payment IDs, personal emails, secrets, admin/test screens, or false guarantees. Stop after creating Figma frames for review.

