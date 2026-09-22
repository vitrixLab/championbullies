# Landing Page Form & Email Adaptation Guide

This guide details how to adapt the form capture and email notification system to different landing page archetypes, industries, and form formats.

---

## 1. Choosing Your Form Archetype

Depending on your landing page's conversion goal, choose one of these standard archetypes:

### Archetype A: Quick Contact / Lead Magnet (1 Step)
- **Use Case**: Consulting inquiries, quote requests, general contact, lead magnet download.
- **Fields**:
  - Full Name (`autoComplete="name"`)
  - Email Address (`autoComplete="email"`)
  - Phone Number (`autoComplete="tel"`, optional or required)
  - Service / Topic of Interest (`<select>` dropdown)
  - Message / Project Details (`<textarea>`)
  - Anti-spam honeypot (`website`, hidden)
- **User Expectation**: Fast submission (< 20 seconds), instant confirmation on-screen, immediate email acknowledgement with timeline ("We reply within 24 hours").

### Archetype B: Consultation / Appointment Booking (1 or 2 Steps)
- **Use Case**: Strategy sessions, discovery calls, service visits.
- **Fields**:
  - Contact Details (Name, Email, Phone)
  - Preferred Date & Time Window
  - Budget or Project Scope
  - Current Situation / Goals
- **Confirmation**: Includes calendar invite (.ics) download link or next steps to schedule.

### Archetype C: Multi-Step Reservation / Order Intake (3 to 4 Steps)
- **Use Case**: High-ticket products, pet adoptions, custom manufacturing, event reservations.
- **Step Breakdown**:
  - **Step 1 — Selection**: Item / Service selection, variant, pricing confirmation.
  - **Step 2 — Contact**: Name, Email, Phone, Preferred contact method.
  - **Step 3 — Qualification**: Custom criteria (e.g. living situation, timeline, business size).
  - **Step 4 — Agreement**: Terms checkbox, deposit acknowledgement, final review.
- **State Management**: Use React Hook Form with `@hookform/resolvers/zod` or React Context to retain step values across back/forward navigation.

---

## 2. Accessible & Mobile-Optimized Form Rules

When crafting form inputs in React / Next.js, always follow these standards:

### 1. Prevent iOS Auto-Zoom
On iOS Safari, inputs with `font-size` smaller than `16px` trigger an annoying automatic zoom-in when focused.
```css
/* Ensure inputs, selects, and textareas have at least 16px font size */
input, select, textarea {
  font-size: 16px !important;
}
```

### 2. Standard `autoComplete` Attributes
Always provide correct HTML5 autocomplete attributes so mobile password managers and browsers autofill seamlessly:
- Name: `autoComplete="name"` (or `autoComplete="given-name"` / `autoComplete="family-name"`)
- Email: `autoComplete="email"`
- Phone: `autoComplete="tel"`
- Street Address: `autoComplete="address-line1"`
- City: `autoComplete="address-level2"`
- Postal Code: `autoComplete="postal-code"`

### 3. Accessible Labels & ARIA
- Pair every `<input>` with `<label htmlFor="id">` (or use `aria-label` / `aria-labelledby`).
- Mark required fields with `aria-required="true"`.
- Use `aria-invalid={!!errorMessage}` and link errors via `aria-describedby="error-id"`.
- Use `aria-live="polite"` on status messages (loading spinner, success banner, error alerts).

---

## 3. Anti-Spam Without User Friction (Zero Captcha)

Never force real human users to solve annoying image captchas when a combination of honeypot and rate limiting is far more effective:

### 1. Invisible Honeypot Field
Place an input field that is invisible to humans but filled by automated spam bots:

```tsx
{/* Honeypot field - Bots fill this, humans cannot see it */}
<div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
  <input
    type="text"
    name="company_title"
    tabIndex={-1}
    autoComplete="off"
    value={formData.honeypot}
    onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
  />
</div>
```

In the API route:
```ts
if (body.company_title) {
  // Silently drop or return fake success to trick the bot
  return NextResponse.json({ success: true, fake: true });
}
```

### 2. In-Memory or Redis Rate Limiting
Limit submissions to 5 per 10 minutes per IP address to prevent flood attacks.

---

## 4. Crafting High-Converting Email Notifications

### A. Admin / Owner Alert Email
1. **Subject Line**: Include the lead's name and topic/item:
   `New Inquiry — [Customer Name] ([Service / Puppy Name])`
2. **Reply-To**: Crucial! Set `replyTo: payload.email`. When the business owner taps "Reply" in their email client (Gmail, Apple Mail, Outlook), it replies directly to the lead rather than the system sender!
3. **Structured Table**: Use an HTML table with clear labels and values for quick scanning on mobile.
4. **Direct Action Links**:
   - `<a href="tel:+15551234567">Call Customer</a>`
   - `<a href="mailto:customer@email.com">Email Customer</a>`

### B. Customer Confirmation Autoresponder
1. **Subject Line**: Friendly and reassuring:
   `We received your request — [Reference Number]`
2. **Personalization**: Greet by first name (`Hi John,`).
3. **Clear Next Steps**: Bulleted list explaining:
   - What happens next (e.g. "Our team reviews your inquiry within 2 hours").
   - What to prepare (e.g. questions or details).
   - How to contact immediately if urgent (phone number).
4. **Brand Signature**: Clean footer with company phone, website link, and address.
