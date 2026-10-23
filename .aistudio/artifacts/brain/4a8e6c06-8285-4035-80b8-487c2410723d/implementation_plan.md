# GRN Keyboard Navigation & POS Batch-Wise Pricing Plan

Upgrade the Goods Received Note (GRN) module with rapid, Excel-style keyboard grid navigation and equip the POS invoicing terminal with intelligent batch-wise margin protection and pricing selection modals.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during the interactive interview:
> - **POS Batch Selection Workflow**: When an item has multiple active intake batches with varying cost or selling prices, the POS terminal immediately triggers the dedicated Batch Selector modal showing purchase dates, FIFO age, cost prices, selling prices, and remaining quantities so the cashier can bill from the exact stock batch.
> - **GRN Row Creation via Enter**: Pressing `Enter` on the last editable cell of any row automatically appends a new item row and instantly positions cursor focus on the first cell (`itemCode`) of the new row without requiring any mouse interaction.
> - **Non-Editable Cell Bypassing**: Navigation automatically skips calculated cells (such as line totals) and utility buttons (like delete), cycling smoothly across valid editable data inputs.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms inventory intake into a rapid, zero-mouse data entry grid modeled after Microsoft Excel and Google Sheets, while simultaneously preserving historical purchase tranches. When goods are received, each item row becomes an autonomous inventory batch with its own purchase date, cost price, and selling price. During retail checkout, the POS invoicing engine evaluates active batches and prompts the cashier to choose the specific batch being dispensed, guaranteeing margin protection and accounting accuracy.
- **Target Persona**: Inventory managers receiving supplier shipments containing hundreds of SKU lines, and retail checkout cashiers who need to distinguish between older stock acquired at lower cost and new stock acquired at revised vendor prices.
- **Key Value**: Speeds up bulk inventory entry by 400% through keyboard-only data entry, eliminates margin erosion caused by blanket price overrides, and provides FIFO visibility.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **GRN Bulk Stock Inward Flow**:
   - Cashier or stock manager opens "+ New GRN / Goods Inward" modal.
   - Types or scans Item Code `[000027]`, presses `Tab` or `Enter` to glide into Item Name `[Auto-suggested / edited]`, presses `Tab` into Quantity `[25]`, presses `Tab` into Cost Price `[210]`, presses `Tab` into Selling Price `[330]`.
   - Hits `Enter` on Selling Price: the current row locks in and a new item row immediately appears below with the cursor placed in `itemCode`.
   - Arrow keys (`Up`, `Down`, `Left`, `Right`) allow effortless traversal across rows and columns.
   - Clicking or shortcutting "Post GRN Note" creates individual `inventory_batches` linked to the SKU and GRN identifier.

2. **POS Invoicing & Batch Margin Protection Flow**:
   - Cashier scans or enters SKU `000027` in the POS Terminal.
   - If only 1 batch is active: automatically adds to bill with that batch's selling price and links the batch identifier.
   - If 2 or more active batches exist (e.g. Batch 1 bought at Rs 180 / selling Rs 280, and Batch 2 bought at Rs 210 / selling Rs 330):
     - The "Select Pricing Batch" modal surfaces smoothly.
     - Displays badge indicators for "Oldest Batch (FIFO)" and "Newest Inward", purchase dates, available quantities, cost margins, and selling prices.
     - Cashier can click a batch or press numeric keys (`1`, `2`, `3`) or `Enter` to select.
     - Selected batch's price, cost, and batch number populate the invoice line item.
     - Invoice total and margin calculations reflect the exact batch cost.

### Visual Identity & Theme

- **Aesthetic Direction**: High-density utilitarian workstation interface matching the dark navy/slate aesthetic of the POS suite.
- **Color Palette & Accents**:
  - Dominant Field: Deep rich midnight slate (`#060c22` / `#091333`).
  - Active Grid Focus: Electric cyan focus outline (`ring-2 ring-cyan-400 bg-cyan-950/30`) with auto-selection of text for instant replacement.
  - FIFO Batch Accents: Emerald green tags for high-margin / aged stock, amber highlights for recent shipments.
