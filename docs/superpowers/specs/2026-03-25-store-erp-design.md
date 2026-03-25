# Store ERP System — Design Specification

**Date:** 2026-03-25
**Target Market:** Southeast Asia (Malaysia focus)
**Languages:** Simplified Chinese (default), English; Malay (reserved)

---

## 1. Overview

A multi-tenant SaaS ERP system for tea drink and coffee chain stores (e.g., 书亦烧仙草, 霸王茶姬). Core capabilities:

- Store inventory management (进销存)
- POS system integration via Webhook (sales auto-deduct inventory)
- Manage finished products, ingredients, consumables, and product recipes (BOM)
- Inventory stocktake and calibration
- Periodic restocking suggestions based on sales velocity and current stock
- Multi-role access with tenant isolation

---

## 2. Architecture

### 2.1 Monorepo Structure (Turborepo)

```
store-erp/
├── apps/
│   ├── web/          # Next.js 15 (App Router) — frontend
│   └── api/          # NestJS + Fastify — backend API + background jobs
├── packages/
│   ├── types/        # Shared TypeScript types and DTOs
│   ├── ui/           # Shared component library (dark theme, red accent)
│   └── i18n/         # i18n message files (zh, en, ms)
└── infra/            # Docker Compose, deployment configs
```

### 2.2 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 15 + Tailwind CSS + shadcn/ui | App Router, SSR/CSR hybrid |
| Backend | NestJS + Fastify adapter | Modular, higher performance than Express |
| Database | PostgreSQL 16 (Supabase in production, Docker in dev) + Prisma ORM | Row-level multi-tenancy |
| Cache / Queue | Redis + BullMQ | Restocking calculation jobs, notification queue |
| Auth | JWT + Refresh Token (NestJS Guards) | Tenant context auto-injected |
| Notifications | Pluggable NotificationProvider (WhatsApp via 360dialog / Email) | |
| i18n | next-intl (frontend) + Accept-Language header (API) | Default zh |
| Deployment | Docker Compose (dev) / Kubernetes (production) | Independent containers |

### 2.3 Core Data Flow

```
POS Webhook → NestJS POS Adapter → Canonical SaleEvent
    → Inventory auto-deduction (via BOM lookup, using SaleEvent.storeId for store context)
    → Write SaleEvent + SaleItems
    → Publish InventoryUpdated event
        → BullMQ: trigger restocking check
            → Calculate RestockSuggestion
            → Low-stock alert → NotificationProvider → WhatsApp / WeCom / Email
```

---

## 3. Multi-Tenancy

### 3.1 Tenant Isolation Strategy

**Phase 1 (current):** Shared database, row-level isolation via `tenantId` on every business table. Prisma middleware automatically injects `tenantId` on all queries. All entities — including `ProductRecipe` — carry an explicit `tenantId` field for this middleware to function.

**SUPER_ADMIN middleware carve-out:** When the authenticated user has `globalRole = SUPER_ADMIN`, the Prisma middleware skips `tenantId` injection entirely, allowing cross-tenant queries. This carve-out is the only exception to the automatic injection rule. All other roles always have `tenantId` injected.

**Phase 2 (scale):** Migrate large tenants to dedicated schema per tenant.

**Phase 3 (enterprise):** Dedicated database per tenant on request.

### 3.2 Tenant Hierarchy

```
Tenant (Brand)
  ├── TenantRegion (canonical region list, managed by HQ Admin)
  ├── Store (individual location; Store.region references TenantRegion.name)
  │     └── StoreUser (user ↔ store role binding, for STORE_MANAGER / STAFF)
  └── User
        └── UserRegion (user ↔ region mapping, for REGIONAL_MANAGER scope enforcement;
                        UserRegion.region references TenantRegion.name)
```

---

## 4. Data Model

### 4.1 Unit Canonical Rule

`Material.unit` is the **single source of truth** for a material's unit of measure (e.g., `ml`, `g`, `pcs`). Both `ProductRecipe.unit` and `StoreInventory.unit` must always match `Material.unit`. No unit conversion is supported in MVP. Any import or recipe entry that specifies a unit differing from `Material.unit` is rejected with a validation error.

### 4.2 Core Entities

**Tenant**
- `id`, `name`, `slug`, `defaultLocale`, `plan`, `createdAt`

**Store**
- `id`, `tenantId`, `name`, `region`, `timezone`, `status`, `createdAt`

