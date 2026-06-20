# QueryCite Paid Access Foundation Plan

QueryCite is an AI Visibility Audit and AEO/GEO fix generator SaaS. This document defines the paid-access foundation for subscriptions, report access, saved reports, exports, share links, and dashboard behavior.

This is a planning and product architecture document only. Do not add Razorpay, real payment keys, authentication, or production backend behavior until the relevant implementation phase.

## 1. Final Access Model

### Free Audit

- No login required.
- User enters a website URL and can run a limited audit.
- Report shows limited scores.
- Report shows the top 3 findings.
- Report can offer limited branded PDF/CSV output.
- Paid report sections remain visible but locked.
- Locked areas should clearly explain the value of the full report without exposing paid content.

### Paid Full Report

- Login required.
- Active subscription required.
- All findings unlocked.
- Competitor comparison unlocked.
- AI Visibility Advisor unlocked.
- Ready-to-paste fixes unlocked.
- Developer notes unlocked.
- Full PDF/CSV exports unlocked.
- Full shareable report unlocked.
- Each paid report is saved in the user dashboard.

## 2. Subscription Guardrails

Paid access must never be based only on whether a user has paid once. Access should be recalculated from subscription and usage state every time a user opens paid areas, generates exports, creates share links, or views saved full reports.

### Required Access Fields

- User ID
- Email
- Plan name
- Subscription ID
- Customer ID
- Payment status
- Subscription status
- Current period start date
- Current period end date
- Renewal date
- Cancellation status
- Failed payment status
- Plan usage limits
- Domain limits
- Scan limits

### Access Rules

- Active subscription means paid access is allowed.
- Expired subscription means paid access is locked.
- Cancelled subscription means access continues until the current paid period ends.
- Failed payment means the account enters a grace or pending state, then locks after the grace period.
- Trial or launch offer should convert to the normal paid plan after the trial period.
- Plan limits must be enforced before running paid scans, saving reports, or generating full exports.
- Domain limits must be checked before adding or scanning a new website.
- Scan limits must reset based on the subscription billing period.
- Access checks should be server-side once backend/authentication exists.

### Suggested Subscription Status Values

- `trialing`
- `active`
- `pending`
- `past_due`
- `cancelled`
- `expired`
- `completed`

### Suggested Payment Status Values

- `none`
- `pending`
- `captured`
- `failed`
- `refunded`

## 3. Pricing Model

### Free Audit

- Price: $0
- No login required.
- Includes limited report access.

### Launch Trial

- Price: $10 first month.
- Converts to $29/month Starter plan after the first month.
- Includes 1 domain.
- Includes full report access during the paid launch-trial period.

### Starter

- Price: $29/month.
- Includes 1 domain.
- Includes 25 scans/month.

### Pro

- Price: $99/month.
- Includes 3 to 5 domains.
- Includes 100 scans/month.

### Agency

- Price: From $149/month.
- Includes up to 10 domains.
- Includes client-ready reports.
- Includes team sharing.
- White-label report option can be added later.

## 4. Dashboard Requirements

The paid user dashboard should show:

- Website URL
- Scan date
- AI Visibility Score
- AEO Score
- GEO Score
- Report status
- PDF download
- CSV download
- Share report link
- Plan used during scan
- Subscription status
- Renewal date

Users should be able to see all reports created during their active subscription history. If a subscription expires, the dashboard can still show report history, but full paid report content and exports should be locked unless policy decides otherwise.

## 5. Report Storage Model

Every paid scan should save:

- User ID
- Website URL
- Scan ID
- Report ID
- Scan date
- Full report data
- PDF file reference
- CSV file reference
- Share URL
- Plan at time of scan
- Created date
- Updated date

### Suggested Report Status Values

- `processing`
- `ready`
- `failed`
- `locked`
- `archived`

## 6. Razorpay Subscription Plan

Use Razorpay Subscriptions later. Razorpay webhooks should be the source of truth for subscription and payment state. The app should not trust frontend payment callbacks as final proof of access.

### Webhook Handling Plan

| Webhook event | Database field changes | Email to send | Paid access behavior |
| --- | --- | --- | --- |
| Subscription activated | Set `subscription_status = active`, set `current_period_start`, `current_period_end`, `renewal_date`, store `subscription_id` and `customer_id`. | Payment confirmation and account/login access email. | Unlock paid features if user exists and plan limits are valid. |
| Payment captured | Set `payment_status = captured`, update latest invoice/payment reference, refresh period dates if included. | Payment confirmation. | Keep or restore paid access. |
| Payment failed | Set `payment_status = failed`, set `failed_payment_status = true`, set `subscription_status = past_due` or `pending`. | Payment failed email. | Keep access only during grace period, then lock if unresolved. |
| Subscription pending | Set `subscription_status = pending`, store pending payment/subscription metadata. | Account pending or payment pending email. | Keep paid access locked until activated or captured. |
| Subscription cancelled | Set `cancellation_status = true`, set `cancelled_at`, keep `current_period_end`. | Subscription cancelled email. | Keep paid access until current paid period end, then lock. |
| Subscription completed | Set `subscription_status = completed`, store completion date. | Subscription completed email. | Lock paid access unless a new active subscription exists. |
| Subscription expired | Set `subscription_status = expired`, set `expired_at`, clear active renewal date. | Subscription expired email. | Lock paid features and full exports. |