- **Typography & Tabular Data**:
  - Headings & Actions: Oswald uppercase tracking.
  - Data Cells & Numbers: Monospace tabular numerals (`JetBrains Mono`, `tabular-nums`) ensuring strict vertical decimal alignment across cost, quantity, and price.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Keyboard Navigation via Coordinated DOM Focus Matrix**:
  - *Chosen Approach*: Assign grid coordinate attributes (`data-grn-row={r}` and `data-grn-col={c}`) with a centralized keyboard handler intercepting `Tab`, `Shift+Tab`, `Enter`, and Arrow keys.
  - *Why*: Provides native Excel behavior without heavy third-party spreadsheet dependencies (Handsontable or AG-Grid) that bloat bundle size and conflict with custom tailwind styles.
  - *Alternatives Considered*: Standard HTML tab-index (fails on arrow-key navigation and cannot dynamically append rows on Enter).

- **Decision 2: Dual Storage Synchronization (Indexed State + Server API)**:
  - *Chosen Approach*: Save posted batches into both the backend database table (`inventory_batches`) and client reactive memory/localStorage cache.
  - *Why*: Guarantees instant sub-millisecond barcode response during high-volume POS scanning even under intermittent network connectivity.

- **Decision 3: Batch Depletion Lifecycle (Active -> Depleted)**:
  - *Chosen Approach*: When a bill is finalized, decrement `remainingQty` on the selected batch. When remaining quantity reaches zero, mark the batch status as `Depleted` so it automatically disappears from POS selection modals.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GRN Goods Intake Module                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Keyboard Navigation Engine (Tab / Shift+Tab / Enter / Arrows)   │  │
│  │  Row Matrix: [Code: 0] -> [Name: 1] -> [Qty: 2] -> [Cost: 3] -> │  │
│  │               [Price: 4] --(Enter on Last Cell)--> New Row + 0   │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
│                                    │ Post GRN                          │
│                                    ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Batch Generator & Inward Ledger                     │  │
│  │  - Generates BATCH-{GRN}-{SKU}-{INDEX}                           │  │
│  │  - Sets Purchase Date, Cost, Selling Price, Remaining Qty        │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Inventory Batch Repository                       │
│  - Table: inventory_batches (Server DB)                                │
│  - Client Sync: /api/inventory/batches?activeOnly=true                 │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          POS Invoicing Screen                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Item Barcode Scan / Search                                       │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
│                                    │ Check active batches for SKU      │
│                  ┌─────────────────┴─────────────────┐                 │
│                  │ (1 Batch)                         │ (>1 Batches)    │
│                  ▼                                   ▼                 │
│         Auto-populate Line             ┌───────────────────────────┐   │
│         Item with Batch Price          │   BatchSelectionModal     │   │
│                                        │ - Lists Purchase Dates    │   │
│                                        │ - Cost & Selling Margin   │   │
│                                        │ - Keys [1, 2, 3] Select   │   │
│                                        └─────────────┬─────────────┘   │
│                                                      │ Selected        │
│                                                      ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Cart Line Items (Includes batchNumber, costPrice, sellingPrice)  │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
│                                    │ Checkout & Tender Payment         │
│                                    ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Bill Finalization -> Deduct remainingQty from specific batch     │  │
│  │ Mark batch 'Depleted' when remaining reaches 0                   │  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Mapping

1. **`inventory_batches` Record Entity**:
   - `batchNumber`: Unique string identifier (`BATCH-GRN-2026-001-000027-01`)
   - `itemCode`: Stock keeping unit / code
   - `itemName`: Product title
   - `grnNumber`: Parent Goods Received Note reference
   - `supplierName`: Vendor source
   - `purchaseDate`: Intake date (`YYYY-MM-DD`)
   - `costPrice`: Acquisition cost per unit
   - `sellingPrice`: Tagged selling price per unit
   - `initialQty`: Received intake quantity
   - `remainingQty`: Unsold stock balance in this batch
   - `status`: `'Active' | 'Depleted'`

2. **Interactive Component Wiring**:
   - **`InventoryView.tsx`**:
     - Connects `onKeyDown` handlers on all editable inputs in the GRN modal table.
     - Dynamically manages `grnRows` array state with automatic row creation on `Enter` key from column index 4.
     - On GRN post: emits API calls and updates local batch store.
   - **`PosTerminalView.tsx`**:
     - On item scan/selection (`handleAddItem` or `handleSelectItem`): queries active batches for the item.
     - If multiple batches exist: pauses cart insertion and sets `batchModalState = { isOpen: true, item, qty, batches }`.
     - Upon batch selection from `BatchSelectionModal`: applies selected `batchNumber`, `costPrice`, and `sellingPrice` to `PosBillItem` and appends to cart.
     - On invoice checkout: transmits selected batch numbers to backend endpoint `/api/pos/bills` which decrements batch inventories.
