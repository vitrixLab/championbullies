# Environment Variables Reference Guide

This document defines all environment variables used by the form handling, Gmail OAuth2, and fallback email dispatch system.

---

## 1. Gmail OAuth2 Credentials (Primary Dispatch)

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `GOOGLE_USER` | **Yes** | The Gmail / Google Workspace address sending notifications. | `notifications@brand.com` or `mybrand@gmail.com` |
| `GOOGLE_CLIENT_ID` | **Yes** | The OAuth 2.0 Client ID generated in Google Cloud Console. | `1234567890-xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **Yes** | The OAuth 2.0 Client Secret from Google Cloud Console. | `GOCSPX-xxxxxxxxxxxxxxxxxxxx` |
| `GOOGLE_REFRESH_TOKEN` | **Yes** | The permanent refresh token generated via Google OAuth Playground. | `1//04rX...` |
| `OWNER_EMAIL` | Optional | Email inbox where admin/owner lead notifications are sent (defaults to `GOOGLE_USER`). | `owner@brand.com` |

---

## 2. Fallback Email Provider (Resend / SMTP)

If Gmail API is temporarily unavailable or hit an API quota limit, the fallback provider ensures the lead is never lost.

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `RESEND_API_KEY` | Optional | API key from [Resend.com](https://resend.com) for secondary delivery. | `re_123456789...` |
| `CONTACT_NOTIFY_EMAIL` | Optional | Recipient inbox for Resend fallback notifications. | `leads@brand.com` |
| `CONTACT_FROM_EMAIL` | Optional | Verified sender email domain on Resend (e.g. `alerts@yourdomain.com`). | `alerts@domain.com` |

---

## 3. CRM Integration (Optional: GoHighLevel / Webhook)

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `GHL_API_KEY` | Optional | HighLevel OAuth Access Token or Location API Key. | `Bearer pit-xxxx...` |
| `GHL_LOCATION_ID` | Optional | HighLevel Sub-Account Location ID. | `kjsdf8734h...` |
| `GHL_PIPELINE_ID` | Optional | HighLevel Opportunity Pipeline ID. | `pipe_1234` |
| `GHL_PIPELINE_STAGE_ID` | Optional | Stage ID within the Pipeline (e.g. "New Leads"). | `stage_5678` |

---

## 4. Production Deployment Best Practices

### Local Development (`.env.local`)
Create `.env.local` in your project root. Ensure `.env*.local` is present in `.gitignore`:
```bash
# .env.local
GOOGLE_USER=yourbrand@gmail.com
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REFRESH_TOKEN=1//0xxx
OWNER_EMAIL=leads@yourbrand.com
```

### Hosting on Vercel / Netlify / Railway
1. Go to your project settings in the hosting provider dashboard.
2. Select **Environment Variables**.
3. Add each variable for both **Production** and **Preview** environments.
4. **Important**: When redeploying after updating variables, trigger a fresh deployment so serverless lambdas pick up the latest credentials.

### Security Checklist
- [x] Never log access tokens or secrets to `console.log`.
- [x] Keep `GOOGLE_REFRESH_TOKEN` strictly server-side (never expose with `NEXT_PUBLIC_` prefix).
- [x] In Google Cloud Console, ensure Publishing Status is **In Production** to prevent 7-day token expiration.
