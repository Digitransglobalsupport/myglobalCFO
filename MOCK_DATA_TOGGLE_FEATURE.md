# Mock Data Toggle Feature

## Overview
A toggle button has been added to the CFO Command Centre dashboard that allows users to switch between mocked data and real data for the entire website.

## Location
The toggle button is located in the dashboard header, to the left of the Entity dropdown selector.

## Visual Appearance
- **Mock ON** (default): Purple button with 🎭 emoji and "Mock ON" text
- **Mock OFF**: Outlined button with 📊 emoji and "Mock OFF" text

## Functionality

### Frontend Implementation
- **File**: `/app/frontend/src/pages/DashboardLayout.jsx`
- **State Management**: Uses React `useState` with localStorage persistence
- **Default**: Mocked data is ON by default
- **Persistence**: The toggle state is saved in localStorage as `useMockedData`
- **Context Propagation**: The `useMockedData` state is passed to all child components via React Router's `<Outlet context={...} />`

### Backend Implementation

#### API Endpoints Updated:
1. **CFO Dashboard Overview** (`/api/cfo/dashboard/overview`)
   - File: `/app/backend/routes/cfo_dashboard.py`
   - Parameter: `use_mocked_data: bool = True`

2. **Main Dashboard** (`/api/dashboard/{company_id}`)
   - File: `/app/backend/server.py`
   - Parameter: `use_mocked_data: bool = True`

#### Service Layer Updates:
File: `/app/backend/services/cfo_dashboard_service.py`

All service methods now accept `use_mocked_data` parameter:
- `get_global_liquidity_strip(user_id, use_mocked_data)`
- `get_profitability_copa(user_id, use_mocked_data)`
- `get_operational_efficiency(user_id, use_mocked_data)`
- `get_strategic_whatif(user_id, use_mocked_data)`
- `get_sync_status(user_id, use_mocked_data)`

### Behavior

#### When Mock Data is ON (default):
- Returns predefined mock data immediately
- Skips ERP integrations and database queries
- Faster response times
- Useful for demos and testing

#### When Mock Data is OFF:
- Attempts to fetch real data from:
  - Connected ERP systems
  - Database entities
  - Live integrations
- Falls back to mock data if no real data is available
- Data source is indicated in the response (e.g., `"data_source": "real_data"` or `"data_source": "mocked"`)

## Testing

### Backend API Test:
```bash
# Test with mocked data
curl -X GET "http://localhost:8001/api/cfo/dashboard/overview?user_id=test-user&use_mocked_data=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test with real data
curl -X GET "http://localhost:8001/api/cfo/dashboard/overview?user_id=test-user&use_mocked_data=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Test:
1. Log in to the dashboard
2. Locate the toggle button in the header (left of Entity dropdown)
3. Click to toggle between "🎭 Mock ON" and "📊 Mock OFF"
4. Observe that the dashboard data updates accordingly
5. Refresh the page - the toggle state should be persisted

## Data Source Indicators

The backend now includes `data_source` fields in responses to indicate the origin of data:
- `"mocked"` - Predefined mock data
- `"real_data"` - Live data from database/entities
- `"live_erp"` - Data from connected ERP systems
- `"fallback_mock"` - Mock data because no real data was available
- `"internal_mock"` - Mock data from internal generation logic

## Future Enhancements
- Add a visual indicator on the dashboard showing current data source
- Implement data freshness timestamps
- Add analytics to track mock vs. real data usage
- Create admin panel to manage mock data templates
