# MyGlobalCFO Deployment Guide

## Issue Analysis

Your frontend at `https://tst.digitransglobal.com/myglobalcfo/` is receiving a 404 error when trying to register because of an incorrect backend URL configuration.

## Root Cause

The backend has `APIRouter(prefix="/api")` defined, which means all routes automatically get the `/api` prefix.

**❌ INCORRECT Configuration:**
```
REACT_APP_BACKEND_URL=https://progress-bar-repair-1.preview.emergentagent.com/api
```
This results in routes like: `https://progress-bar-repair-1.preview.emergentagent.com/api/api/auth/register` (double `/api`)

**✅ CORRECT Configuration:**
```
REACT_APP_BACKEND_URL=https://progress-bar-repair-1.preview.emergentagent.com
```
This results in routes like: `https://progress-bar-repair-1.preview.emergentagent.com/api/auth/register`

---

## Solution Steps

### 1️⃣ Update Frontend Environment Variable

Update your frontend deployment to use:
```bash
REACT_APP_BACKEND_URL=https://progress-bar-repair-1.preview.emergentagent.com
```

**Where to update:**
- If using Emergent: Update in the deployment settings/environment variables
- If using cPanel: Update the `.env` file in your build directory
- If using CI/CD: Update the environment variable in your deployment pipeline

### 2️⃣ CORS Configuration (Backend)

The backend `.env` file has been updated to explicitly allow your domain:

```bash
CORS_ORIGINS="https://tst.digitransglobal.com,http://localhost:3000,*"
```

**Important**: If your backend is deployed on Emergent preview environment, you need to ensure this environment variable is set there as well.

### 3️⃣ Verify Backend Routes

The following authentication routes are implemented and working:

✅ `POST /api/auth/register` - User registration
✅ `POST /api/auth/login` - User login  
✅ `POST /api/auth/forgot-password` - Password reset request
✅ `POST /api/auth/reset-password` - Reset password with token
✅ `GET /api/auth/verify-reset-token/{token}` - Verify reset token

---

## Testing the Fix

### Step 1: Update and Rebuild Frontend

1. Update your `.env.production` file:
```bash
REACT_APP_BACKEND_URL=https://progress-bar-repair-1.preview.emergentagent.com
PUBLIC_URL=/myglobalcfo
```

2. Rebuild the frontend:
```bash
cd /app/frontend
PUBLIC_URL=/myglobalcfo yarn build
```

3. Redeploy the build folder to cPanel

### Step 2: Test Registration

Open your browser console and try registering:

**Expected Request:**
```
POST https://progress-bar-repair-1.preview.emergentagent.com/api/auth/register
```

**Expected Response (201):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "User Name",
    "role": "tenant"
  }
}
```

### Step 3: Verify CORS Headers

Check the response headers for:
```
Access-Control-Allow-Origin: https://tst.digitransglobal.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *
```

---

## Registration Details

### Is Registration Enabled?
**✅ YES** - Registration is fully enabled and functional.

### First User Privilege
- The **first user** to register automatically becomes an **admin**
- Subsequent users are assigned the **tenant** role
- Admins can manage AI Advisor access and Entity Groups

### Registration Requirements
- Valid email address
- Password (minimum 8 characters recommended)
- Name

---

## Common Issues & Solutions

### Issue 1: Still Getting 404
**Cause**: Old frontend environment variable cached

**Solution**:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Verify the build was actually updated on the server

### Issue 2: CORS Errors
**Cause**: Backend CORS_ORIGINS not configured correctly

**Solution**:
- Ensure backend `.env` has: `CORS_ORIGINS="https://tst.digitransglobal.com,*"`
- Restart backend server after updating .env
- Check if Emergent preview environment has the env variable set

### Issue 3: OPTIONS Request Fails
**Cause**: Backend not responding to preflight requests

**Solution**:
- FastAPI automatically handles OPTIONS requests when CORS middleware is configured
- Verify CORS middleware is added: `app.add_middleware(CORSMiddleware, ...)`
- Check backend logs for any errors

---

## Backend Deployment Checklist

If you're deploying the backend to Emergent preview:

- [ ] Ensure `.env` file is properly uploaded
- [ ] Verify `CORS_ORIGINS` includes your frontend domain
- [ ] Check `MONGO_URL` points to correct database
- [ ] Verify `JWT_SECRET_KEY` is set to a secure value
- [ ] Test the `/api/health` endpoint (if available)
- [ ] Check backend logs for startup errors

---

## Frontend Deployment Checklist

For your cPanel deployment:

- [ ] `.env.production` has correct `REACT_APP_BACKEND_URL` (without `/api`)
- [ ] `PUBLIC_URL=/myglobalcfo` is set during build
- [ ] `.htaccess` file is in the build directory
- [ ] All static assets load correctly
- [ ] Browser console shows correct API URLs

---

## Quick Test Commands

### Test Backend Directly (using curl)
```bash
# Test OPTIONS (CORS preflight)
curl -X OPTIONS \
  https://progress-bar-repair-1.preview.emergentagent.com/api/auth/register \
  -H "Origin: https://tst.digitransglobal.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test Registration
curl -X POST \
  https://progress-bar-repair-1.preview.emergentagent.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'
```

### Check Response
- Look for `200 OK` or `201 Created` on successful registration
- Look for CORS headers in the response

---

## Support

If issues persist after following this guide:

1. Check backend logs on Emergent preview dashboard
2. Check browser Network tab for exact request URLs
3. Verify the frontend is actually using the updated build
4. Test backend directly using curl commands above

The backend routes are confirmed to be working. The issue is purely configuration-related with the URL paths.
