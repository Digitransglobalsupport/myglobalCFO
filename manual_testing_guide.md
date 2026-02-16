# Multi-Currency Display Manual Testing Guide

## Overview
This guide provides step-by-step instructions to manually verify the multi-currency display functionality across the Command Centre.

## Prerequisites
- Access to: https://saas-migration-3.preview.emergentagent.com
- Test credentials: testuser@example.com / Test123!

## Test Scenarios

### Scenario 1: Create JPY Entity and Verify Currency Display

1. **Login to Application**
   - Navigate to https://saas-migration-3.preview.emergentagent.com
   - Login with: testuser@example.com / Test123!

2. **Create JPY Entity**
   - Click "Add Entity" button
   - Fill in:
     - Name: "Tokyo Branch"
     - Country: "Japan" 
     - Currency: "JPY"
   - Click "Create Entity"

3. **Navigate to Command Centre**
   - Click "📊 FP&A" in navigation
   - Navigate to Command Centre (/dashboard/fpa/command-centre)

4. **Select JPY Entity**
   - Use entity selector dropdown
   - Select "Tokyo Branch"
   - Wait for page to refresh

5. **Verify JPY Symbols (¥) Display**
   - **KPI Grid**: Check Revenue, EBITDA, Cash Balance values show ¥ symbol
   - **Strategic What-If Quadrant**:
     - Proposed Assets NPV should show ¥ (not $)
     - 13-Week Cash Forecast Y-axis should show ¥
     - Legend values (expected, optimistic, pessimistic) should show ¥
   - **Governance, Risk & Strategic Capital Quadrant**:
     - AI Risk Alerts amounts should show ¥
     - AR Aging chart Y-axis and values should show ¥
     - Capital Sourcing amounts should show ¥

### Scenario 2: Create EUR Entity and Verify Currency Switching

1. **Create EUR Entity**
   - Click "Add Entity" button
   - Fill in:
     - Name: "Paris Office"
     - Country: "France"
     - Currency: "EUR"
   - Click "Create Entity"

2. **Switch to EUR Entity**
   - Use entity selector dropdown
   - Select "Paris Office"
   - Wait for page to refresh

3. **Verify EUR Symbols (€) Display**
   - **All previous JPY locations should now show € instead of ¥**
   - Verify no ¥ symbols remain visible
   - Verify no hardcoded $ symbols appear

### Scenario 3: Verify No Hardcoded Currency Symbols

1. **Check for Hardcoded Dollars**
   - While viewing EUR or JPY entity
   - Scan all monetary values on the page
   - Ensure no $ symbols appear (except for legitimate USD entities)

2. **Test Currency Consistency**
   - Switch between different currency entities
   - Verify all monetary values update consistently
   - Check that currency symbols match the selected entity

## Expected Results

### ✅ Success Criteria
- All monetary values display the correct currency symbol (¥ for JPY, € for EUR)
- Currency symbols update dynamically when switching entities
- No hardcoded $ symbols appear when viewing non-USD entities
- Currency formatting is consistent across all quadrants

### ❌ Failure Indicators
- $ symbols appear when viewing JPY or EUR entities
- Currency symbols don't update when switching entities
- Mixed currency symbols on the same page
- Missing currency symbols (showing raw numbers)

## Test Results Template

```
### Manual Test Results - [Date/Time]

**Scenario 1: JPY Entity Currency Display**
- KPI Grid JPY symbols: [ ] Pass [ ] Fail
- Strategic What-If JPY symbols: [ ] Pass [ ] Fail  
- Governance Risk JPY symbols: [ ] Pass [ ] Fail

**Scenario 2: EUR Entity Currency Display**
- KPI Grid EUR symbols: [ ] Pass [ ] Fail
- Strategic What-If EUR symbols: [ ] Pass [ ] Fail
- Governance Risk EUR symbols: [ ] Pass [ ] Fail

**Scenario 3: No Hardcoded Symbols**
- No hardcoded $ symbols: [ ] Pass [ ] Fail
- Currency switching works: [ ] Pass [ ] Fail

**Overall Result: [ ] All Pass [ ] Some Failures**

**Notes:**
[Add any specific observations or issues found]
```

## Troubleshooting

### If Currency Symbols Don't Appear
1. Check browser console for JavaScript errors
2. Verify entity was created with correct currency
3. Refresh the page and try again
4. Check if mock data is enabled (should show currency symbols)

### If Switching Doesn't Work
1. Ensure you're selecting different entities with different currencies
2. Wait for page to fully load after switching
3. Check that the entity selector shows the correct selection

## Backend API Verification

If frontend issues are found, verify backend is working:

```bash
# Test currency endpoints
curl "https://saas-migration-3.preview.emergentagent.com/api/reference/currencies"

# Test dashboard currency field (requires auth token)
curl "https://saas-migration-3.preview.emergentagent.com/api/cfo/dashboard/overview?company_id=<COMPANY_ID>&use_mocked_data=true" \
  -H "Authorization: Bearer <TOKEN>"
```

## Contact
If issues are found during manual testing, report with:
- Specific steps that failed
- Screenshots of incorrect currency display
- Browser and version used
- Any console errors observed