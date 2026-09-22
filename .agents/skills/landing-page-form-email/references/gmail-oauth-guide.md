# Gmail OAuth2 Setup Guide

This guide walks you through generating a permanent, production-ready Google OAuth2 refresh token for sending emails from any landing page using Node.js and Nodemailer.

---

## Why OAuth2 Instead of "Less Secure Apps" or App Passwords?

- Google deprecated "Less Secure Apps" and strictly enforces OAuth2 or App Passwords.
- App Passwords require 2FA on personal accounts and can break unexpectedly.
- OAuth2 with a scoped refresh token is secure, programmatic, compliant with Google security policies, and allows seamless programmatic token rotation without exposing the account password.

---

## Step 1: Create a Google Cloud Project

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top bar and select **New Project**.
3. Name the project (e.g., `BrandName-Email-Dispatch`) and click **Create**.
4. Ensure the new project is selected in the console header.

---

## Step 2: Enable the Gmail API

1. In the navigation menu (left sidebar), go to **APIs & Services** &rarr; **Library**.
2. In the search box, search for **Gmail API**.
3. Click **Gmail API** and then click the **Enable** button.

---

## Step 3: Configure the OAuth Consent Screen

1. In the left sidebar, click **APIs & Services** &rarr; **OAuth consent screen**.
2. User Type: Select **External** (unless you have a Google Workspace organization and only send internally).
3. Click **Create**.
4. Fill in the App Information:
   - **App name**: e.g., `Landing Page Lead Dispatch`
   - **User support email**: Select your Gmail account.
   - **Developer contact information**: Enter your email address.
5. Click **Save and Continue**.
6. **Scopes**: Click **Add or Remove Scopes**:
   - Filter or scroll to find `https://mail.google.com/` or `https://www.googleapis.com/auth/gmail.send`.
   - Check the box and click **Update**, then **Save and Continue**.
7. **Test Users**: Add the Gmail address you will use to send emails (`GOOGLE_USER`). Click **Save and Continue**.
8. **CRITICAL STEP — Publishing Status**:
   > [!IMPORTANT]
   > By default, your app is in **Testing** status. In "Testing" status, Google automatically revokes OAuth refresh tokens **after 7 days**, which will silently break your contact forms after one week!
   > 
   > Go back to the **OAuth consent screen** dashboard and click **"PUBLISH APP"** to set the publishing status to **In Production**. (Verification is not required for apps used only by yourself / your own business).

---

## Step 4: Create OAuth 2.0 Client Credentials

1. In the left sidebar, click **APIs & Services** &rarr; **Credentials**.
2. Click **+ Create Credentials** at the top &rarr; select **OAuth client ID**.
3. Application type: Select **Web application**.
4. Name: e.g., `Nodemailer Gmail Client`.
5. **Authorized redirect URIs**:
   - Click **+ Add URI**.
   - Enter: `https://developers.google.com/oauthplayground`
   - (Do not omit this, as it is needed to generate the refresh token in the next step).
6. Click **Create**.
7. A popup will display your **Client ID** and **Client Secret**. Copy both and save them securely.

---

## Step 5: Generate the Permanent Refresh Token via OAuth Playground

1. Go to the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. In the top right corner, click the **Gear Icon** (⚙️ OAuth 2.0 configuration).
3. Check the box **"Use your own OAuth credentials"**.
4. Paste your **OAuth Client ID** and **OAuth Client Secret** from Step 4.
5. In the left sidebar under **Step 1 Select & authorize APIs**:
   - Scroll down to **Gmail API v1**.
   - Check `https://mail.google.com/` (or `https://www.googleapis.com/auth/gmail.send`).
6. Click the blue **Authorize APIs** button.
7. You will be redirected to sign in with your Google account:
   - Choose the Gmail account that will send the emails.
   - If a warning screen appears saying *"Google hasn't verified this app"*, click **Advanced** &rarr; **Go to Landing Page Lead Dispatch (unsafe)**.
   - Click **Continue / Allow** to grant permission.
8. You will be redirected back to the OAuth Playground under **Step 2 Exchange authorization code for tokens**.
9. Click the blue button: **"Exchange authorization code for tokens"**.
10. Once exchanged, locate the **Refresh token** in the response panel:
    ```text
    Refresh token: 1//04rX...
    ```
11. Copy this value. This is your permanent `GOOGLE_REFRESH_TOKEN`.

---

## Step 6: Add to Project Environment Variables

Add these to your local `.env.local` and production deployment platform (Vercel, Railway, etc.):

```bash
GOOGLE_USER="your-sending-account@gmail.com"
GOOGLE_CLIENT_ID="1234567890-xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
GOOGLE_REFRESH_TOKEN="1//04rX..."
OWNER_EMAIL="inbox-to-receive-alerts@yourcompany.com"
```

---

## Troubleshooting Common OAuth2 Errors

### 1. `invalid_grant: Token has been expired or revoked`
- **Cause**: App is still in "Testing" mode on the OAuth consent screen, causing Google to revoke the token after 7 days.
- **Resolution**: In Google Cloud Console, click **Publish App** on the OAuth consent screen tab, then re-generate the refresh token once via OAuth Playground.

### 2. `redirect_uri_mismatch`
- **Cause**: The redirect URI `https://developers.google.com/oauthplayground` was not added to the Authorized Redirect URIs on the client credential.
- **Resolution**: Open the credential in Google Cloud Console &rarr; Credentials &rarr; add the exact URI without trailing slash.

### 3. `Failed to obtain Google access token`
- **Cause**: Client Secret or Refresh Token has a leading/trailing space or typo.
- **Resolution**: Re-check `.env` file for quotes or trailing spaces.