### Webhook Safety Requirements

- Verify Razorpay webhook signatures.
- Store raw webhook event ID to prevent duplicate processing.
- Process webhooks idempotently.
- Log webhook receipt, processing result, and access state changes.
- Never store full card or payment instrument details.

## 7. Email Sequence

Every email should include:

- User name
- Plan name
- Renewal date or expiry date
- Dashboard link
- Support email

### Planned Emails

| Email | Trigger | Purpose |
| --- | --- | --- |
| Payment confirmation | Payment captured | Confirm payment and plan activation. |
| Account created/login access | Account created or subscription activated | Help the user access the dashboard. |
| Report ready | Paid scan completed | Send report link and dashboard link. |
| Renewal reminder 10 days before | 10 days before renewal | Remind user about upcoming renewal. |
| Renewal reminder 7 days before | 7 days before renewal | Remind user about upcoming renewal. |
| Renewal reminder 3 days before | 3 days before renewal | Remind user about upcoming renewal. |
| Renewal day reminder | Renewal date | Confirm renewal is due today. |
| Payment failed | Payment failed webhook | Ask user to update payment method. |
| Subscription cancelled | Cancellation webhook or user cancellation | Confirm access remains until current period end. |
| Subscription expired | Expiry webhook or end of paid period | Explain that paid features are locked until renewal. |

### Suggested Support Email Placeholder

- `support@querycite.com`

## 8. Legal and Policy Updates

Before paid launch, update or add these policy pages:

- Terms of Service
- Privacy Policy
- Billing Policy
- Refund Policy

### Required Policy Topics

- Auto-renewal disclosure.
- Cancellation rule.
- Refund rule.
- Failed payment handling.
- Report storage and retention.
- User account responsibility.
- Data deletion request process.
- Third-party processors.
- No guaranteed AI citations.
- No guaranteed rankings.
- No guaranteed traffic or revenue.

### Policy Notes

- The billing policy should explain billing cycle, renewal timing, taxes if applicable, failed payments, and cancellation effect.
- The refund policy should clearly state whether launch trials, monthly subscriptions, or generated reports are refundable.
- The privacy policy should explain website URL processing, report storage, account data, payment processor usage, and deletion requests.
- The terms should explain acceptable use, generated recommendations, report limitations, and no guaranteed AI/search outcomes.

## 9. Implementation Phases

### Phase A: Mock Subscription Foundation

- Add mock subscription status.
- Add dashboard UI.
- Add saved reports UI.
- Add locked/unlocked report logic based on mock access state.
- Keep existing free audit live and stable.

### Phase B: Authentication and Database

- Add authentication.
- Add user account model.
- Add database tables for users, subscriptions, scans, reports, domains, usage, and exports.
- Move paid access checks server-side.

### Phase C: PDF/CSV Storage and Report History

- Generate and store PDF/CSV files.
- Store file references.
- Add report history to dashboard.
- Add share-link model with access rules.

### Phase D: Razorpay Test Integration

- Add Razorpay test-mode subscription integration.
- Add subscription checkout flow.
- Add webhook endpoint.
- Add webhook signature verification.
- Map Razorpay events to subscription and access fields.

### Phase E: Email Automation

- Add transactional email provider.
- Add payment, login, report-ready, renewal, failed-payment, cancellation, and expiry emails.
- Add scheduled renewal reminders.

### Phase F: Policy Updates and Production Payment Launch

- Finalize Terms of Service.
- Finalize Privacy Policy.
- Add Billing Policy.
- Add Refund Policy.
- Switch Razorpay from test mode to production only after webhook/access tests pass.

## 10. Recommended Next Build Task

Build Phase A: mock paid-access foundation.

Recommended scope:

- Add a dashboard page using mock saved report data.
- Add a mock subscription object in the app.
- Make report locked/unlocked state depend on mock subscription state.
- Add a non-public demo toggle or query param for internal review.
- Keep the free no-login audit unchanged.

## Risks

- Users may share unlocked report URLs if share-link access is not controlled.
- Users may retain paid report exports after cancellation unless retention rules are defined.
- Failed payment grace periods can create support confusion if not explained clearly.
- Webhook failures can cause incorrect access if events are not idempotent and logged.
- Domain and scan limits can be bypassed if enforced only in the frontend.
- Trial-to-paid conversion can cause disputes if renewal disclosures are weak.

## Open Questions

- Should expired users retain read-only access to old full reports, or only limited history?
- What grace period should apply after failed payments?
- Should Launch Trial users require account creation before payment or immediately after payment?
- Should Agency plans support multiple users at launch or in a later phase?
- Should share links remain public, password-protected, or require recipient email access?
- What refund rule should apply after a report has already been generated?

## Files That May Need Changes Later

- `src/app/report/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/privacy-policy/page.tsx`
- `src/app/terms/page.tsx`
- `src/components/HomeExperience.tsx`
- `src/lib/mock.ts`
- Future dashboard routes under `src/app/dashboard`
- Future authentication helpers under `src/lib/auth`
- Future database models or schema files
- Future Razorpay webhook route under `src/app/api/razorpay/webhook`
- Future export storage helpers under `src/lib/exports`
- Future email templates under `src/emails`