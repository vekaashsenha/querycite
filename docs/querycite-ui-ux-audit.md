# QueryCite UI/UX Audit

## Scope

This audit covers four screens only:

- Homepage
- Pricing page
- AI Visibility Report page
- AI Advisor experience

No business logic, payment logic, authentication, Razorpay, Supabase, coupon handling, webhook, billing, invoice, database schema, deployment, or AI Advisor backend changes are included in this audit.

## Product Positioning

Primary positioning:

> Your customers are asking AI. Is your brand showing up?

QueryCite helps founders, entrepreneurs, solo marketers, freelancers, and small teams scan their website to find why AI search may not understand, cite, or recommend their brand, then gives ready-to-use fixes.

## Current UX Problems

### Homepage

- The homepage has the right offer, but the page still asks users to process many sections before the core product workflow feels fully clear.
- The hero is strong, but the audit input and product promise could feel more connected visually. The user should immediately understand: enter URL, get score, get fixes.
- Several sections repeat similar ideas: scan, gaps, fixes, reports, Advisor. This creates confidence, but it also adds cognitive load.
- Some supporting sections use card grids where a guided story would work better for non-technical users.
- The explainer video section is useful but should become a stronger trust and education asset, not just a media card.
- The credibility block is important but could be more human and better positioned as founder trust rather than another content block.

### Pricing Page

- Pricing is cleaner than before, but it still feels more feature-led than decision-led.
- The difference between Free, Starter, and Pro is mostly shown through limits. For founders and small teams, the buying choice should be framed around outcomes.
- The IIMA beta offer is visually separate, which is good, but it should be treated as a special private offer without competing too loudly with the main plans.
- The plan comparison table is useful but can feel dense on mobile.
- The payment confidence notes are helpful, but they could be integrated into a stronger trust strip around secure checkout, digital delivery, receipts, and access activation.

### AI Visibility Report Page

- The report contains strong product value, but the first view is still information-heavy.
- The dark report hero creates contrast, but it can feel more technical than founder-friendly.
- The score area has many metrics. It needs a clearer "what this means" summary and a stronger recommended next action.
- Top findings and top fixes are useful, but they appear as similar cards, so the difference between diagnosis and action could be clearer.
- Locked/full-report sections are visible, but the upgrade story could be more persuasive if it showed what becomes possible instead of only listing locked modules.
- Report actions are scattered across top fixes and full report sections. Users need one persistent "What can I do now?" action area.

### AI Advisor

- The Advisor is a core USP, but visually it still looks like a utility panel inside the report rather than a hero product feature.
- Quick actions are helpful but numerous. They should be grouped by intent: Fix first, Developer, Content, Competitor, Exports.
- The chat input is functional, but the surrounding experience should explain what the Advisor can and cannot do in simpler language.
- Usage meters are useful for paid users, but they can distract from the conversation. They should be secondary unless credits are low.
- The locked free Advisor preview communicates gating, but it could show a stronger sample of the value without implying access.

## Messaging Problems

- Some copy still leans toward internal product terminology before user outcomes.
- AEO, GEO, schema, crawler readiness, and llms.txt are valuable, but the site should translate them into plain language first.
- "Full report" should be framed as a fix plan, not only more report sections.
- The homepage should avoid sounding like a checker tool. QueryCite needs to feel like an audit plus implementation assistant.
- Advisor copy should emphasize report-grounded guidance and ready-to-use fixes.

Recommended messaging shift:

- From: "AI Visibility Audit + AEO/GEO readiness"
- To: "Find why AI may not understand your brand. Get fixes you can use."

## Visual Hierarchy Issues

- The homepage has many cards with similar weights. More variation is needed: hero, product walkthrough, proof, use cases, CTA.
- The report page needs a stronger hierarchy between:
  - Overall score
  - Meaning of score
  - Top 3 issues
  - First recommended action
  - Full-report unlock value
- Pricing should emphasize the recommended plan without making the page feel promotional or loud.
- Advisor should feel like a focused workspace with the chat as the center, not one more card in a grid.

## Mobile Issues

- Pricing comparison tables are likely hard to scan on small screens.
- Homepage card clusters may stack into a long scroll with repeated patterns.
- Report score cards can become a long sequence before users reach the findings.
- Advisor quick actions may occupy too much vertical space before the actual chat.
- CTAs should remain easy to find after scanning content on mobile.

## Conversion Issues

