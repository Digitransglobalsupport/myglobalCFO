# 🔧 URGENT FIX: Registration 404 Error

## 🎯 The Problem

Your frontend at `https://tst.digitransglobal.com/myglobalcfo/` cannot register users because:

**Current (Wrong) Configuration:**
```
REACT_APP_BACKEND_URL=https://digitrans-web-fix.preview.emergentagent.com/api
```

This causes your frontend to call:
```
https://digitrans-web-fix.preview.emergentagent.com/api/api/auth/register
                                            ↑    ↑
                                         from env  from code
```

Result: **404 Not Found** (double `/api` in the path)

---

## ✅ The Solution

### Fix #1: Update Frontend Environment Variable

**Change from:**
```bash
REACT_APP_BACKEND_URL=https://digitrans-web-fix.preview.emergentagent.com/api
```

**Change to:**
```bash
REACT_APP_BACKEND_URL=https://digitrans-web-fix.preview.emergentagent.com
```

### Fix #2: Rebuild and Redeploy Frontend

```bash
cd /app/frontend

# Set the correct backend URL
echo "REACT_APP_BACKEND_URL=https://digitrans-web-fix.preview.emergentagent.com" > .env.production
echo "PUBLIC_URL=/myglobalcfo" >> .env.production

# Build
PUBLIC_URL=/myglobalcfo yarn build

# The build folder is now ready for deployment to cPanel
```

### Fix #3: Ensure Backend CORS (Already Done)

Backend `.env` has been updated to include your domain:
```bash
CORS_ORIGINS="https://tst.digitransglobal.com,http://localhost:3000,*"
```

**Important:** If backend is on Emergent, set this environment variable there too.

---

## 📋 Answers to Your Questions

### 1️⃣ Is /api/auth/register implemented?
**✅ YES** - Fully implemented and tested

```python
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Creates user, first user becomes admin
    # Returns JWT token and user data
```

### 2️⃣ Is CORS configured for my origin?
**✅ YES** - Updated to explicitly allow `https://tst.digitransglobal.com`

```python
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["https://tst.digitransglobal.com", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3️⃣ Is registration enabled?
**✅ YES** - Registration is fully enabled

- First user automatically becomes **admin**
- Subsequent users get **tenant** role
- Password validation included
- Email uniqueness enforced

---

## 🧪 Testing the Fix

### Option 1: Use the Test Script

```bash
cd /app
./test-backend-connection.sh
```

This will test:
- CORS preflight (OPTIONS)
- Registration endpoint
- Login endpoint

### Option 2: Manual curl Test

```bash
# Test CORS Preflight
curl -X OPTIONS \
  https://digitrans-web-fix.preview.emergentagent.com/api/auth/register \
  -H "Origin: https://tst.digitransglobal.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test Registration (should work after fix)
curl -X POST \
  https://digitrans-web-fix.preview.emergentagent.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourtest@example.com",
    "password": "SecurePass123!",
    "name": "Your Name"
  }'
```

**Expected Success Response (201 or 200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "yourtest@example.com",
    "name": "Your Name",
    "role": "admin"
  }
}
```

---

## 🎬 Step-by-Step Action Plan

1. **Update Frontend Configuration**
   ```bash
   # In your frontend deployment
   REACT_APP_BACKEND_URL=https://digitrans-web-fix.preview.emergentagent.com
   ```

2. **Rebuild Frontend**
   ```bash
   cd /app/frontend
   PUBLIC_URL=/myglobalcfo yarn build
   ```

3. **Upload to cPanel**
   - Upload entire `build` folder contents
   - Ensure `.htaccess` is included
   - Clear browser cache

4. **Test Registration**
   - Open: https://tst.digitransglobal.com/myglobalcfo/
   - Click "Sign Up"
   - Register with valid email
   - Should succeed with 200/201 response

5. **Verify in Browser Console**
   - Open DevTools → Network tab
   - Should see: `POST https://digitrans-web-fix.preview.emergentagent.com/api/auth/register`
   - NOT: `...com/api/api/auth/register`

---

## 🚨 If Still Not Working

### Check 1: Browser Cache
```
Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Check 2: Verify Build Updated
```bash
# Check the built JavaScript files contain correct URL
grep -r "mycfo-ai.preview.emergentagent.com/api" /app/frontend/build/static/js/

# Should NOT find double /api/api
```

### Check 3: Backend Environment
- Ensure Emergent preview has `CORS_ORIGINS` env variable set
- Restart backend after setting environment variables

### Check 4: Network Tab Analysis
- Open browser DevTools
- Go to Network tab
- Try to register
- Check the actual URL being called
- Check response status and headers

---

## 📞 Quick Reference

| Item | Current (Wrong) | Fixed (Correct) |
|------|----------------|-----------------|
| Backend URL | `...com/api` | `...com` (no /api) |
| Full Register Path | `...com/api/api/auth/register` | `...com/api/auth/register` |
| CORS Origins | `*` | `https://tst.digitransglobal.com,*` |
| Registration Status | Enabled ✅ | Enabled ✅ |
| First User Role | admin | admin |
| Subsequent Users | tenant | tenant |

---

## 💡 Why This Happened

The backend code has:
```python
api_router = APIRouter(prefix="/api")
```

This **automatically** adds `/api` to all routes. So when you define:
```python
@api_router.post("/auth/register")
```

The **actual** route becomes: `/api/auth/register`

If you set `REACT_APP_BACKEND_URL=...com/api`, your frontend does:
```javascript
axios.post(`${REACT_APP_BACKEND_URL}/auth/register`)
//          ↓
// ...com/api + /auth/register = ...com/api/auth/register ✅ CORRECT
```

But with the App.js code doing:
```javascript
export const API = `${BACKEND_URL}/api`;
//                                   ↑
//                            adds /api here

axios.post(`${API}/auth/register`)
//          ↓
// ...com/api + /api + /auth/register = ...com/api/api/auth/register ❌ WRONG
```

**Solution:** Remove `/api` from `REACT_APP_BACKEND_URL`

---

This fix will make your registration work immediately! 🎉
