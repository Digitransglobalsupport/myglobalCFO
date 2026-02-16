# Shared Integrations Migration Guide
## Retrofitting `realtime-pmo` to Use Shared MongoDB and Integration Components

---

## Overview

This guide explains how to connect the `realtime-pmo` project to the shared MongoDB database and integration system already configured in `realtime-finance`.

**Architecture:**
```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  digitrans-global   │     │  realtime-finance   │     │   realtime-pmo      │
│  (Corporate Site)   │     │  (CFO Toolkit)      │     │  (PMO App)          │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     ▼
                        ┌─────────────────────────┐
                        │   MongoDB Atlas         │
                        │   (Single Source)       │
                        │                         │
                        │   Collections:          │
                        │   - users               │
                        │   - apps                │
                        │   - shared_integrations │
                        │   - erp_accounts        │
                        └─────────────────────────┘
```

---

## Step 1: Environment Variables

Add these to your `realtime-pmo` `.env` file:

### For React (CRA) projects:
```env
# Backend URL - use relative path for production
REACT_APP_BACKEND_URL=
REACT_APP_APP_ID=realtime-pmo
```

### For Next.js projects:
```env
# Backend URL - use relative path for production  
NEXT_PUBLIC_BACKEND_URL=
NEXT_PUBLIC_APP_ID=realtime-pmo
```

### Backend `.env`:
```env
# IMPORTANT: Use the SAME MongoDB URI as realtime-finance
MONGO_URL=mongodb+srv://it_db_user:5q4Pj9mxFz9rub1v@digitrans-global.j934ero.mongodb.net/?appName=Digitrans-Global
DB_NAME=myglobalcfo
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

---

## Step 2: Copy Shared Files

Copy these files from `realtime-finance` to `realtime-pmo`:

### Backend Files:
```
/app/backend/shared_schema.py       → Copy to your backend
/app/backend/shared_routes.py       → Copy to your backend (reference only)
```

### Frontend Files (create this folder structure):
```
/app/frontend/src/shared/
├── hooks/
│   └── useIntegrations.js          → The main hook
└── components/
    └── SharedIntegrationsPanel.jsx → Drop-in integrations UI
```

---

## Step 3: Backend Integration

### Option A: If your backend is FastAPI (like realtime-finance)

Add the shared routes to your `server.py`:

```python
# At the top of server.py
from shared_schema import (
    RegisteredApp, RegisteredAppCreate, RegisteredAppUpdate,
    SharedIntegration, SharedIntegrationCreate, SharedIntegrationUpdate,
    INTEGRATION_CATALOG, get_initial_apps_seed_data
)

# Then copy the shared routes from realtime-finance/server.py
# Look for section: "# ======================= SHARED MULTI-APP ROUTES ======================="
```

### Option B: If your backend is Express/Node.js

Create equivalent routes in your Express app:

```javascript
// shared-routes.js
const express = require('express');
const router = express.Router();

// GET /api/shared/apps/:app_id
router.get('/apps/:app_id', async (req, res) => {
  const app = await db.collection('apps').findOne(
    { app_id: req.params.app_id },
    { projection: { _id: 0 } }
  );
  if (!app) return res.status(404).json({ detail: 'App not registered' });
  res.json(app);
});

// GET /api/shared/integrations/user
router.get('/integrations/user', authMiddleware, async (req, res) => {
  const { app_id } = req.query;
  let integrations = await db.collection('shared_integrations')
    .find({ user_id: req.user.id }, { projection: { _id: 0 } })
    .toArray();
  
  if (app_id) {
    const app = await db.collection('apps').findOne({ app_id });
    if (app) {
      const enabled = app.enabled_integrations || [];
      integrations = integrations.filter(i => enabled.includes(i.platform));
    }
  }
  res.json(integrations);
});

