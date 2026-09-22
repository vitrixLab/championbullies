// .agents/skills/landing-page-form-email/examples/types.ts
import { z } from "zod";

// ==========================================
// 1. Contact Inquiry Schema
// ==========================================
export const contactInquirySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+-]{7,25}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  serviceKey: z.string().trim().default("general"),
  message: z
    .string()
    .trim()
    .min(5, "Message must be at least 5 characters")
    .max(3000, "Message cannot exceed 3,000 characters"),
  // Honeypot field — automated bots fill this, human forms keep it empty
  honeypot: z.string().optional(),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;

export type ContactResponse =
  | { success: true; channel?: "gmail" | "ghl" | "resend"; reference?: string }
  | { success: false; errors: Array<{ field: string; message: string }> };

// ==========================================
// 2. Reservation / Booking Schema
// ==========================================
export const reservationSchema = z.object({
  item: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().optional(),
    price: z.string().optional(),
  }),
  contact: z.object({
    firstName: z.string().trim().min(2, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Valid email is required"),
    phone: z.string().trim().min(7, "Valid phone number is required"),
  }),
  details: z.object({
    preferredDate: z.string().optional(),
    notes: z.string().optional(),
  }),
  agreement: z.object({
    termsAccepted: z.literal(true, {
      message: "You must accept the terms to proceed",
    }),
    depositAcknowledged: z.boolean().default(false),
  }),
  honeypot: z.string().optional(),
});

export type ReservationInput = z.infer<typeof reservationSchema>;

export type ReservationResponse =
  | { ok: true; reference: string; channel?: string }
  | { ok: false; reason: "invalid" | "invalid_json" | "rate_limited" | "delivery_failed" | "network" };
