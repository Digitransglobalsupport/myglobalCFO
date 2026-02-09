# Multi-Tenant Reseller Architecture - Enforcement Rules

> **MANDATORY**: All developers must follow these rules. No exceptions.

---

## 1. Backend Isolation (CRITICAL)

### Rule: Every API endpoint MUST use `get_data_filter()`

```python
# ❌ FORBIDDEN - Naked query
@api_router.get("/transactions")
async def get_transactions(current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find({}).to_list(100)  # NO!
    return transactions

# ✅ REQUIRED - Scoped by org/workspace
@api_router.get("/transactions")
async def get_transactions(current_user: dict = Depends(get_current_user)):
    data_filter = await get_data_filter(current_user)
    transactions = await db.transactions.find(data_filter, {"_id": 0}).to_list(100)
    return transactions
```

### When Creating Records - Always Include Context

```python
# ✅ REQUIRED - Include org_id, workspace_id, user_id
new_record = {
    "id": str(uuid.uuid4()),
    "org_id": current_user.get('active_org_id'),
    "workspace_id": current_user.get('active_workspace_id'),
    "user_id": current_user['id'],  # For audit trail
    # ... other fields
}
```

---

## 2. Frontend State Management

### Rule: All data views MUST be wrapped in `WorkspaceGuard`

```jsx
// ❌ FORBIDDEN - Unguarded view
function DashboardPage() {
  const { data } = useFetch('/api/dashboard');
  return <Dashboard data={data} />;
}

// ✅ REQUIRED - Guarded view
import { WorkspaceGuard } from '@/shared';

function DashboardPage() {
  return (
    <WorkspaceGuard>
      <DashboardContent />
    </WorkspaceGuard>
  );
}
```

### Rule: Use `useWorkspace` for context

```jsx
// ✅ REQUIRED - Always get workspace context
import { useWorkspace } from '@/shared';

function MyComponent() {
  const { activeWorkspace, activeOrg, isSyncing } = useWorkspace();
  
  // Show loading during cross-tab sync
  if (isSyncing) return <SyncingIndicator />;
  
  return <Content workspace={activeWorkspace} />;
}
```

---

## 3. Shared Library Structure

### Location: `/app/frontend/src/shared-library/`

```
/app/frontend/src/shared-library/
├── index.js                    # Central exports
├── components/
│   ├── charts/
│   │   ├── LineChart.jsx
│   │   ├── BarChart.jsx
│   │   └── PieChart.jsx
│   ├── tables/
│   │   ├── DataTable.jsx
│   │   └── SortableTable.jsx
│   ├── cards/
│   │   ├── StatCard.jsx
│   │   ├── MetricCard.jsx
│   │   └── KPICard.jsx
│   └── layout/
│       ├── PageHeader.jsx
│       └── SectionContainer.jsx
├── hooks/
│   ├── useDataFetch.js         # Workspace-aware data fetching
│   └── usePlanFeatures.js      # Feature gating hook
└── utils/
    ├── formatters.js           # Currency, date formatters
    └── validators.js           # Input validation
```

### Import Pattern

```jsx
// ✅ REQUIRED - Import from shared-library
import { 
  LineChart, 
  DataTable, 
  StatCard,
  useDataFetch 
} from '@/shared-library';
```

---

## 4. Feature Gating (Premium Features)

### Backend: Check plan before executing

```python
# ✅ REQUIRED - Check feature access
from org_routes import check_feature_access

@api_router.post("/ai/strategic-analysis")
async def run_strategic_analysis(
    data: AnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    # Check plan allows this feature
    has_access = await check_plan_feature(current_user, "strategic_capital")
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Strategic Capital requires Professional plan or higher"
        )
    
    # Proceed with feature...
```

### Frontend: Gate UI rendering

```jsx
// ✅ REQUIRED - Gate premium UI
import { FeatureGate } from '@/shared-library';

function StrategicCapitalPage() {
  return (
    <FeatureGate 
      feature="strategic_capital"
      fallback={<UpgradePrompt plan="Professional" />}
    >
      <StrategicCapitalContent />
    </FeatureGate>
  );
}
```

---

## 5. Cross-Tab Synchronization

### Rule: App MUST react to workspace changes in other tabs

```jsx
// ✅ REQUIRED - App root setup
import { WorkspaceProvider, WorkspaceSyncIndicator } from '@/shared';

function App() {
  return (
    <WorkspaceProvider
      onWorkspaceChange={(id, workspace) => {
        // Invalidate cached data
        queryClient.invalidateQueries();
      }}
      onAuthRequired={() => {
        window.location.href = '/login';
      }}
    >
      <Router>
        <AppRoutes />
      </Router>
      <WorkspaceSyncIndicator />
    </WorkspaceProvider>
  );
}
```

---

## 6. Checklist Before PR

- [ ] All queries use `get_data_filter()`
- [ ] New records include `org_id`, `workspace_id`, `user_id`
- [ ] Views wrapped in `WorkspaceGuard`
- [ ] Premium features check `plan_id`
- [ ] Reusable components in `shared-library`
- [ ] No hardcoded user/org IDs

---

## Quick Reference

| Action | Backend | Frontend |
|--------|---------|----------|
| Query data | `get_data_filter(current_user)` | `useDataFetch()` |
| Create record | Include `org_id`, `workspace_id` | N/A |
| Check feature | `check_plan_feature()` | `<FeatureGate>` |
| Get context | `current_user['active_workspace_id']` | `useWorkspace()` |
| Guard view | N/A | `<WorkspaceGuard>` |