**User**
- `id`, `tenantId`, `email`, `passwordHash`, `name`, `globalRole`: `SUPER_ADMIN | HQ_ADMIN | REGIONAL_MANAGER | STORE_MANAGER | STAFF`, `locale`, `createdAt`
- `SUPER_ADMIN`: platform-level operator; can manage all tenants. Assigned only by the platform team. Exists in the `User` table with no `tenantId` (nullable).

**TenantRegion** (canonical region list per tenant)
- `id`, `tenantId`, `name` (unique within tenant, e.g., "Kuala Lumpur", "Selangor")
- HQ Admin manages this list. `Store.region` and `UserRegion.region` must reference a `TenantRegion.name` within the same tenant. Creation/update of stores or user-region assignments validates against this list, rejecting unrecognized region names.

**UserRegion** (maps REGIONAL_MANAGER users to regions)
- `userId`, `tenantId`, `region` (must match a `TenantRegion.name` for the same tenant)
- A `REGIONAL_MANAGER` user's data access is scoped to stores whose `Store.region` matches one of their `UserRegion.region` entries. Prisma middleware enforces this scope automatically.

**StoreUser** (user ↔ store role binding for STORE_MANAGER and STAFF)
- `userId`, `storeId`, `tenantId`, `role`: `STORE_MANAGER | STAFF`

**Product** (finished product, e.g., "Taro Bubble Milk Tea")
- `id`, `tenantId`, `name`, `nameEn`, `sku`, `category`, `status`

**Material** (ingredients and consumables — canonical unit defined here)
- `id`, `tenantId`, `name`, `nameEn`, `type`: `INGREDIENT | CONSUMABLE`, `unit` (canonical), `spec`, `status`
  - `INGREDIENT`: milk, coffee beans, taro paste, syrup, tapioca pearls
  - `CONSUMABLE`: cups, lids, cup sleeves, straws, bags

**ProductRecipe** (BOM — links product to materials)
- `id`, `tenantId`, `productId`, `materialId`, `quantity`, `unit` (must equal `Material.unit`), `sizeVariant` (e.g., S/M/L)

**StoreInventory** (current stock per store per material)
- `id`, `tenantId`, `storeId`, `materialId`, `currentQty`, `unit` (must equal `Material.unit`), `safetyStockQty`, `defaultOrderQty`, `lastUpdatedAt`
- `safetyStockQty`: minimum threshold; triggers low-stock alert when `currentQty` falls below this value
- `defaultOrderQty`: suggested order quantity for new stores with no sales history (used as fallback in restocking calculation)

**InventoryTransaction** (audit trail for all stock movements)
- `id`, `tenantId`, `storeId`, `materialId`, `delta`, `type`: `INITIAL_IMPORT | PURCHASE | SALE_DEDUCTION | STOCKTAKE_ADJUSTMENT | MANUAL_ADJUSTMENT`, `referenceId`, `note`, `createdBy`, `createdAt`

**SaleEvent** (normalized POS sale record)
- `id`, `tenantId`, `storeId`, `posOrderId`, `posSource`, `soldAt`, `createdAt`

**SaleItem**
- `id`, `saleEventId`, `productId`, `sizeVariant`, `quantity`, `unitPrice`
- Note: `storeId` is always derived via `SaleEvent.storeId` — never stored redundantly on `SaleItem`

**StocktakeSession** (stocktake record)
- `id`, `tenantId`, `storeId`, `periodStart` (ISO date, YYYY-MM-DD — the date the stocktake covers), `status`: `DRAFT | IN_PROGRESS | PENDING_APPROVAL | COMPLETED`, `createdBy`, `confirmedBy`, `createdAt`
- **One active session rule:** A store may not have more than one session in `DRAFT`, `IN_PROGRESS`, or `PENDING_APPROVAL` status at a time. Attempting to create a new session while one is active returns a validation error.

**StocktakeItem**
- `id`, `sessionId`, `materialId`, `systemQty` (snapshotted at session transition to `IN_PROGRESS`), `actualQty` (entered by staff), `variance` (computed: `systemQty - actualQty`)
- `systemQty` is captured once when the session moves from `DRAFT` → `IN_PROGRESS`. Auto-deductions continue during the open session and are recorded normally. The stocktake result reflects the diff between the snapshotted value and the actual count — not real-time stock.

**RestockSuggestion**
- `id`, `tenantId`, `storeId`, `materialId`, `currentQty`, `avgDailySales`, `coverageDays`, `suggestedQty` (floored at 0), `periodDate` (ISO date YYYY-MM-DD — the date the suggestion was generated), `status`: `PENDING | CONFIRMED | DISMISSED`, `createdAt`

