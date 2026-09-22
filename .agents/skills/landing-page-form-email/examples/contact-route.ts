// .agents/skills/landing-page-form-email/examples/contact-route.ts
// Copy to: src/app/api/contact/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { contactInquirySchema, type ContactResponse } from "./types";
import {
  sendOwnerLeadNotification,
  sendCustomerConfirmation,
  sendFallbackEmail,
} from "./email-service";

// Explicit nodejs runtime required for Nodemailer & Google APIs
export const runtime = "nodejs";

// =========================================================================
// Simple in-memory rate limiter (5 submissions per 10 minutes per IP)
// For multi-instance/serverless edge clusters, replace with Upstash Redis.
// =========================================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false };
  }

  entry.count += 1;
  return { allowed: true };
}

function generateReference(prefix = "INQ"): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${rand}`;
}

export async function POST(request: Request) {
  // 1. IP identification for rate-limiting
  const ip =
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  if (!checkRateLimit(ip).allowed) {
    return NextResponse.json<ContactResponse>(
      {
        success: false,
        errors: [
          {
            field: "rate_limit",
            message: "Too many attempts. Please wait 10 minutes before submitting again.",
          },
        ],
      },
      { status: 429 }
    );
  }

  // 2. JSON parsing
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ContactResponse>(
      {
        success: false,
        errors: [{ field: "body", message: "Invalid JSON format in request." }],
      },
      { status: 400 }
    );
  }

  // 3. Honeypot check: If bot filled the hidden honeypot field, drop silently
  if (typeof body === "object" && body !== null && "honeypot" in body && Boolean((body as Record<string, unknown>).honeypot)) {
    // Return fake success so bots do not retry with alternate vectors
    return NextResponse.json<ContactResponse>({ success: true, reference: "INQ-BOT-TRAPPED" });
  }

  // 4. Schema validation with Zod
  const parsed = contactInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ContactResponse>(
      {
        success: false,
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "root",
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const { name, email, phone, serviceKey, message } = parsed.data;
  const reference = generateReference();
  let emailDelivered = false;

  // 5. Primary Email Dispatch (Gmail OAuth2)
  try {
    // A. Send owner notification
    await sendOwnerLeadNotification({
      name,
      email,
      phone,
      serviceOrItem: serviceKey,
      message,
      reference,
      brandName: process.env.BRAND_NAME || "Company Name",
    });
    emailDelivered = true;

    // B. Send customer autoresponder (best-effort; non-blocking failure)
    sendCustomerConfirmation({
      name,
      email,
      reference,
      brandName: process.env.BRAND_NAME || "Company Name",
      supportPhone: process.env.SUPPORT_PHONE,
    }).catch((err) => {
      console.error("[Confirmation Autoresponder Error]:", err);
    });
  } catch (primaryErr) {
    console.error("[Gmail OAuth Dispatch Failed]:", primaryErr);

    // 6. Resilient Fallback (Resend or secondary provider)
    const fallback = await sendFallbackEmail({
      name,
      email,
      phone,
      message,
      reference,
    });

    if (fallback.delivered) {
      emailDelivered = true;
      console.log(`[Email Fallback] Successfully delivered lead ${reference} via Resend.`);
    } else {
      console.error("[Email Fallback Failed]:", fallback.error);
    }
  }

  // 7. Response delivery
  if (emailDelivered) {
    return NextResponse.json<ContactResponse>({
      success: true,
      reference,
      channel: "gmail",
    });
  }

  // If all channels failed, return honest server error (do not fake success)
  return NextResponse.json<ContactResponse>(
    {
      success: false,
      errors: [
        {
          field: "server",
          message: "Our email service is temporarily unavailable. Please call us directly or try again shortly.",
        },
      ],
    },
    { status: 502 }
  );
}
