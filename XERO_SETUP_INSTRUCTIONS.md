# Xero OAuth Configuration Fix

## Issue
Getting "unauthorized_client - Invalid redirect_uri" error when connecting to Xero.

## Root Cause
The redirect URI in your code doesn't match what's registered in your Xero Developer app settings.

## Solution

### Step 1: Log into Xero Developer Portal
1. Go to https://developer.xero.com/app/manage
2. Sign in with your Xero account
3. Find your CFO Dashboard application

### Step 2: Update Redirect URI
1. Click on your app to edit it
2. Look for "OAuth 2.0 redirect URIs" or "Redirect URIs" section
3. Add this **exact** redirect URI:
   ```
   https://finviz-19.preview.emergentagent.com/api/integrations/xero/callback
   ```
4. Make sure there are no typos or extra spaces
5. Save the changes

### Step 3: Verify Client Type
Ensure your Xero app is configured as:
- **App Type**: Web App (Server-based application)
- **Auth Flow**: Authorization Code Grant

### Step 4: Copy Your Credentials
From the Xero Developer portal, copy:
- **Client ID** (should look like: `ABC123DEF456...`)
- **Client Secret** (should look like: `xyz789abc123...`)

### Step 5: Test the Connection
1. Return to the CFO Dashboard
2. Navigate to Integrations → ERP & Accounting
3. Click "Connect" on the Xero card
4. Enter your Client ID and Client Secret
5. Click "Connect Platform"
6. You should be redirected to Xero's authorization page

---

## Current Configuration

**Environment**: Production (Emergent Preview)
**Redirect URI**: `https://finviz-19.preview.emergentagent.com/api/integrations/xero/callback`
**Client Type**: Server-based Web Application

---

## Important Notes

1. **Exact Match Required**: The redirect URI must match **exactly** - including:
   - Protocol (https://)
   - Domain (cfo-dashboard-9.preview.emergentagent.com)
   - Path (/api/integrations/xero/callback)
   - No trailing slashes

2. **Multiple Redirect URIs**: You can add multiple redirect URIs in Xero if you need to support both:
   - Production: `https://finviz-19.preview.emergentagent.com/api/integrations/xero/callback`
   - Local Development: `http://localhost:8001/api/integrations/xero/callback`

3. **Changes Take Effect Immediately**: Once you save the redirect URI in Xero, it should work immediately.

---

## Troubleshooting

**Still getting the error after adding the redirect URI?**

1. **Double-check for typos**: Copy and paste the URI directly from this document
2. **Clear browser cache**: Sometimes OAuth errors are cached
3. **Try incognito/private browsing**: To rule out cookie/cache issues
4. **Verify app is active**: Make sure your Xero app is not in "draft" or "disabled" state
5. **Check scopes**: Ensure your app has the necessary scopes enabled:
   - `accounting.transactions`
   - `accounting.settings`
   - `offline_access`

**Error persists?**
Contact Xero Developer Support or check their documentation at: https://developer.xero.com/documentation/guides/oauth2/auth-flow/

---

## Summary

The .env file has been cleaned up and now has only one `XERO_REDIRECT_URI` entry. You need to add this exact redirect URI to your Xero Developer app settings to resolve the "Invalid redirect_uri" error.