**WebhookLog** (POS adapter error and delivery audit)
- `id`, `tenantId`, `storeId`, `posSource`, `rawPayload` (JSONB), `status`: `SUCCESS | FAILED | RETRYING`, `errorMessage`, `retryCount`, `receivedAt`, `processedAt`
- All incoming webhook calls are logged before processing. Failed payloads are retried up to 3 times via BullMQ. Persistent failures trigger a notification to HQ Admin.

---

## 5. Business Logic

### 5.1 POS Integration (Adapter Pattern)

Each POS system has a dedicated adapter that normalizes webhook payloads into a canonical `SaleEvent`:

```
apps/api/src/pos/adapters/
├── base.adapter.ts       # Interface definition
├── storehub.adapter.ts   # StoreHub (dominant in Malaysia)
├── slurp.adapter.ts      # Slurp! (Malaysia F&B specialist)
└── hualala.adapter.ts    # 哗啦啦 (Chinese chain expansion)
```

New POS systems only require a new adapter — no changes to business logic.

All incoming webhook requests are persisted to `WebhookLog` before adapter processing begins. On adapter failure, the log entry is updated to `FAILED` and queued for retry.

### 5.2 Inventory Auto-Deduction

On receiving a `SaleEvent`:
1. Retrieve `storeId` from `SaleEvent`
2. For each `SaleItem`, look up `ProductRecipe` by `productId + sizeVariant`
3. Calculate material consumption for each recipe line
4. Batch-update `StoreInventory` (decrement `currentQty`) scoped to `storeId`
5. Write `InventoryTransaction` records (type: `SALE_DEDUCTION`, `referenceId` = `saleEventId`)
6. Publish `InventoryUpdated` event

### 5.3 Stocktake Flow

```
Create StocktakeSession (DRAFT)
  → Validation: no other active session exists for this store
  → Transition to IN_PROGRESS: snapshot systemQty for all materials into StocktakeItems
  → Staff enters actualQty per material
  → System computes variance (systemQty - actualQty)
  → Session moves to PENDING_APPROVAL
  → Store Manager / Regional Manager / HQ confirms
  → Write InventoryTransaction per material with non-zero variance (type: STOCKTAKE_ADJUSTMENT)
  → Update StoreInventory.currentQty to actualQty for adjusted materials
  → Session marked COMPLETED
```

### 5.4 Initial Inventory Import

- CSV/Excel upload available to all roles including Staff
- Rationale: initial import is a setup operation, functionally equivalent to a series of manual inventory adjustments (which Staff can also perform). No approval gate is required; all writes are logged as `INITIAL_IMPORT` transactions with the uploader's identity, and can be reversed via manual adjustment. This is a deliberate design decision — the same trust level that permits Staff to perform manual adjustments also permits bulk import.
- Template downloadable per tenant
- Validation: all units must match `Material.unit`; no duplicate `materialId` per store; non-negative quantities only
- On success: bulk-write `StoreInventory` + `InventoryTransaction` (type: `INITIAL_IMPORT`, `createdBy` = uploading user)

### 5.5 Restocking Suggestion Calculation

**Scheduled BullMQ job** (configurable period per tenant: daily / every 2 days / weekly):

**Stores with ≥ 7 days of sales history:**
```
suggestedQty = max(0, (avgDailySales × periodDays) + safetyStockQty - currentQty)
```
- If result ≤ 0: stock is sufficient; no suggestion written (or existing suggestion marked `DISMISSED`)
- If result > 0: write `RestockSuggestion` with `status: PENDING`

**New stores (< 7 days of sales data):**
```
suggestedQty = defaultOrderQty   (from StoreInventory.defaultOrderQty)
```
- Only triggered when `currentQty < safetyStockQty`
- `defaultOrderQty` is set manually by HQ Admin at store setup

- `avgDailySales`: average daily material consumption over past 7 days (derived from `InventoryTransaction` `SALE_DEDUCTION` records)
- `periodDate`: ISO date (YYYY-MM-DD) of the job execution date
- Materials below `safetyStockQty` also trigger an immediate low-stock notification regardless of suggestion status

---

## 6. Notification System

**Dual-channel delivery:**
1. In-system: notification center in the ERP UI, badge counts
2. Push: configurable per tenant/store

**Pluggable providers:**
```
apps/api/src/notifications/providers/
├── whatsapp.provider.ts   # via 360dialog (Malaysia-dominant)
└── email.provider.ts      # Fallback / summary reports
```

**Notification triggers:**
- Material stock below `safetyStockQty`
- New restocking suggestion generated
- Stocktake session pending approval
- POS webhook persistent failure (after 3 retries, notify HQ Admin)

