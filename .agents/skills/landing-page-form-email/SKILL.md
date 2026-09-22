---
name: landing-page-form-email
description: >-
  Comprehensive guide, runbook, and architectural patterns for building, adapting, and debugging
  accessible form submissions (contact, lead generation, booking, reservation) and resilient email
  dispatch via Gmail OAuth2 and fallback providers (Resend/SMTP) across landing pages. Use whenever
  implementing or adapting forms, configuring Gmail API/OAuth2 credentials, designing email templates,
  or ensuring reliable lead capture.
---

# Landing Page Form & Email Integration Skill

A battle-tested standard for capturing, validating, and delivering leads from landing pages to business owners and clients with **zero lead loss**, high deliverability, accessible user experience, and automated customer confirmations.

---

## Architecture Overview

```
[ User Browser / Mobile ]
        │  1. Client-Side Form UX (Autofill, Zod safe checks, Honeypot bot trap)
        ▼
[ Next.js API Route: /api/contact or /api/reservations ]
        │  2. In-memory / Redis Rate Limiter (IP-based protection)
        │  3. Server-side Zod Validation (strict parsing & sanitization)
        │  4. Unique Reference Code Generation (e.g., CB-A1B2C3)
        ▼
[ Primary Dispatch: CRM & Gmail OAuth2 ]
  ├─► CRM / Pipeline Upsert (e.g., GoHighLevel, HubSpot, Webhook)
  ├─► Admin Notification Email (Via Gmail OAuth2 / Nodemailer, Reply-To client)
  └─► Client Confirmation Autoresponder (Branded HTML + Text receipt)
        │
        ▼ (If primary dispatch fails)
[ Resilient Fallback: Resend / SMTP API ]
  └─► Emergency alert sent to owner with full submission payload
```

---

## Key Principles

1. **Zero Lead Loss**: Form submissions must never vanish into the void. If a primary provider (like CRM or OAuth2) encounters a transient token error, the system automatically falls back to an alternate channel (e.g. Resend, webhook, or structured system alerts).
2. **Dual-Notification Flow**:
   - **Internal/Admin Alert**: Formatted table with all submission data, immediate phone/email direct links, and `reply-to` set to the customer's email so owners can click "Reply" to respond instantly.
   - **Customer Confirmation**: Friendly, branded acknowledgement providing an order/inquiry reference number, expectations on response time, and next steps.
3. **Mobile-First & Accessible Form UX**:
   - Explicit `autoComplete` attributes (`name`, `email`, `tel`, `address-line1`).
   - Visible labels linked via `htmlFor`/`id`.
   - Clear loading and error states with ARIA attributes (`aria-live="polite"`, `aria-busy`).
   - Anti-spam honeypot hidden via CSS and `tabIndex={-1}`, rejecting bot submissions without annoying captchas.
4. **Resilient OAuth2 Token Management**:
   - Google rotates access tokens hourly. The email transporter is initialized fresh with a refreshed access token using `oauth2Client.getAccessToken()`.
   - The Google Cloud OAuth consent screen must be set to **Production** status to prevent 7-day token revocation.

---

## Adaptation Runbook: New Landing Page in 6 Steps

When adapting this system to a new landing page or client project, follow this exact workflow:

### Step 1: Define Schemas & Types
1. Copy or extend [`examples/types.ts`](./examples/types.ts).
2. Define field requirements with `zod` (names, email regex, normalized phone, dropdown options, optional notes).
3. Export inferred TypeScript types for both client component and API route.

### Step 2: Implement Client Form Component
1. Copy [`examples/ContactForm.tsx`](./examples/ContactForm.tsx).
2. Customize the field layout, branding colors (Tailwind classes or CSS variables), and typography.
3. Ensure all inputs include proper `autoComplete`, `placeholder`, and `aria-required` tags.
4. Keep the honeypot field (`website` or `confirm_email`) styled as `display: none` and off-screen.