// POST /api/shared/integrations
router.post('/integrations', authMiddleware, async (req, res) => {
  const { platform, source_app_id, client_id, client_secret, api_key } = req.body;
  
  const existing = await db.collection('shared_integrations').findOne({
    user_id: req.user.id,
    platform
  });
  if (existing) {
    return res.status(400).json({ detail: `Integration for ${platform} already exists` });
  }
  
  const sourceApp = await db.collection('apps').findOne({ app_id: source_app_id });
  
  const integration = {
    id: uuid(),
    user_id: req.user.id,
    platform,
    source_app_id,
    source_app_name: sourceApp?.app_name || source_app_id,
    client_id,
    client_secret,
    api_key,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  await db.collection('shared_integrations').insertOne(integration);
  
  // Remove sensitive fields
  delete integration.client_secret;
  delete integration.api_key;
  delete integration._id;
  
  res.json(integration);
});

module.exports = router;
```

---

## Step 4: Frontend Integration

### Using the Shared Hook

```jsx
// In any component
import { useIntegrations } from '@/shared/hooks/useIntegrations';

function MyComponent() {
  const { 
    integrations,      // User's integrations
    appConfig,         // This app's config (enabled integrations)
    catalog,           // Available integrations for this app
    isConnected,       // Check if platform is connected
    connectIntegration,
    disconnectIntegration,
    syncIntegration,
    loading 
  } = useIntegrations(authToken);

  // Check if Xero is connected
  if (isConnected('xero')) {
    // User has Xero connected (maybe from realtime-finance)
  }

  // Connect a new integration
  const handleConnect = async () => {
    const result = await connectIntegration('quickbooks', {
      client_id: '...',
      client_secret: '...'
    });
    // This will be visible in BOTH realtime-finance and realtime-pmo
  };
}
```

### Using the Drop-in Panel

```jsx
// Full integrations page
import { SharedIntegrationsPanel } from '@/shared/components/SharedIntegrationsPanel';

function IntegrationsPage() {
  const { token } = useAuth();
  
  return (
    <SharedIntegrationsPanel 
      authToken={token}
      showERPAccounts={true}
      onIntegrationChange={(action, platform) => {
        console.log(`${platform} was ${action}`);
      }}
    />
  );
}
```

---

## Step 5: Verify Shared Data

After setup, test that data is shared:

1. **Login to realtime-finance** with `test@example.com` / `Test123!`
2. **Connect an integration** (e.g., Xero)
3. **Login to realtime-pmo** with the SAME credentials
4. **Verify Xero shows as connected** (with "Connected via Realtime Finance")

---

## API Reference

### Endpoints (all prefixed with `/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shared/apps` | List all registered apps |
| GET | `/shared/apps/{app_id}` | Get app config |
| POST | `/shared/apps/seed` | Initialize apps (admin) |
| GET | `/shared/integrations/catalog` | Full integration catalog |
| GET | `/shared/integrations/catalog/{app_id}` | App-specific catalog |
| GET | `/shared/integrations/user?app_id=X` | User's integrations |
| POST | `/shared/integrations` | Create integration |
| PUT | `/shared/integrations/{id}` | Update integration |
| DELETE | `/shared/integrations/{id}` | Delete integration |
| POST | `/shared/integrations/{id}/sync?app_id=X` | Sync integration |

---

## Database Collections

### `apps` Collection
```json
{
  "id": "uuid",
  "app_id": "realtime-pmo",
  "app_name": "Realtime PMO",
  "enabled_integrations": ["xero", "quickbooks", "jira", "asana"],
  "enabled_features": ["dashboard", "projects"],
  "status": "active"
}
```

### `shared_integrations` Collection
```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "platform": "xero",
  "status": "connected",
  "source_app_id": "realtime-finance",
  "source_app_name": "Realtime Finance",
  "client_id": "...",
  "last_sync_at": "2025-01-27T..."
}
```

---

## Troubleshooting

### Integration not showing in PMO app
1. Check that `realtime-pmo` is registered in the `apps` collection
2. Verify the platform is in `enabled_integrations` for realtime-pmo
3. Ensure both apps use the SAME `MONGO_URL`

### Authentication not working across apps
1. Both apps MUST use the same `JWT_SECRET`
2. Both apps MUST connect to the same `users` collection

### "App not registered" error
Run the seed endpoint from realtime-finance:
```bash
curl -X POST "https://your-api/api/shared/apps/seed" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Files Checklist

