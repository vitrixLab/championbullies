#!/usr/bin/env node
// .agents/skills/landing-page-form-email/scripts/test-email-dispatch.mjs

import nodemailer from "nodemailer";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// 1. Try loading environment files (.env.local first, then .env)
const cwd = process.cwd();
const envLocal = path.join(cwd, ".env.local");
const envDefault = path.join(cwd, ".env");

if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
  console.log(`[Config] Loaded environment from: .env.local`);
} else if (fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault });
  console.log(`[Config] Loaded environment from: .env`);
} else {
  console.warn(`[Config Warning] No .env.local or .env file found in ${cwd}`);
}

const {
  GOOGLE_USER,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
  OWNER_EMAIL,
  RESEND_API_KEY,
} = process.env;

console.log("\n=======================================================");
console.log("  Gmail OAuth2 & Email Dispatch Diagnostic Tool");
console.log("=======================================================\n");

// 2. Validate presence of credentials
const missing = [];
if (!GOOGLE_USER) missing.push("GOOGLE_USER");
if (!GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
if (!GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
if (!GOOGLE_REFRESH_TOKEN) missing.push("GOOGLE_REFRESH_TOKEN");

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables:\n   - ${missing.join("\n   - ")}`);
  console.error("\nPlease configure these variables in your .env.local file.");
  console.error("See references/gmail-oauth-guide.md for step-by-step instructions.\n");
  process.exit(1);
}

console.log(`✓ Sender Address (GOOGLE_USER): ${GOOGLE_USER}`);
console.log(`✓ Client ID:                     ${GOOGLE_CLIENT_ID.slice(0, 16)}...`);
console.log(`✓ Recipient (OWNER_EMAIL):       ${OWNER_EMAIL || "(Defaults to GOOGLE_USER)"}`);
if (RESEND_API_KEY) {
  console.log(`✓ Secondary Fallback (Resend):   Configured`);
} else {
  console.log(`ℹ Secondary Fallback (Resend):   Not configured (optional)`);
}

async function runDiagnostics() {
  console.log("\n[1/3] Testing Google OAuth2 Token Exchange...");

  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN,
  });

  let accessToken = null;
  try {
    const tokenRes = await oauth2Client.getAccessToken();
    accessToken = tokenRes?.token;
    if (!accessToken) {
      throw new Error("Received empty access token from Google OAuth2 service.");
    }
    console.log("✓ Successfully obtained fresh Google access token!");
  } catch (tokenErr) {
    console.error("❌ OAuth2 Token Exchange Failed:", tokenErr.message);
    if (tokenErr.message.includes("invalid_grant")) {
      console.error("\n💡 HINT: 'invalid_grant' typically means:");
      console.error("   1. Your Google OAuth app is in 'Testing' mode and the refresh token expired after 7 days.");
      console.error("      Fix: In Google Cloud Console, set Publishing Status to 'In Production'.");
      console.error("   2. The user revoked access or changed their password.");
      console.error("   3. The refresh token was copied incorrectly.");
    }
    process.exit(1);
  }

  console.log("\n[2/3] Verifying Nodemailer Transporter Connection...");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: GOOGLE_USER,
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      refreshToken: GOOGLE_REFRESH_TOKEN,
      accessToken,
    },
  });

  try {
    await transporter.verify();
    console.log("✓ Nodemailer connection verified successfully!");
  } catch (verifyErr) {
    console.error("❌ Transporter verification failed:", verifyErr.message);
    process.exit(1);
  }

  // Check if --send flag is provided
  const shouldSendTest = process.argv.includes("--send");
  if (shouldSendTest) {
    console.log("\n[3/3] Sending live test email to recipient...");
    const targetRecipient = OWNER_EMAIL || GOOGLE_USER;

    try {
      const info = await transporter.sendMail({
        from: `"Lead Dispatch Test" <${GOOGLE_USER}>`,
        to: targetRecipient,
        subject: `[Diagnostic Test] Landing Page Form Email System (${new Date().toLocaleTimeString()})`,
        text: `Success! Your landing page Gmail OAuth2 email integration is working properly.\n\nTimestamp: ${new Date().toISOString()}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
            <h2 style="color: #059669; margin-top: 0;">✓ Email Integration Working!</h2>
            <p>This confirms that your landing page form email dispatch via Google OAuth2 is successfully configured.</p>
            <p style="color: #6b7280; font-size: 13px;">Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
      });

      console.log(`✓ Test email sent successfully! Message ID: ${info.messageId}`);
      console.log(`  Delivered to: ${targetRecipient}`);
    } catch (sendErr) {
      console.error("❌ Sending test email failed:", sendErr.message);
      process.exit(1);
    }
  } else {
    console.log("\n[3/3] Skipping live email dispatch.");
    console.log("  To send an actual test email, run with the --send flag:");
    console.log("  node .agents/skills/landing-page-form-email/scripts/test-email-dispatch.mjs --send\n");
  }

  console.log("=======================================================");
  console.log("🎉 ALL CHECKS PASSED: Your email system is ready!");
  console.log("=======================================================\n");
}

runDiagnostics();