---

## 7. Roles and Permissions

### Role Definitions

| Role | Scope | Notes |
|---|---|---|
| `SUPER_ADMIN` | Platform-wide | Platform operator only; manages tenants; no `tenantId` binding |
| `HQ_ADMIN` | Entire tenant | Brand headquarters admin |
| `REGIONAL_MANAGER` | Own regions (via `UserRegion`) | Scoped to stores in their assigned regions |
| `STORE_MANAGER` | Own store (via `StoreUser`) | |
| `STAFF` | Own store (via `StoreUser`) | |

### Permission Matrix

| Feature | Super Admin | HQ Admin | Regional Manager | Store Manager | Staff |
|---|---|---|---|---|---|
| Tenant management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure products / recipes / ingredients / consumables | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View** products / recipes / ingredients / consumables | ✅ | ✅ | ✅ (read-only) | ✅ (read-only) | ✅ (read-only) |
| View store data | All tenants | All stores | Own regions only | Own store only | Own store only |
| Confirm / dismiss restock suggestions | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manual inventory adjustment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Initiate / enter stocktake | ✅ | ✅ | ✅ | ✅ | ✅ |
| Confirm stocktake variance | ✅ | ✅ | ✅ | ✅ | ❌ |
| View inventory / sales reports | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSV initial import | ✅ | ✅ | ✅ | ✅ | ✅ |
| POS adapter configuration | ✅ | ✅ | ❌ | ❌ | ❌ |
| Store management | ✅ | ✅ | ❌ | ❌ | ❌ |
| User management | ✅ | All in tenant | Own region | Own store | ❌ |
| Set defaultOrderQty / safetyStockQty | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 8. Frontend Structure

### 8.1 Navigation (Left Sidebar)

```
基础资料 / Master Data
  ├── 成品管理 / Products
  ├── 配方管理 / Recipes
  ├── 原料管理 / Ingredients
  └── 耗材管理 / Consumables

门店管理 / Store Management        [HQ Admin only]

库存管理 / Inventory
  ├── 库存查询 / Stock Query
  ├── 入库记录 / Purchase Records
  ├── 库存流水 / Stock Transactions
  └── 盘点管理 / Stocktake

销售管理 / Sales
  ├── 销售记录 / Sale Records
  └── POS 对接配置 / POS Config    [HQ Admin only]

补货管理 / Restocking
  ├── 补货建议 / Suggestions
  └── 补货历史 / History

报表管理 / Reports
  ├── 库存报表 / Inventory Report
  └── 销售报表 / Sales Report

系统设置 / Settings
  ├── 用户管理 / Users
  ├── 区域管理 / Regions            [HQ Admin only]
  └── 通知配置 / Notifications

租户管理 / Tenant Management       [Super Admin only]
```

### 8.2 UI Design System

- **Theme:** Dark sidebar (`#1a1a2e`), white/light-grey content area
- **Primary color:** Red `#E53E3E` (aligned with existing WMS)
- **Component base:** shadcn/ui with custom theme tokens
- **Layout:** Fixed sidebar + top header + content area with breadcrumb
- **Tables:** Filter bar → action buttons (新增/导入/导出) → data table → pagination
- **Empty state:** Centered illustration + text (consistent with WMS style)

### 8.3 Internationalization

- **Framework:** next-intl
- **URL strategy:** Locale prefix — `/zh/inventory`, `/en/inventory`
- **Tenant default locale:** Configurable per tenant
- **User override:** Personal language preference in profile settings
- **API errors:** Return `message_key`; frontend resolves to locale string
- **Languages:** `zh` (Simplified Chinese), `en` (English), `ms` (Malay — reserved)

---

## 9. Deployment

### Development
```yaml
# Docker Compose
services:
  web:    Next.js (port 3000)
  api:    NestJS (port 3001)
  db:     PostgreSQL 16 (port 5432)
  redis:  Redis 7 (port 6379)
```

### Production
- Database: Supabase (hosted PostgreSQL)
- Cache/Queue: Upstash Redis or self-hosted
- Containers: Kubernetes (web + api as separate deployments)
- Migration path: shared DB → schema-per-tenant → DB-per-tenant

---

## 10. Out of Scope (MVP)

- Smart demand forecasting (seasonal / promotional factors) — Phase 2
- Mobile native app — Phase 2
- Supplier management / purchase order workflow — Phase 2
- Financial reporting / cost analysis — Phase 2
- Malay language translation — reserved, scaffold in place
- Unit conversion between materials — not supported in MVP; all units must be canonical
