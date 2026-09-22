// .agents/skills/landing-page-form-email/examples/email-service.ts
import nodemailer from "nodemailer";
import { google } from "googleapis";

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

/**
 * Returns a nodemailer transporter authenticated via Google OAuth2.
 * Fresh access token is requested per send since Google access tokens expire hourly.
 */
async function getGmailTransporter() {
  const accessTokenResponse = await oauth2Client.getAccessToken();
  const accessToken = accessTokenResponse?.token;

  if (!accessToken) {
    throw new Error("Failed to obtain Google access token. Check refresh token and client secret.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GOOGLE_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken,
    },
  });
}

/**
 * 1. Admin/Owner Notification Email
 * Sent immediately to the business owner when a lead or inquiry arrives.
 * 'replyTo' is pointed to the customer's email so replying addresses the lead directly.
 */
export async function sendOwnerLeadNotification(payload: {
  name: string;
  email: string;
  phone?: string;
  serviceOrItem?: string;
  message?: string;
  reference: string;
  brandName?: string;
}) {
  const transporter = await getGmailTransporter();
  const owner = process.env.OWNER_EMAIL || process.env.GOOGLE_USER;
  const brand = payload.brandName || "Landing Page";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #0f172a; padding: 20px 24px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 600;">New Lead Notification</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">
          Reference: <strong style="color: #38bdf8;">${payload.reference}</strong>
        </p>
      </div>

      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; width: 35%;">Lead Name</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${payload.name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Email Address</td>
            <td style="padding: 10px 0;">
              <a href="mailto:${payload.email}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                ${payload.email}
              </a>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Phone Number</td>
            <td style="padding: 10px 0;">
              ${
                payload.phone
                  ? `<a href="tel:${payload.phone}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${payload.phone}</a>`
                  : "<span style='color: #94a3b8;'>Not provided</span>"
              }
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">Interest / Subject</td>
            <td style="padding: 10px 0; font-weight: 500;">${payload.serviceOrItem || "General Inquiry"}</td>
          </tr>
        </table>

        ${
          payload.message
            ? `
          <div style="margin-top: 20px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Message / Details</p>
            <div style="background: #f8fafc; border-left: 3px solid #0284c7; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #334155; white-space: pre-wrap;">
              ${payload.message}
            </div>
          </div>
        `
            : ""
        }

        <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          💡 <strong>Tip:</strong> Simply reply directly to this email to reach <strong>${payload.name}</strong>.
        </div>
      </div>
    </div>
  `;

  const text = `New Lead Notification [${payload.reference}]

Name: ${payload.name}
Email: ${payload.email}
Phone: ${payload.phone || "Not provided"}
Interest: ${payload.serviceOrItem || "General Inquiry"}

Message:
${payload.message || "None"}

Reply directly to this email to respond to the lead.
`;

  return transporter.sendMail({
    from: `"${brand}" <${process.env.GOOGLE_USER}>`,
    to: owner,
    replyTo: payload.email,
    subject: `New Lead: ${payload.name} — ${payload.serviceOrItem || "Inquiry"} (${payload.reference})`,
    text,
    html,
  });
}

/**
 * 2. Customer Confirmation Autoresponder
 * Sent to the customer immediately after form submission to build trust and set expectations.
 */
export async function sendCustomerConfirmation(payload: {
  name: string;
  email: string;
  reference: string;
  brandName?: string;
  supportPhone?: string;
  estimatedReplyTime?: string;
}) {
  const transporter = await getGmailTransporter();
  const brand = payload.brandName || "Our Team";
  const firstName = payload.name.trim().split(" ")[0] || payload.name;
  const replyTime = payload.estimatedReplyTime || "within 24 hours";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #0f172a; padding: 24px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 600;">We received your message</h1>
      </div>

      <div style="padding: 24px;">
        <p style="margin: 0 0 16px; font-size: 15px;">Hi <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px; font-size: 15px; color: #475569;">
          Thank you for getting in touch! We've received your request and our team is currently reviewing it.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; display: block;">Inquiry Reference Code</span>
          <strong style="font-size: 20px; color: #0284c7; font-family: monospace;">${payload.reference}</strong>
        </div>

        <h3 style="margin: 0 0 10px; font-size: 15px; font-weight: 600; color: #0f172a;">What happens next:</h3>
        <ol style="margin: 0 0 24px; padding-left: 20px; color: #475569; font-size: 14px;">
          <li style="margin-bottom: 6px;">Our specialist reviews your requirements.</li>
          <li style="margin-bottom: 6px;">We prepare a tailored response or quote.</li>
          <li>You will hear back from us <strong>${replyTime}</strong>.</li>
        </ol>

        ${
          payload.supportPhone
            ? `
          <p style="font-size: 14px; color: #475569; margin: 0 0 20px;">
            Need immediate assistance? Call us directly at 
            <a href="tel:${payload.supportPhone}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${payload.supportPhone}</a>.
          </p>
        `
            : ""
        }

        <p style="margin: 28px 0 0; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          — The ${brand} Team
        </p>
      </div>
    </div>
  `;

  const text = `Hi ${firstName},

Thank you for reaching out! We received your message and our team is reviewing it.

Your Reference Code: ${payload.reference}

What happens next:
1. Our specialist reviews your requirements.
2. We prepare a tailored response or quote.
3. You will hear back from us ${replyTime}.

— The ${brand} Team
`;

  return transporter.sendMail({
    from: `"${brand}" <${process.env.GOOGLE_USER}>`,
    to: payload.email,
    replyTo: process.env.OWNER_EMAIL || process.env.GOOGLE_USER,
    subject: `We received your inquiry — Reference: ${payload.reference}`,
    text,
    html,
  });
}

/**
 * 3. Fallback Dispatch via Resend (Env-gated)
 * Used when Gmail API encounters rate limits or token refresh failures.
 */
export async function sendFallbackEmail(payload: {
  name: string;
  email: string;
  phone?: string;
  message: string;
  reference: string;
}): Promise<{ delivered: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_EMAIL || process.env.OWNER_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || "alerts@resend.dev";

  if (!key || !to) {
    return { delivered: false, error: "resend_not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Lead Alert <${from}>`,
        to: [to],
        reply_to: payload.email,
        subject: `[EMERGENCY FALLBACK] Lead: ${payload.name} (${payload.reference})`,
        text: `Lead submission received via fallback channel:\n\nReference: ${payload.reference}\nName: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone || "None"}\nMessage: ${payload.message}`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { delivered: false, error: `resend_${res.status}: ${errText.slice(0, 150)}` };
    }

    return { delivered: true };
  } catch (err) {
    return { delivered: false, error: err instanceof Error ? err.message : "unknown_resend_error" };
  }
}
