# Database Schema Documentation
## MyGlobalCFO - Database Architecture

### Overview
This document describes the database schema for MyGlobalCFO, a multi-entity, multi-currency financial management platform. The system uses MongoDB as its primary database and follows a document-oriented data model.

---

## Table of Contents
1. [Entity Relationships](#entity-relationships)
2. [Collections Schema](#collections-schema)
3. [Currency System](#currency-system)
4. [Data Flow & Conversion Logic](#data-flow--conversion-logic)
5. [Real-Time Sync Architecture](#real-time-sync-architecture)
6. [Migration & Seeding](#migration--seeding)

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENTITY HIERARCHY                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐         ┌─────────────────┐                      │
│   │    Users    │────────▶│    Companies    │                      │
│   │   (owners)  │  1:N    │   (entities)    │                      │
│   └─────────────┘         └────────┬────────┘                      │
│                                    │                                │
│                           ┌────────┴────────┐                      │
│                           │                 │                       │
│                    ┌──────▼──────┐  ┌───────▼───────┐              │
│                    │ Transactions │  │ Entity Groups │              │
│                    │ (financial)  │  │  (regional)   │              │
│                    └──────┬───────┘  └───────────────┘              │
│                           │                                         │
│                    ┌──────▼──────┐                                  │
│                    │  Currencies │ (lookup)                         │
│                    │   (master)  │                                  │
│                    └─────────────┘                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Relationship Descriptions

| Relationship | Type | Description |
|-------------|------|-------------|
| Users → Companies | 1:N | One user can own multiple companies/entities |
| Companies → Transactions | 1:N | Each company has multiple transactions |
| Companies → Currencies | N:1 | Each company has one base currency (from Currency master) |
| Companies → Entity Groups | N:N | Companies can belong to multiple regional groups |
| Transactions → Currencies | N:2 | Each transaction stores both transaction_currency and reporting_currency |

---

## Collections Schema

### 1. Users Collection
```javascript
{
  "_id": ObjectId,
  "id": String (UUID),           // Application ID
  "email": String (unique),
  "password": String (hashed),
  "name": String,
  "role": String,                // "admin" | "user" | "viewer"
  "ai_advisor_access": Boolean,
  "created_at": ISODate
}
```

### 2. Companies Collection (Entities)
```javascript
{
  "_id": ObjectId,
  "id": String (UUID),
  "user_id": String,             // FK to Users.id
  "name": String,
  "country": String,             // From Countries master data
  "country_code": String,        // ISO 3166-1 alpha-3
  "currency": String,            // ISO 4217 code (e.g., "GBP", "USD")
  "global_region": String,       // "APAC" | "EMEA" | "Americas"
  "company_type": String,        // "standalone" | "topco" | "subsidiary"
  "parent_company_id": String,   // FK to parent company (if subsidiary)
  "reporting_currency": String,  // Group reporting currency for consolidation
  "created_at": ISODate
}
```

### 3. Transactions Collection
```javascript
{
  "_id": ObjectId,
  "id": String (UUID),
  "company_id": String,          // FK to Companies.id
  "type": String,                // "income" | "expense" | "transfer"
  "category": String,
  "description": String,
  "amount": Number,              // Amount in transaction_currency
  "transaction_currency": String,// ISO 4217 - Currency of the transaction
  "reporting_currency": String,  // ISO 4217 - Group currency for consolidation
  "reporting_amount": Number,    // Amount converted to reporting_currency
  "fx_rate": Number,             // Exchange rate at transaction time
  "date": ISODate,
  "status": String,              // "pending" | "reconciled" | "matched"
  "created_at": ISODate
}
```

### 4. Currencies Collection (Master Data)
```javascript
{
  "_id": ObjectId,
  "code": String (unique),       // ISO 4217 code (e.g., "GBP")
  "name": String,                // Full name (e.g., "British Pound")
  "symbol": String,              // Symbol (e.g., "£")
  "decimal_places": Number,      // Typically 2
  "is_active": Boolean
}
```

### 5. Countries Collection (Master Data)
```javascript
{
  "_id": ObjectId,
  "name": String,
  "code": String (unique),       // ISO 3166-1 alpha-3 (e.g., "GBR")
  "region": String,              // "APAC" | "EMEA" | "Americas" | "Antarctica & Remote"
  "default_currency": String     // ISO 4217 code
}
```

### 6. Entity Groups Collection
```javascript
{
  "_id": ObjectId,
  "id": String (UUID),
  "name": String,
  "description": String,
  "user_id": String,
  "entity_ids": [String],        // Array of company IDs
  "reporting_currency": String,  // Group reporting currency
  "created_at": ISODate
}
```

### 7. User Preferences Collection
```javascript
{
  "_id": ObjectId,
  "user_id": String,
  "consolidated_currency": String,  // Default reporting currency
  "theme": String,
  "kpi_config": Object,
  "updated_at": ISODate
}
```

---

## Currency System

### Currency Lookup Table Structure
The currencies collection serves as the **Single Source of Truth** for all currency-related operations.

```javascript
// Example Currency Document
{
  "code": "GBP",
  "name": "British Pound",
  "symbol": "£",
  "decimal_places": 2,
  "is_active": true
}
```

### Currency-Entity Relationship
```
┌─────────────────┐         ┌─────────────────┐
│    Company      │         │   Currencies    │
│                 │         │   (Master)      │
│  currency: GBP ─┼────────▶│  code: GBP      │
│                 │   N:1   │  symbol: £      │
└─────────────────┘         └─────────────────┘
```

**Key Points:**
- Each Company has a `currency` field referencing the Currencies master table
- The `symbol` is fetched from Currencies for UI display
- All monetary UI elements use the currency's symbol dynamically

---

## Data Flow & Conversion Logic

### Transaction Currency Flow
```
User Input (Local Currency)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│            TRANSACTION CREATION                        │
│                                                        │
│  1. User enters amount in LOCAL currency               │
│  2. System stores:                                     │
│     - amount: Original value                           │
│     - transaction_currency: Local currency code        │
│     - fx_rate: Current exchange rate                   │
│     - reporting_amount: amount × fx_rate               │
│     - reporting_currency: Group currency               │
│                                                        │
└───────────────────────────────────────────────────────┘
        │
        ▼
    MongoDB Storage
        │
        ▼
┌───────────────────────────────────────────────────────┐
│            CONSOLIDATED VIEW                           │
│                                                        │
│  1. Fetch all transactions                             │
│  2. Sum reporting_amount (already converted)           │
│  3. Display in Group Reporting Currency                │
│                                                        │
└───────────────────────────────────────────────────────┘
```

### Conversion Logic (Backend)
```python
# Currency conversion is performed at transaction creation
# Location: backend/services/currency_service.py

def convert_to_reporting_currency(
    amount: float,
    from_currency: str,
    to_currency: str,
    fx_rate: float = None
) -> dict:
    """
    Converts an amount from transaction currency to reporting currency.
    
    REAL-TIME SYNC INTERACTION:
    - If fx_rate is not provided, fetches current rate from FX API
    - Stores the fx_rate used for audit trail
    - Returns both original and converted amounts
    
    Args:
        amount: The transaction amount in source currency
        from_currency: ISO 4217 code of source currency
        to_currency: ISO 4217 code of target currency
        fx_rate: Optional override for exchange rate
    
    Returns:
        dict with reporting_amount, fx_rate, and conversion timestamp
    """
    if fx_rate is None:
        fx_rate = get_current_fx_rate(from_currency, to_currency)
    
    return {
        "reporting_amount": amount * fx_rate,
        "fx_rate": fx_rate,
        "converted_at": datetime.now(timezone.utc)
    }
```

---

## Real-Time Sync Architecture

### Overview
The multi-currency system interacts with real-time data through the following mechanisms:

```
┌──────────────────────────────────────────────────────────────────┐
│                    REAL-TIME SYNC FLOW                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐  │
│   │  Frontend   │────▶│   WebSocket  │────▶│  Currency State │  │
│   │  (React)    │     │   Handler    │     │    Provider     │  │
│   └─────────────┘     └──────────────┘     └────────┬────────┘  │
│                                                      │           │
│   ┌─────────────┐     ┌──────────────┐     ┌────────▼────────┐  │
│   │  FX Rate    │────▶│   Backend    │────▶│   MongoDB       │  │
│   │  Provider   │     │   Service    │     │   (Cached)      │  │
│   └─────────────┘     └──────────────┘     └─────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Currency State Management (Frontend)
```javascript
// Location: frontend/src/context/CurrencyContext.js
// 
// CONVERSION LOGIC INTERACTION:
// 1. CurrencyContext provides global currency state
// 2. When entity selection changes, currency updates automatically
// 3. All UI components subscribe to currency changes
// 4. Values re-render with appropriate symbol and formatting
//
// REAL-TIME SYNC:
// - Currency state changes trigger re-render of all monetary values
// - No API call needed for display formatting (client-side)
// - FX rates cached and refreshed periodically (server-side)
```

### Backend Sync Points
```python
# Location: backend/services/realtime_sync.py
#
# SYNC POINTS FOR CURRENCY CONVERSION:
#
# 1. Entity Selection Change
#    - Client sends: company_id
#    - Server returns: company.currency, current_fx_rates
#    - UI updates: All monetary displays
#
# 2. Transaction Creation
#    - Client sends: amount, transaction_currency
#    - Server performs: Real-time FX conversion
#    - Server stores: Both original and converted amounts
#
# 3. Consolidated View Request
#    - Client sends: entity_group_id, reporting_currency
#    - Server aggregates: All transactions in reporting_currency
#    - Server returns: Consolidated totals
#
# 4. FX Rate Refresh (Background)
#    - Scheduler: Every 15 minutes
#    - Updates: Cached FX rates in Redis/Memory
#    - Notifies: Connected clients via WebSocket (optional)
```

---

## Migration & Seeding

### Seed Files Location
```
backend/
├── migrations/
│   ├── seed_currencies.py      # ISO 4217 currency codes
│   ├── seed_countries.py       # ISO 3166 country codes
│   └── seed_entity_groups.py   # Default regional groups
```

### Running Migrations
```bash
# Seed all master data
python -m backend.migrations.seed_all

# Or individually:
python -m backend.migrations.seed_currencies
python -m backend.migrations.seed_countries
```

### Updating Currency Array
To add new currencies for global expansion:

1. **Edit the seed file:**
   ```bash
   # backend/migrations/seed_currencies.py
   # Add new currency to CURRENCIES array
   ```

2. **Re-run the seeder:**
   ```bash
   python -m backend.migrations.seed_currencies --update
   ```

3. **Verify in database:**
   ```bash
   mongosh myglobalcfo --eval "db.currencies.find({code: 'NEW_CODE'})"
   ```

---

## Index Recommendations

```javascript
// Recommended indexes for optimal query performance

// Companies Collection
db.companies.createIndex({ "user_id": 1 });
db.companies.createIndex({ "currency": 1 });
db.companies.createIndex({ "global_region": 1 });

// Transactions Collection
db.transactions.createIndex({ "company_id": 1, "date": -1 });
db.transactions.createIndex({ "transaction_currency": 1 });
db.transactions.createIndex({ "reporting_currency": 1 });

// Currencies Collection (Master)
db.currencies.createIndex({ "code": 1 }, { unique: true });

// Countries Collection (Master)
db.countries.createIndex({ "code": 1 }, { unique: true });
db.countries.createIndex({ "region": 1 });
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-01 | Initial schema design |
| 1.1.0 | 2024-06-01 | Added multi-currency transaction support |
| 1.2.0 | 2024-12-01 | Added entity groups and regional classification |

---

*Last Updated: January 2025*
*Maintained by: MyGlobalCFO Development Team*