### Step 3: Set Up API Endpoint
1. Copy [`examples/contact-route.ts`](./examples/contact-route.ts) to your project's `src/app/api/contact/route.ts` (or `src/app/api/inquiry/route.ts`).
2. Verify route runtime is set to `export const runtime = "nodejs";` (required for Nodemailer and Google APIs).
3. Connect rate limiting and validation logic.

### Step 4: Configure Email Service & Templates
1. Copy [`examples/email-service.ts`](./examples/email-service.ts) to `src/lib/email.ts`.
2. Customize HTML and plain-text templates:
   - Match brand colors, typography, and logo.
   - Set the `from` display name (e.g., `"Brand Name" <user@domain.com>`).
   - Set the `to` admin recipient (`OWNER_EMAIL`).
   - Ensure the customer email has `replyTo` pointed to client contact information.

### Step 5: Configure Environment Variables
1. Refer to [`references/env-variables-reference.md`](./references/env-variables-reference.md).
2. Populate `.env.local`:
   ```bash
   GOOGLE_USER="your-inbox@gmail.com"
   GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
   GOOGLE_REFRESH_TOKEN="1//0xxx"
   OWNER_EMAIL="notifications@yourdomain.com"
   RESEND_API_KEY="re_xxx" # Optional fallback
   ```

### Step 6: Verify & Test
1. Run the verification script:
   ```bash
   node .agents/skills/landing-page-form-email/scripts/test-email-dispatch.mjs
   ```
2. Submit a test form from the browser with test details.
3. Confirm delivery to both the owner inbox and customer confirmation inbox.

---

## Detailed References & Examples

- **[Gmail OAuth2 Setup Guide](./references/gmail-oauth-guide.md)**: How to generate credentials in Google Cloud Console and avoid token expiration.
- **[Environment Variables Reference](./references/env-variables-reference.md)**: Complete guide to all environment variables and secrets.
- **[Landing Page Adaptation Guide](./references/landing-page-adaptation.md)**: Playbook for customizing forms for different industries (consulting, e-commerce, real estate, bookings).
- **[Code Examples](./examples/)**:
  - [`email-service.ts`](./examples/email-service.ts): Modular email dispatch with Gmail OAuth2 + Resend fallback.
  - [`contact-route.ts`](./examples/contact-route.ts): Production Next.js API route with validation & rate limiting.
  - [`reservation-route.ts`](./examples/reservation-route.ts): Multi-step booking/reservation route with references.
  - [`ContactForm.tsx`](./examples/ContactForm.tsx): Complete React form component with responsive UI & honeypot.
  - [`types.ts`](./examples/types.ts): Zod validation schemas and type contracts.
- **[Diagnostic Test Script](./scripts/test-email-dispatch.mjs)**: Command-line script to test Gmail OAuth2 connectivity.

---

## Common Pitfalls & Solutions

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| `invalid_grant: Token has been expired or revoked` | Google OAuth app is in "Testing" mode (tokens expire in 7 days). | Go to Google Cloud Console &rarr; OAuth Consent Screen &rarr; Click **"Publish App"** to set status to Production. |
| `Failed to obtain Google access token` | Incorrect redirect URI during refresh token generation or bad Client Secret. | Use `https://developers.google.com/oauthplayground` as the authorized redirect URI and check credentials. |
| Edge Runtime Error (`crypto` / `net` not found) | Nodemailer executed on Edge runtime. | Add `export const runtime = "nodejs";` at the top of your API route file. |
| Spam folder delivery | Missing SPF/DKIM or generic `from` header. | When using Gmail OAuth2, ensure `from` matches the authenticated `GOOGLE_USER`. |
| Forms submitted multiple times on double-click | Missing disabled state on submit button. | Bind `disabled={status === "loading"}` to the submit button. |
| Mobile keyboard obscures input | Missing viewport / input styling. | Use minimum `16px` font size on inputs to prevent iOS Safari auto-zoom. |
