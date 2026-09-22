// .agents/skills/landing-page-form-email/examples/ContactForm.tsx
"use client";

import { useState } from "react";
import type { ContactResponse } from "./types";

interface ContactFormProps {
  title?: string;
  subtitle?: string;
  brandPhone?: string;
  brandEmail?: string;
  serviceOptions?: Array<{ value: string; label: string }>;
  apiEndpoint?: string;
}

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ContactForm({
  title = "Get in Touch",
  subtitle = "Have questions or want to discuss a project? Send us a message and our team will get back to you within 24 hours.",
  brandPhone = "(555) 123-4567",
  brandEmail = "hello@yourdomain.com",
  serviceOptions = [
    { value: "general", label: "General Inquiry" },
    { value: "consultation", label: "Free Consultation" },
    { value: "services", label: "Custom Service Package" },
  ],
  apiEndpoint = "/api/contact",
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    serviceKey: serviceOptions[0]?.value || "general",
    message: "",
    honeypot: "", // Bot trap field
  });

  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = (await response.json().catch(() => null)) as ContactResponse | null;

      if (response.ok && data?.success) {
        setStatus("success");
        setReferenceCode(data.reference || null);
        setFormData({
          name: "",
          email: "",
          phone: "",
          serviceKey: serviceOptions[0]?.value || "general",
          message: "",
          honeypot: "",
        });
      } else {
        const errorDetail =
          data && !data.success
            ? data.errors.map((err) => err.message).join(" ")
            : "Something went wrong sending your message. Please try again or call us directly.";
        setStatus("error");
        setErrorMessage(errorDetail);
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your internet connection and try again.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
        {/* Left Column: Context & Direct Contact */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="text-base text-slate-600 leading-relaxed">{subtitle}</p>

          <div className="pt-6 border-t border-slate-200 space-y-4 text-sm">
            <div>
              <span className="block font-semibold text-slate-900">Phone Support</span>
              <a href={`tel:${brandPhone.replace(/\D/g, "")}`} className="text-blue-600 hover:underline">
                {brandPhone}
              </a>
            </div>
            <div>
              <span className="block font-semibold text-slate-900">Direct Email</span>
              <a href={`mailto:${brandEmail}`} className="text-blue-600 hover:underline">
                {brandEmail}
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Accessible Form */}
        <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          {status === "success" ? (
            <div className="text-center py-8 space-y-4" aria-live="polite">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-slate-900">Message Received!</h3>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                Thank you for reaching out. We have sent a confirmation email with your details.
              </p>
              {referenceCode && (
                <div className="inline-block bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-mono text-slate-700">
                  Reference: <span className="font-bold text-blue-600">{referenceCode}</span>
                </div>
              )}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Send another message
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Invisible Honeypot Anti-Spam Field */}
              <div
                style={{
                  position: "absolute",
                  left: "-9999px",
                  opacity: 0,
                  height: 0,
                  overflow: "hidden",
                }}
                aria-hidden="true"
              >
                <input
                  type="text"
                  name="honeypot"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.honeypot}
                  onChange={handleChange}
                />
              </div>

              {/* Server Error Alert Banner */}
              {status === "error" && errorMessage && (
                <div
                  className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                  role="alert"
                  aria-live="assertive"
                >
                  {errorMessage}
                </div>
              )}

              {/* Name Field */}
              <div>
                <label htmlFor="form-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="form-name"
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 text-[16px] rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {/* Email & Phone 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form-email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="form-email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="w-full px-4 py-2.5 text-[16px] rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="form-phone" className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="form-phone"
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 000-0000"
                    className="w-full px-4 py-2.5 text-[16px] rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <label htmlFor="form-service" className="block text-sm font-medium text-slate-700 mb-1">
                  How can we help?
                </label>
                <select
                  id="form-service"
                  name="serviceKey"
                  value={formData.serviceKey}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-[16px] rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {serviceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Field */}
              <div>
                <label htmlFor="form-message" className="block text-sm font-medium text-slate-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="form-message"
                  name="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about what you need..."
                  className="w-full px-4 py-2.5 text-[16px] rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-3 px-6 text-sm font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 flex items-center justify-center gap-2"
              >
                {status === "submitting" ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>Sending your message...</span>
                  </>
                ) : (
                  <span>Send Message</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
