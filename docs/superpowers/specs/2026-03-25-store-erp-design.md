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
| Notifications | Pluggable NotificationProvider (WhatsApp via 360dialog / WeCom / Email) | |
| i18n | next-intl (frontend) + Accept-Language header (API) | Default zh |
| Deployment | Docker Compose (dev) / Kubernetes (production) | Independent containers |

### 2.3 Core Data Flow

```
POS Webhook → NestJS POS Adapter → Canonical SaleEvent
    → Inventory auto-deduction (via BOM lookup)
    → Write SaleEvent + SaleItems
    → Publish InventoryUpdated event
        → BullMQ: trigger restocking check
            → Calculate RestockSuggestion
            → Low-stock alert → NotificationProvider → WhatsApp / WeCom / Email
```

---

## 3. Multi-Tenancy

### 3.1 Tenant Isolation Strategy

**Phase 1 (current):** Shared database, row-level isolation via `tenant_id` on every business table. Prisma middleware automatically injects `tenant_id` on all queries.

**Phase 2 (scale):** Migrate large tenants to dedicated schema per tenant.

**Phase 3 (enterprise):** Dedicated database per tenant on request.

### 3.2 Tenant Hierarchy

```
Tenant (Brand)
  └── Store (individual location)
        └── StoreUser (user ↔ store + role binding)
```

---

## 4. Data Model

### 4.1 Core Entities

**Tenant**
- `id`, `name`, `slug`, `defaultLocale`, `plan`, `createdAt`

**Store**
- `id`, `tenantId`, `name`, `region`, `timezone`, `status`, `createdAt`

**User**
- `id`, `tenantId`, `email`, `passwordHash`, `name`, `globalRole`, `locale`, `createdAt`

**StoreUser** (user ↔ store role binding)
- `userId`, `storeId`, `role`: `HQ_ADMIN | REGIONAL_MANAGER | STORE_MANAGER | STAFF`

**Product** (finished product, e.g., "Taro Bubble Milk Tea")
- `id`, `tenantId`, `name`, `nameEn`, `sku`, `category`, `status`

**Material** (ingredients and consumables)
- `id`, `tenantId`, `name`, `nameEn`, `type`: `INGREDIENT | CONSUMABLE`, `unit`, `spec`, `status`
  - `INGREDIENT`: milk, coffee beans, taro paste, syrup, tapioca pearls
  - `CONSUMABLE`: cups, lids, cup sleeves, straws, bags

**ProductRecipe** (BOM — links product to materials)
- `id`, `productId`, `materialId`, `quantity`, `unit`, `sizeVariant` (e.g., S/M/L)

**StoreInventory** (current stock per store per material)
- `id`, `tenantId`, `storeId`, `materialId`, `currentQty`, `unit`, `safetyStockQty`, `lastUpdatedAt`

**InventoryTransaction** (audit trail for all stock movements)
- `id`, `tenantId`, `storeId`, `materialId`, `delta`, `type`: `INITIAL_IMPORT | PURCHASE | SALE_DEDUCTION | STOCKTAKE_ADJUSTMENT | MANUAL_ADJUSTMENT`, `referenceId`, `note`, `createdBy`, `createdAt`

**SaleEvent** (normalized POS sale record)
- `id`, `tenantId`, `storeId`, `posOrderId`, `posSource`, `soldAt`, `createdAt`

**SaleItem**
- `id`, `saleEventId`, `productId`, `sizeVariant`, `quantity`, `unitPrice`

**StocktakeSession** (stocktake record)
- `id`, `tenantId`, `storeId`, `period`, `status`: `DRAFT | IN_PROGRESS | PENDING_APPROVAL | COMPLETED`, `createdBy`, `confirmedBy`, `createdAt`

**StocktakeItem**
- `id`, `sessionId`, `materialId`, `systemQty`, `actualQty`, `variance`

**RestockSuggestion**
- `id`, `tenantId`, `storeId`, `materialId`, `currentQty`, `avgDailySales`, `coverageDays`, `suggestedQty`, `period`, `status`: `PENDING | CONFIRMED | DISMISSED`, `createdAt`

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

### 5.2 Inventory Auto-Deduction