Copy these from realtime-finance to realtime-pmo:

- [ ] `/app/backend/shared_schema.py`
- [ ] `/app/frontend/src/shared/hooks/useIntegrations.js`
- [ ] `/app/frontend/src/shared/components/SharedIntegrationsPanel.jsx`
- [ ] Update `.env` files with correct `APP_ID` and `MONGO_URL`
- [ ] Add shared routes to backend (or create Express equivalent)

---

## Questions?

The apps collection is already seeded with:
- `digitrans-global` - Corporate site (no integrations)
- `realtime-finance` - CFO Toolkit (ERP + Banking + Email)
- `realtime-pmo` - PMO App (ALL integrations including Jira, Asana, Monday)

---

## Cross-Tab Workspace Synchronization

### The Problem
When a user has multiple browser tabs open:
- Tab A: Finance App showing Workspace X data
- Tab B: PMO App - user switches to Workspace Y

Without sync, Tab A would continue showing Workspace X data, causing **data cross-contamination**.

### The Solution: useWorkspace Hook

The `useWorkspace` hook listens for `localStorage` changes across tabs:

```jsx
// In your App.js or root component
import { WorkspaceProvider, WorkspaceSyncIndicator } from '@/shared';

function App() {
  const handleAuthRequired = () => {
    // Redirect to login
    window.location.href = '/login';
  };
  
  const handleWorkspaceChange = (workspaceId, workspace) => {
    // Optional: Force data refresh
    console.log('Workspace changed to:', workspace?.name);
  };
  
  return (
    <WorkspaceProvider 
      onAuthRequired={handleAuthRequired}
      onWorkspaceChange={handleWorkspaceChange}
    >
      <YourApp />
      <WorkspaceSyncIndicator /> {/* Shows sync status */}
    </WorkspaceProvider>
  );
}
```

### How It Works

1. **Storage Event Listener**: Listens for changes to `token` and `active_workspace_id` in localStorage
2. **JWT Comparison**: Compares `workspace_id` claim in old vs new token
3. **Auto-Sync**: If workspace changed, triggers state refresh
4. **Token Refresh**: Calls `/api/auth/refresh-token` to get updated JWT with new workspace context

### Files to Copy

```
/app/frontend/src/shared/
├── hooks/
│   ├── useIntegrations.js    # Integration management
│   └── useWorkspace.js       # Workspace sync (NEW)
├── components/
│   ├── SharedIntegrationsPanel.jsx
│   └── WorkspaceSwitcher.jsx # Workspace UI (NEW)
└── index.js                  # Updated exports
```

### Key Features

| Feature | Description |
|---------|-------------|
| Cross-tab sync | Detects workspace changes in other tabs |
| Token refresh | Auto-refreshes JWT with new workspace context |
| Loading states | Shows sync indicator during transitions |
| Guard component | Prevents rendering until workspace is confirmed |

### Example: Protecting a Page

```jsx
import { WorkspaceGuard } from '@/shared';

function DashboardPage() {
  return (
    <WorkspaceGuard>
      {/* Only renders when workspace is confirmed */}
      <DashboardContent />
    </WorkspaceGuard>
  );
}
```

### Example: Workspace Switcher

```jsx
import { WorkspaceSwitcher } from '@/shared';

function Header() {
  return (
    <nav>
      <WorkspaceSwitcher 
        showOrgName={true}
        showCreateButton={true}
        onCreateWorkspace={() => setShowCreateModal(true)}
      />
    </nav>
  );
}
```