- The homepage could show the "free audit" path more clearly as the main action throughout the page.
- The transition from free score to paid/full report needs a clearer value bridge:
  - What did the free report reveal?
  - What will the full report unlock?
  - Why should the user act now?
- Pricing should connect plans to buyer types:
  - Free: check if there is a problem
  - Starter: fix one website yourself
  - Pro: manage ongoing visibility work for multiple sites
- The report page needs a more obvious next step after the top findings.
- The Advisor should show a strong sample response/value preview in locked mode.

## Trust Gaps

- The site correctly avoids guaranteed ranking/citation claims, but it should add more trust-building cues:
  - What QueryCite checks
  - What it does not claim
  - Why the report is practical
  - What data is used
  - Founder/operator credibility
  - Payment and delivery clarity
- The report page should remind users that recommendations are based on the scanned website and current report data.
- Pricing should include trust cues near checkout CTAs, especially for beta buyers.

## Recommended Improvements

### Homepage

1. Redesign the hero as a clear product-start surface:
   - Left: headline, subheadline, primary CTA
   - Right: compact audit input plus mini report preview
   - Below: trust strip with "No guaranteed claims", "Website-based report", "Ready-to-use fixes"

2. Replace repeated card grids with a guided visual flow:
   - URL
   - Scan signals
   - Find gaps
   - Ask Advisor
   - Copy fixes
   - Retest

3. Make "How QueryCite helps" more outcome-led:
   - Understand what AI can read
   - Fix unclear brand signals
   - Generate implementation-ready tasks
   - Share/download reports

4. Add a stronger founder-friendly credibility section:
   - Human explanation
   - Built for teams without full SEO/development resources
   - Practical marketing background
   - Clear limitation note

5. Make the explainer video section feel like a product demo:
   - Better thumbnail frame
   - Short bullets beside it
   - CTA below video

### Pricing Page

1. Redesign pricing around buyer decision:
   - Free: Check visibility gaps
   - Starter: Fix one site yourself
   - Pro: Run ongoing AI visibility work

2. Make Starter visually recommended but restrained:
   - Subtle blue outline
   - "Best starting point" badge
   - Strong primary CTA

3. Move dense limits into expandable "Plan limits" or a compact comparison section.

4. Keep IIMA beta offer separate and discreet:
   - Private beta panel
   - Coupon input only
   - No code exposure
   - Strong server-validated access language

5. Add checkout confidence strip:
   - Secure Razorpay checkout
   - Digital delivery
   - Receipt available
   - Access activates after payment confirmation

### Report Page

1. Redesign top section as an executive summary:
   - Overall score
   - Plain-English interpretation
   - Top issue
   - First action button
   - Website URL and scan date

2. Group score cards into "Readiness snapshot":
   - AI visibility
   - AEO/GEO
   - Technical/crawler
   - Schema/content

3. Separate diagnosis from action:
   - "What is holding you back"
   - "What to fix first"

4. Improve locked/full-report preview:
   - Show modules as value outcomes
   - Include sample blurred rows
   - Use a clear "Unlock complete fix plan" CTA

5. Make report actions more consistent:
   - Download free PDF
   - Download CSV
   - Share/email preview labels where not fully available

### AI Advisor

1. Redesign Advisor as a dedicated conversational workspace:
   - Header with report context
   - Suggested questions grouped by outcome
   - Chat thread
   - Input
   - Guardrail note

2. Move usage/credits into a compact top-right or collapsible row.

3. Add sample locked-state preview:
   - User: "What should I fix first?"
   - Advisor sample: "Your report shows missing schema and weak crawler guidance..."

4. Make quick actions more focused:
   - Fix first
   - Developer notes
   - Content plan
   - Schema/llms.txt
   - Competitor gaps

5. Improve trust:
   - "Uses this report context"
   - "Does not guarantee citations, rankings, traffic, or revenue"

## Recommended Redesign Priority

1. Report page executive summary and next-action layout
2. AI Advisor workspace redesign
3. Homepage hero and product flow simplification
4. Pricing decision clarity and mobile-friendly comparison

This order prioritizes the product experience users evaluate after running an audit, while still improving first impression and conversion.

## Design Approval Criteria

Before implementation, Figma frames should show:

- Desktop and mobile variants for all four target screens
- Clear free vs paid/full-report states
- Clear locked vs unlocked Advisor state
- Light-first public marketing surfaces
- No payment/auth/backend logic changes implied
- No false guarantees or unsupported claims
- Cleaner spacing and stronger hierarchy than current UI