On receiving a `SaleEvent`:
1. For each `SaleItem`, look up `ProductRecipe` by `productId + sizeVariant`
2. Calculate material consumption for each recipe line
3. Batch-update `StoreInventory` (decrement `currentQty`)
4. Write `InventoryTransaction` records (type: `SALE_DEDUCTION`)
5. Publish `InventoryUpdated` event

### 5.3 Stocktake Flow

```
Create StocktakeSession (DRAFT)
  → Staff enters actual counts per material
  → System computes variance (systemQty - actualQty)
  → Session moves to PENDING_APPROVAL
  → Store Manager / Regional Manager / HQ confirms
  → Write InventoryTransaction (type: STOCKTAKE_ADJUSTMENT)
  → Update StoreInventory to actual counts
  → Session marked COMPLETED
```

### 5.4 Initial Inventory Import

- CSV/Excel upload supported for all roles (including Staff)
- Template provided per tenant for download
- Validation: unit consistency, duplicate material check, non-negative quantities
- On success: bulk write `StoreInventory` + `InventoryTransaction` (type: `INITIAL_IMPORT`)

### 5.5 Restocking Suggestion Calculation

**Scheduled BullMQ job** (configurable period: daily / every 2 days / weekly per tenant):

```
suggestedQty = (avgDailySales × periodDays) + safetyStockQty - currentQty
```

- `avgDailySales`: average daily material consumption over past 7 days (derived from `InventoryTransaction` SALE_DEDUCTION records)
- **New stores** (< 7 days of data): fall back to manually configured `safetyStockQty` threshold
- Results written to `RestockSuggestion`
- Materials below safety stock trigger immediate notification

---

## 6. Notification System

**Dual-channel delivery:**
1. In-system: notification center in the ERP UI, badge counts
2. Push: configurable per tenant/store

**Pluggable providers:**
```
apps/api/src/notifications/providers/
├── whatsapp.provider.ts   # via 360dialog (Malaysia-dominant)
├── wecom.provider.ts      # 企业微信 (Chinese brand HQs)
└── email.provider.ts      # Fallback / summary reports
```

**Notification triggers:**
- Material stock below safety threshold
- New restocking suggestion generated
- Stocktake pending approval
- POS adapter error / webhook failure

---

## 7. Roles and Permissions

| Feature | HQ Admin | Regional Manager | Store Manager | Staff |
|---|---|---|---|---|
| Configure products / recipes / ingredients / consumables | ✅ | ❌ | ❌ | ❌ |
| **View** products / recipes / ingredients / consumables | ✅ | ✅ (read-only) | ✅ (read-only) | ✅ (read-only) |
| View store data | All stores | Own region only | Own store only | Own store only |
| Confirm / dismiss restock suggestions | ✅ | ✅ | ✅ | ❌ |
| Manual inventory adjustment | ✅ | ✅ | ✅ | ✅ |
| Initiate / enter stocktake | ✅ | ✅ | ✅ | ✅ |
| Confirm stocktake variance | ✅ | ✅ | ✅ | ❌ |
| View inventory / sales reports | ✅ | ✅ | ✅ | ✅ |
| CSV initial import | ✅ | ✅ | ✅ | ✅ |
| POS adapter configuration | ✅ | ❌ | ❌ | ❌ |
| Tenant / store management | ✅ | ❌ | ❌ | ❌ |
| User management | ✅ | Own region | Own store | ❌ |

---

## 8. Frontend Structure

### 8.1 Navigation (Left Sidebar)

```
基础资料 / Master Data
  ├── 成品管理 / Products
  ├── 配方管理 / Recipes
  ├── 原料管理 / Ingredients
  └── 耗材管理 / Consumables

门店管理 / Store Management        [HQ / Regional only]

库存管理 / Inventory
  ├── 库存查询 / Stock Query
  ├── 入库记录 / Purchase Records
  ├── 库存流水 / Stock Transactions
  └── 盘点管理 / Stocktake

销售管理 / Sales
  ├── 销售记录 / Sale Records
  └── POS 对接配置 / POS Config    [HQ only]

补货管理 / Restocking
  ├── 补货建议 / Suggestions
  └── 补货历史 / History

报表管理 / Reports
  ├── 库存报表 / Inventory Report
  └── 销售报表 / Sales Report

系统设置 / Settings
  ├── 用户管理 / Users
  ├── 角色管理 / Roles
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
