# Multi-City Product Availability, Fulfillment aur Delivery Information

> **Status:** Design / Implementation Specification
> **Scope:** PLP, PDP, Cart, Checkout, Browser Storage, SCAPI, Salesforce (custom objects)
> **Language:** Roman Urdu (technical terms English mein)

---

## Contents

1. [Overview](#1-overview)
2. [Glossary](#2-glossary)
3. [Data Models](#3-data-models)
4. [End-to-End Flow](#4-end-to-end-flow)
5. [Page-wise Requirements](#5-page-wise-requirements)
6. [Browser Storage](#6-browser-storage)
7. [Checkout aur SCAPI Payload](#7-checkout-aur-scapi-payload)
8. [Salesforce Backend](#8-salesforce-backend)
9. [Snapshot Rules](#9-snapshot-rules)
10. [Functional Rules](#10-functional-rules)
11. [Is Project mein Implementation Guidance](#11-is-project-mein-implementation-guidance)
12. [Edge Cases](#12-edge-cases)
13. [Acceptance Criteria](#13-acceptance-criteria)
14. [Open Questions](#14-open-questions)

---

## 1. Overview

### 1.1 Maqsad

Humein **location-based product availability aur fulfillment** implement karni hai, jismein user ko PLP se lekar Checkout tak har stage par clearly pata ho:

- Product **kis city/location** se available hai
- Us location par **kitna stock** hai
- Fulfillment location ka **postal code** kya hai
- User se location ka **distance** kitna hai
- Delivery mein kitna **lead time** lagega

### 1.2 Multi-City Fulfillment

System **multi-city fulfillment** support karega. Misal ke taur par Georgia ki 3 cities: **Tbilisi, Batumi, Kutaisi**. Ek hi order ke alag alag products alag alag cities se fulfill ho sakte hain:

```text
Order
│
├── Product A → Tbilisi
├── Product B → Batumi
└── Product C → Kutaisi
```

Har product ki fulfillment information **independently** maintain hogi.

### 1.3 Final Objective

Product ki availability, fulfillment location, stock, distance aur lead time ko **PLP → PDP → Cart → Checkout → SCAPI → Salesforce** tak consistently preserve karna.

---

## 2. Glossary

| Term | Matlab |
|---|---|
| **Fulfillment Location** | Woh city/warehouse jahan se product ship hota hai (e.g. `LOC-001` Tbilisi) |
| **Availability** | Kisi product ka kisi location par stock, distance aur lead time |
| **Lead Time** | Order confirm hone ke baad customer ko product milne tak ka total expected time |
| **Delivery Group** | Cart/Checkout mein same location se aane wale items ka group |
| **Snapshot** | Checkout ke waqt ki values jo baad mein change nahi hoti (stock, distance, lead time) |
| **SCAPI** | Salesforce Commerce API |

---

## 3. Data Models

### 3.1 Fulfillment Location (master)

```json
{
  "locationId": "LOC-001",
  "city": "Tbilisi",
  "postalCode": "0105",
  "latitude": 41.7151,
  "longitude": 44.8271,
  "active": true
}
```

| Location ID | City | Postal Code |
|---|---|---|
| `LOC-001` | Tbilisi | 0105 |
| `LOC-002` | Batumi | 6000 |
| `LOC-003` | Kutaisi | 4600 |

Latitude/longitude distance calculation ke liye use hote hain (agar distance server par calculate karni ho).

### 3.2 Product Availability (per product, per location)

```json
{
  "productId": "PROD-001",
  "productName": "Product 1",
  "sku": "SKU-001",
  "city": "Tbilisi",
  "postalCode": "0105",
  "stockLevel": 15,
  "distance": 8,
  "distanceUnit": "KM",
  "leadTime": 2,
  "leadTimeUnit": "DAYS",
  "fulfillmentLocationId": "LOC-001"
}
```

| Field | Type | Note |
|---|---|---|
| `productId` | string | Product ID |
| `productName` | string | Display name |
| `sku` | string | SKU |
| `city` | string | Fulfillment city |
| `postalCode` | string | Location ka postal code |
| `stockLevel` | number | **Location-specific** stock |
| `distance` | number | User location se distance |
| `distanceUnit` | `"KM"` \| `"MILES"` | |
| `leadTime` | number | Numeric value (string nahi) |
| `leadTimeUnit` | `"HOURS"` \| `"DAYS"` | |
| `fulfillmentLocationId` | string | Master location ka ID |

Ek product ke liye **array of availability** hoga (har city ke liye ek entry):

```text
Product A
├── Tbilisi  → Stock: 15, Distance: 8 KM,  Lead Time: 2 Days
├── Batumi   → Stock: 5,  Distance: 15 KM, Lead Time: 3 Days
└── Kutaisi  → Stock: 0,  Distance: 25 KM, Lead Time: N/A
```

### 3.3 Lead Time Format

Lead time `"2 days"` jaisi string mein **nahi**, numeric value + unit mein store hoga taake future calculations aur alag UI formats support ho sakein:

```json
{ "leadTime": 2,  "leadTimeUnit": "DAYS" }
{ "leadTime": 48, "leadTimeUnit": "HOURS" }
```

### 3.4 Stock 0 wali Location

Agar kisi city mein `stockLevel = 0`:

- **Option A (default):** Location dikhao lekin **Unavailable** mark karo, lead time `N/A`, select/add-to-cart disabled.
- **Option B:** Location ko list se **exclude** kar do.

Business decision se ek option config mein fix karna hoga (dekhein [Open Questions](#14-open-questions)).

### 3.5 TypeScript Types (suggested)

```ts
export type DistanceUnit = 'KM' | 'MILES';
export type LeadTimeUnit = 'HOURS' | 'DAYS';

export interface FulfillmentLocation {
    locationId: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    active: boolean;
}

export interface ProductAvailability {
    productId: string;
    productName: string;
    sku: string;
    fulfillmentLocationId: string;
    city: string;
    postalCode: string;
    stockLevel: number;
    distance: number;
    distanceUnit: DistanceUnit;
    leadTime: number | null; // null => N/A (stock 0)
    leadTimeUnit: LeadTimeUnit;
}

export interface CartFulfillment {
    locationId: string;
    city: string;
    postalCode: string;
    stockLevel: number;
    distance: number;
    distanceUnit: DistanceUnit;
    leadTime: number | null;
    leadTimeUnit: LeadTimeUnit;
}

export interface CartItem {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    fulfillment: CartFulfillment;
}
```

---

## 4. End-to-End Flow

```text
PLP  ──(Product + Availability JSON)──▶  PDP
                                          │  user location select karta hai
                                          ▼
                                     Add to Cart
                                          │  Product + Fulfillment
                                          ▼
                                   Browser Storage (JSON)
                                          │
                                          ▼
                                        Cart  (city-wise groups)
                                          │
                                          ▼
                                      Checkout (delivery groups)
                                          │  validate + payload prepare
                                          ▼
                                        SCAPI
                                          │
                                          ▼
                              Salesforce Commerce Cloud
                                          │
                       ┌──────────────────┴──────────────────┐
                       ▼                                     ▼
                     Order ──▶ Order Items ──▶ Order_Item_Fulfillment__c
                                                             │ Lookup
                                                             ▼
                                                 Fulfillment_Location__c
```

---

## 5. Page-wise Requirements

### 5.1 PLP – Product Listing Page

Product card par show karein: **Name, Price, Available City, Stock, Postal Code, Distance, Lead Time**.

Single location:

```text
Product A
Available from: Tbilisi
Stock: 15
Postal Code: 0105
Distance: 8 KM
Estimated Lead Time: 2 Days
```

Multiple locations (cities clearly alag dikhayein):

```text
Product A
Available Locations:
  Tbilisi — Stock: 15 — Lead Time: 2 Days
  Batumi  — Stock: 5  — Lead Time: 3 Days
```

Guidance:

- Card compact rakhein: default mein **best location** (in-stock + sabse kam lead time/distance) dikhayein, baqi "+N more locations" ke saath.
- PLP par availability **non-critical data** hai → loader mein `await` na karein, Promise return karein aur alag `<Suspense>` + skeleton use karein (CLS se bachne ke liye height reserve karein).

### 5.2 PDP – Product Detail Page

Product ki **location-wise detailed availability**:

```text
Product A

Fulfillment Locations:

Tbilisi
----------------
Stock: 15
Postal Code: 0105
Distance: 8 KM
Lead Time: 2 Days

Batumi
----------------
Stock: 5
Postal Code: 6000
Distance: 15 KM
Lead Time: 3 Days
```

- User **ek location select** karega (radio/card selector). Default: best in-stock location.
- Stock 0 wali location disable/unavailable dikhegi.
- Selected location ke mutabiq **Add to Cart** enabled hoga.

### 5.3 Add to Cart

Sirf `productId` + `quantity` save **nahi** hogi. Selected **fulfillment location** bhi saath save hogi:

```text
Product A → Tbilisi
Product B → Batumi
Product C → Kutaisi
```

> Location cart ke **complete lifecycle** mein preserve rehni chahiye.

Rules:

- Same product, **alag location** = **alag cart line** (e.g. Product A Tbilisi + Product A Batumi do lines hongi).
- Same product, same location dobara add ho to sirf quantity increase hogi.
- Quantity `stockLevel` (us location ka) se zyada nahi ho sakti.

### 5.4 Cart Page

Items **city-wise group** honge:

```text
Tbilisi
-------------------------
Product A     Qty: 1   Stock: 15   Postal: 0105   8 KM    Lead: 2 Days
Product D     Qty: 1   ...

Batumi
-------------------------
Product B     Qty: 2   Stock: 5    Postal: 6000   15 KM   Lead: 3 Days
```

- Same city ke items ek group ke neeche.
- Different city ke items clearly alag groups mein.
- User cart mein **location change** kar sakta hai (agar naye location par stock ho).

### 5.5 Checkout Page

Har product ke liye kam az kam: **Product, Quantity, Fulfillment City, Postal Code, Distance, Lead Time**.

```text
Delivery Group 1 – Tbilisi
--------------------------
Product A
Lead Time: 2 Days
Distance: 8 KM

Delivery Group 2 – Batumi
--------------------------
Product B
Lead Time: 3 Days
Distance: 15 KM
```

Isse user ko clear hota hai ke order ke items kis location se fulfill honge.

---

## 6. Browser Storage

### 6.1 Structure

Cart mein add hone ke baad product **aur** fulfillment info browser storage mein JSON format mein save hogi:

```json
{
  "cartItems": [
    {
      "productId": "PROD-001",
      "productName": "Product A",
      "sku": "SKU-001",
      "quantity": 1,
      "fulfillment": {
        "locationId": "LOC-001",
        "city": "Tbilisi",
        "postalCode": "0105",
        "stockLevel": 15,
        "distance": 8,
        "distanceUnit": "KM",
        "leadTime": 2,
        "leadTimeUnit": "DAYS"
      }
    },
    {
      "productId": "PROD-002",
      "productName": "Product B",
      "sku": "SKU-002",
      "quantity": 1,
      "fulfillment": {
        "locationId": "LOC-002",
        "city": "Batumi",
        "postalCode": "6000",
        "stockLevel": 5,
        "distance": 15,
        "distanceUnit": "KM",
        "leadTime": 3,
        "leadTimeUnit": "DAYS"
      }
    }
  ]
}
```

### 6.2 Update Rules

| User Action | Browser JSON par effect |
|---|---|
| Product add | Naya item append (ya same product+location ki quantity++) |
| Product remove | Item JSON se remove |
| Quantity increase | `quantity` update (stock limit ke andar) |
| Quantity decrease | `quantity` update (0 ho to remove) |
| Location change | `fulfillment` block replace (naye stock/distance/lead time ke saath) |

```text
Action (add/remove/qty/location)
        ↓
Browser JSON update
        ↓
Cart UI update
```

### 6.3 Same-City Relationship

Storage flat list hai; grouping **derive** hoti hai (state mein duplicate store nahi hoti):

```text
Product A → Tbilisi, Product B → Batumi, Product C → Kutaisi, Product D → Tbilisi

Cart view:
Tbilisi ─ A, D
Batumi  ─ B
Kutaisi ─ C
```

`groupBy(fulfillment.locationId)` inline/`useMemo` se compute karein.

### 6.4 Important: Storage ka Source of Truth

Browser storage sirf **client-side selection/context** hai. **Real cart Salesforce basket hai.** Isliye:

- Basket line item par fulfillment `locationId` custom attribute ke taur par bhi save karein (dekhein [11.4](#114-basket-line-item-par-fulfillment-ka-source-of-truth)) taake refresh/device change par data na khoye.
- Browser JSON ko **trusted input na** samjhein; checkout par stock, distance aur lead time server-side **re-validate** karein.

---

## 7. Checkout aur SCAPI Payload

Checkout complete hone par frontend storage se fulfillment info read karke payload banata hai:

```json
{
  "orderId": "ORD-1001",
  "items": [
    {
      "productId": "PROD-001",
      "sku": "SKU-001",
      "quantity": 1,
      "fulfillment": {
        "locationId": "LOC-001",
        "city": "Tbilisi",
        "postalCode": "0105",
        "stockLevel": 15,
        "distance": 8,
        "distanceUnit": "KM",
        "leadTime": 2,
        "leadTimeUnit": "DAYS"
      }
    },
    {
      "productId": "PROD-002",
      "sku": "SKU-002",
      "quantity": 1,
      "fulfillment": {
        "locationId": "LOC-002",
        "city": "Batumi",
        "postalCode": "6000",
        "stockLevel": 5,
        "distance": 15,
        "distanceUnit": "KM",
        "leadTime": 3,
        "leadTimeUnit": "DAYS"
      }
    }
  ]
}
```

Steps:

1. Storage se items read karo.
2. Har item ki location par stock/lead time **re-validate** karo.
3. Invalid ho to user ko error dikhao (cart mein wapas / location change).
4. Valid ho to SCAPI payload banao aur order place karo.

---

## 8. Salesforce Backend

Location master aur order-specific fulfillment data **alag** rakha jata hai — do custom objects:

### 8.1 `Fulfillment_Location__c` (master)

| Field | Type | Purpose |
|---|---|---|
| `Name` | Auto Number/Text | Location record |
| `Location_Id__c` | Text (Unique) | e.g. `LOC-001` |
| `City__c` | Text | City name |
| `Postal_Code__c` | Text | Postal code |
| `Latitude__c` | Number | Latitude |
| `Longitude__c` | Number | Longitude |
| `Active__c` | Checkbox | Active/Inactive |

### 8.2 `Order_Item_Fulfillment__c` (per order item)

Har order item ke liye **ek** fulfillment record.

| Field | Type | Purpose |
|---|---|---|
| `Order__c` | Lookup/Text | Related Order |
| `Order_Item_Id__c` | Text | Related Order Item |
| `Product_Id__c` | Text | Product ID |
| `Product_Name__c` | Text | Product name |
| `SKU__c` | Text | SKU |
| `Quantity__c` | Number | Ordered quantity |
| `Fulfillment_Location__c` | Lookup → `Fulfillment_Location__c` | Related location |
| `Fulfillment_City__c` | Text | City snapshot |
| `Postal_Code__c` | Text | Postal code snapshot |
| `Stock_Level__c` | Number | Checkout-time stock snapshot |
| `Distance__c` | Number | Distance snapshot |
| `Distance_Unit__c` | Picklist | KM / Miles |
| `Lead_Time__c` | Number | Lead time value |
| `Lead_Time_Unit__c` | Picklist | Hours / Days |
| `Fulfillment_Status__c` | Picklist | Pending / Confirmed / Shipped / Delivered |
| `Created_From_SCAPI__c` | Checkbox | SCAPI source indicator |

### 8.3 Relationship

```text
Fulfillment_Location__c
          │ Lookup
          ▼
Order_Item_Fulfillment__c
          ├── Order
          ├── Order Item
          ├── Product
          ├── Quantity
          ├── Stock (snapshot)
          ├── Distance (snapshot)
          ├── Lead Time (snapshot)
          └── Fulfillment Status
```

### 8.4 Example: 1 Order, 3 Cities

```text
Order: ORD-1001
├── Order Item 1 → Product A
├── Order Item 2 → Product B
└── Order Item 3 → Product C

OF-001  ORD-1001  Product A  Tbilisi  0105  Stock 15  8 KM   2 Days
OF-002  ORD-1001  Product B  Batumi   6000  Stock 5   15 KM  3 Days
OF-003  ORD-1001  Product C  Kutaisi  4600  Stock 7   20 KM  4 Days
```

---

## 9. Snapshot Rules

Checkout ke waqt ki values fulfillment record mein **snapshot** ke taur par save hoti hain. Baad mein inventory/distance/lead time change ho jaye to purana order **change nahi** hota.

| Snapshot | Example | Field |
|---|---|---|
| Stock | Checkout par 15 → baad mein 10 | `Stock_Level__c = 15` (rehta hai) |
| Distance | User → Tbilisi = 8 KM | `Distance__c = 8`, `Distance_Unit__c = KM` |
| Lead Time | 2 Days | `Lead_Time__c = 2`, `Lead_Time_Unit__c = DAYS` |
| City / Postal | Tbilisi / 0105 | `Fulfillment_City__c`, `Postal_Code__c` |

---

## 10. Functional Rules

1. Har product ki fulfillment location clearly identify ho.
2. Location PLP se checkout tak preserve rahe.
3. Different cities ke products Cart aur Checkout par distinguish hon.
4. Stock city/location-specific ho.
5. Distance fulfillment location ke against calculate/capture ho.
6. Lead time location/product ke mutabiq maintain ho.
7. Browser storage mein product aur fulfillment info saath ho.
8. Cart update par browser JSON bhi update ho.
9. Checkout par browser data SCAPI payload mein convert ho.
10. Salesforce mein order-level aur product-level fulfillment relationship preserve rahe.
11. Har order item ki fulfillment info separately maintain ho.
12. Historical order ke liye checkout-time stock, distance, lead time preserve hon.
13. Locations master object mein centrally manage hon.
14. Nayi city/location add karne se architecture break na ho (**config/data-driven**, hard-coded 3 cities nahi).

---

## 11. Is Project mein Implementation Guidance

Yeh section is repo ([CLAUDE.md](../CLAUDE.md)) ke rules ke mutabiq hai.

### 11.1 Suggested File Layout

CLAUDE.md rule: *naya commerce concept = apna folder in `src/lib/`.*

```text
src/lib/fulfillment/
├── types.ts                      # FulfillmentLocation, ProductAvailability, CartFulfillment
├── locations.ts                  # location master (ya API se fetch)
├── availability.server.ts        # product availability fetch (server)
├── storage.ts                    # browser JSON read/write/update helpers
├── group-by-location.ts          # cart items → delivery groups
├── validate.server.ts            # checkout-time re-validation
└── scapi-payload.ts              # storage → SCAPI payload

src/components/fulfillment/
├── availability-badge.tsx        # PLP card summary
├── location-selector.tsx         # PDP selector
├── location-group.tsx            # Cart/Checkout group heading + items
└── stories/                      # Storybook stories (mandatory)
```

Har `.ts/.tsx` file par **Apache 2.0 copyright header** lazmi hai (CLAUDE.md dekhein).

### 11.2 Touchpoints (existing code)

| Area | File / Folder |
|---|---|
| PLP tile | [src/components/product-tile/](../src/components/product-tile/) |
| PDP | [src/components/product-view/](../src/components/product-view/), [src/routes/_app.product.$productId.tsx](../src/routes/_app.product.$productId.tsx) |
| Cart UI | [src/components/cart/](../src/components/cart/), [src/routes/_app.cart.tsx](../src/routes/_app.cart.tsx) |
| Basket logic | [src/lib/cart/](../src/lib/cart/) (`basket-action.server.ts`, `basket-schemas.ts`, `shipments.server.ts`, `inventory-validation.ts`) |
| Checkout | [src/components/checkout/](../src/components/checkout/), [src/lib/checkout/](../src/lib/checkout/), [src/routes/_checkout.checkout.tsx](../src/routes/_checkout.checkout.tsx) |
| Place order | [src/lib/checkout/place-order-orchestration.server.ts](../src/lib/checkout/place-order-orchestration.server.ts) |
| Related docs | [README-DELIVERY-ESTIMATES.md](./README-DELIVERY-ESTIMATES.md), [README-SHOPPER-CONTEXT.md](./README-SHOPPER-CONTEXT.md), [README-SCAPI.md](./README-SCAPI.md) |
| Extensions | [src/extensions/](../src/extensions/) — `bopis`, `multiship`, `store-locator` pehle se location/shipment concepts rakhte hain; reuse/align karein |

> **Note:** Naya code likhne se pehle `bopis` (inventory/store), `multiship` (multiple shipments) aur `shipping-delivery` extensions dekh lein — yeh feature un se overlap karta hai. Koshish karein ke naya logic ek **extension** ke taur par ho (`src/extensions/README.md`) taake core template clean rahe.

### 11.3 Data Loading Rules (CLAUDE.md ke mutabiq)

- Availability **server `loader`** se aaye — `useEffect` fetch nahi.
- PLP par availability non-critical → **Promise return**, alag `<Suspense>` + skeleton.
- PDP par selected product ki availability above-the-fold hai → loader mein `await` (CLS/LCP).
- Har deferred Promise ka **apna `<Suspense>`**; component mein `Promise.all`/`.then()` compose **na** karein.
- `clientLoader`/`clientAction` **allowed nahi**.
- Add to cart / remove / qty / location change = **`useFetcher`** (non-navigating mutation).
- Navigation ke liye `Link`/`useNavigate` **project wrappers** (`@/components/link`, `@/hooks/use-navigate`) use karein, `react-router` ke originals nahi.
- URL-driven filters wale routes par `shouldRevalidate` export karein.
- Overlays (location change modal etc.) ke liye `React.lazy()` + deferred mount.

### 11.4 Basket Line Item par Fulfillment ka Source of Truth

CLAUDE.md rule 16: *persistent cross-request state cookies/sessions mein, `localStorage` mein nahi* (SSR/hydration mismatch se bachne ke liye). Requirement "browser storage" kehti hai, isliye recommended approach:

1. **Primary:** Basket line item par custom attributes (`c_fulfillmentLocationId`, `c_fulfillmentCity`, `c_postalCode`, `c_distance`, `c_leadTime`, ...) ya `shipment`/`inventoryId` (jo `basket-schemas.ts` mein pehle se hai) — is se cart refresh/device change par bhi safe.
2. **Browser storage (cache/selection):** Wahi JSON **cookie** ya storage mein rakhein taake PLP→PDP selection preserve ho. Agar `localStorage` hi use karna ho to sirf **non-SSR-critical** data ke liye, aur hydration ke baad read karein.
3. Server hamesha final authority; browser JSON sirf hint.

Yeh design decision team se confirm karna hai — [Open Questions](#14-open-questions).

### 11.5 Styling / UI

- Tailwind utility classes + design tokens (`bg-foreground`, `text-muted-foreground`) — hard-coded colors nahi.
- `cn()` from `@/lib/utils`.
- Shape tokens ke liye `rounded-ui`/`shadow-ui`; `rounded-none`/`shadow-none` add na karein (`docs/README-SHAPE-TOKENS.md`).
- Nayi strings ke liye i18n (`src/locales/`) — labels hard-code na karein (`Stock`, `Distance`, `Lead Time`, `days`).

### 11.6 Testing

- **Unit (Vitest):** `storage.ts` (add/remove/qty/location change), `group-by-location.ts`, `validate.server.ts`, `scapi-payload.ts`.
- **Storybook:** har naye component ki story + snapshot/interaction/a11y tests.
- **Commands:**

```bash
pnpm test src/lib/fulfillment
pnpm typecheck
pnpm lint            # --max-warnings 0
pnpm storybook:test --type=snapshot
```

### 11.7 Changeset

Is package mein har change ke liye changeset lazmi hai: repo root se `pnpm changeset` chalayein aur `@salesforce/template` select karein.

---

## 12. Edge Cases

| Scenario | Expected behavior |
|---|---|
| Product kisi bhi city mein available nahi | PLP/PDP par "Currently unavailable", add to cart disabled |
| Selected location ka stock cart mein hote hue 0 ho gaya | Cart par inventory error banner, user location change kare ya remove kare |
| Quantity > location stock | Quantity picker max = stock; server-side bhi reject |
| Same product do alag cities se | Do alag cart lines, do groups |
| Location inactive ho gayi (`active=false`) | Availability se exclude; existing cart item par warning |
| Lead time `N/A` (stock 0) | "N/A" dikhao, us location se checkout allow na ho |
| Browser storage clear / tamper | Basket (server) se rebuild; tampered values checkout par re-validate hon |
| Guest → login (basket merge) | Fulfillment attributes merge mein preserve hon |
| Nayi city add hui (Kutaisi ke baad Poti) | Sirf master data add ho; code change na ho |
| Distance user location ke baghair | User se postal code/city mangein ya distance hide karke lead time dikhayein |
| Mixed lead times ek order mein | Har delivery group ka apna lead time; overall ETA = sabse zyada |

---

## 13. Acceptance Criteria

- [ ] PLP card par city, stock, postal code, distance, lead time dikhte hain; multi-location par clearly alag.
- [ ] PDP par har location ka detail block aur location selector hai.
- [ ] Add to Cart selected location ke saath save hota hai.
- [ ] Same product + alag location = alag cart line.
- [ ] Cart page items ko city-wise group karta hai.
- [ ] Checkout delivery groups (city-wise) aur har group ka lead time/distance dikhata hai.
- [ ] Add / remove / qty ± / location change par browser JSON update hota hai.
- [ ] Checkout par stock/lead time server-side re-validate hota hai.
- [ ] SCAPI payload mein har item ka `fulfillment` block hai.
- [ ] Salesforce mein har order item ke liye ek `Order_Item_Fulfillment__c` record bana hai, jo `Fulfillment_Location__c` se linked hai.
- [ ] Snapshot values (stock, distance, lead time) baad mein inventory change hone par bhi same rehti hain.
- [ ] Nayi location sirf master data se add ho jati hai.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` aur Storybook tests pass.

---

## 14. Open Questions

1. **Stock 0 wali city:** dikhayein (unavailable) ya exclude karein? (Section 3.4)
2. **Distance:** kis "user location" se calculate hogi — postal code, geolocation, ya saved address? Server-side (lat/long, Haversine) ya provider API se?
3. **Availability ka source:** SCAPI/Inventory (ATS per inventory list) se, custom API se, ya static JSON se?
4. **Browser storage:** `localStorage` ya cookie? (CLAUDE.md rule 16 cookies prefer karta hai)
5. **Order-level ETA:** multiple groups mein overall delivery date sabse zyada lead time hogi?
6. **Salesforce write path:** `Order_Item_Fulfillment__c` records SCAPI hook/Custom API se banenge ya order-created event/flow se?
7. **Existing extensions (`bopis`, `multiship`):** kya inhein extend karna hai ya yeh feature independent extension hoga?
