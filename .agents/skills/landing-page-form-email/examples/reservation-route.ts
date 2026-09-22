// .agents/skills/landing-page-form-email/examples/reservation-route.ts
// Copy to: src/app/api/reservations/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { reservationSchema, type ReservationResponse } from "./types";
import {
  sendOwnerLeadNotification,
  sendCustomerConfirmation,
} from "./email-service";

export const runtime = "nodejs";

function createReservationReference(prefix = "RES"): string {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${code}`;
}

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ReservationResponse>(
      { ok: false, reason: "invalid_json" },
      { status: 400 }
    );
  }

  // Honeypot check
  if (typeof body === "object" && body !== null && "honeypot" in body && Boolean((body as Record<string, unknown>).honeypot)) {
    return NextResponse.json<ReservationResponse>({ ok: true, reference: "RES-BOT-TRAPPED" });
  }

  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ReservationResponse>(
      { ok: false, reason: "invalid" },
      { status: 400 }
    );
  }

  const { item, contact, details, agreement } = parsed.data;
  const reference = createReservationReference();
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();

  try {
    // 1. Send Internal Owner Notification
    await sendOwnerLeadNotification({
      name: fullName,
      email: contact.email,
      phone: contact.phone,
      serviceOrItem: `${item.name} (${item.price || "Contact for quote"})`,
      message: `Preferred Date: ${details.preferredDate || "Flexible"}\nNotes: ${details.notes || "None"}\nDeposit Acknowledged: ${agreement.depositAcknowledged ? "Yes" : "No"}`,
      reference,
      brandName: process.env.BRAND_NAME || "Company Name",
    });

    // 2. Send Customer Confirmation Autoresponder
    sendCustomerConfirmation({
      name: contact.firstName,
      email: contact.email,
      reference,
      brandName: process.env.BRAND_NAME || "Company Name",
      supportPhone: process.env.SUPPORT_PHONE,
      estimatedReplyTime: "within 1 business day",
    }).catch((err) => {
      console.error("[Customer Confirmation Error]:", err);
    });

    return NextResponse.json<ReservationResponse>({
      ok: true,
      reference,
      channel: "gmail",
    });
  } catch (error) {
    console.error("[Reservation Route Error]:", error);
    return NextResponse.json<ReservationResponse>(
      { ok: false, reason: "delivery_failed" },
      { status: 502 }
    );
  }
}
