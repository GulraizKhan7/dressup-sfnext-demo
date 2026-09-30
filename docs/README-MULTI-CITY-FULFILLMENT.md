# Multi-City Product Availability, Fulfillment aur Delivery Information

> **Status:** Design / Implementation Specification
> **Scope:** PLP, PDP, Cart, Checkout, Browser Storage, SCAPI, SFCC (Business Manager custom objects)
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
8. [SFCC Backend](#8-sfcc-backend-business-manager-custom-objects)
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

Product ki availability, fulfillment location, stock, distance aur lead time ko **PLP → PDP → Cart → Checkout → SCAPI → SFCC Custom Objects** tak consistently preserve karna.

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
                     Order ──▶ Order Items ──▶ orderItemFulfillment
                                                             │ locationId (string ref)
                                                             ▼
                                                 fulfillmentLocation
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

Browser storage sirf **client-side selection/context** hai. **Real cart SFCC basket hai.** Isliye:

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

## 8. SFCC Backend (Business Manager Custom Objects)

Yeh data **Salesforce Core org mein nahi**, balki **B2C Commerce (SFCC) Business Manager** mein **Custom Object Types** ke taur par rakha jayega (BM → Administration → Site Development → Custom Object Types). Isliye `__c` suffix wale Salesforce objects use **nahi** hon ge; SFCC ke camelCase naam use hon ge.

Location master aur order-specific fulfillment data **alag** rakha jata hai — do custom object types:

| Custom Object Type | Purpose | Key | Storage Scope |
|---|---|---|---|
| `fulfillmentLocation` | Location master (LOC-001, LOC-002, LOC-003) | `locationId` | Organization |
| `orderItemFulfillment` | Har order item ka fulfillment snapshot | `fulfillmentId` | Organization |

> **SFCC ki limitations:** Custom objects mein Salesforce jaisa `Lookup` field nahi hota, is liye relationship **string key** (`locationId`, `orderNo`, `orderItemId`) se maintain hoti hai. Picklist ki jagah **enum-of-string** attribute use hota hai.

### 8.1 `fulfillmentLocation` (master)

| Attribute ID | Type | Purpose |
|---|---|---|
| `locationId` (key) | String | Unique location ID, e.g. `LOC-001` |
| `city` | String (mandatory) | City name |
| `postalCode` | String | Postal code |
| `latitude` | Double | Latitude |
| `longitude` | Double | Longitude |
| `active` | Boolean (default `true`) | Active/Inactive |

### 8.2 `orderItemFulfillment` (per order item)

Har order item ke liye **ek** fulfillment record.

| Attribute ID | Type | Purpose |
|---|---|---|
| `fulfillmentId` (key) | String | Unique ID, e.g. `<orderNo>-<orderItemId>` |
| `orderNo` | String | Related Order (`Order.orderNo`) |
| `orderItemId` | String | Related Order Item (product line item `itemId`) |
| `productId` | String | Product ID |
| `productName` | String | Product name |
| `sku` | String | SKU |
| `quantity` | Integer | Ordered quantity |
| `locationId` | String | Reference → `fulfillmentLocation.locationId` |
| `city` | String | City snapshot |
| `postalCode` | String | Postal code snapshot |
| `stockLevel` | Integer | Checkout-time stock snapshot |
| `distance` | Double | Distance snapshot |
| `distanceUnit` | Enum of String | `KM` / `MILES` |
| `leadTime` | Double | Lead time value |
| `leadTimeUnit` | Enum of String | `HOURS` / `DAYS` |
| `fulfillmentStatus` | Enum of String | `PENDING` / `CONFIRMED` / `SHIPPED` / `DELIVERED` |
| `createdFromScapi` | Boolean | SCAPI source indicator |

### 8.3 Relationship

```text
fulfillmentLocation (locationId)
          ▲
          │ locationId (string reference)
          │
orderItemFulfillment (fulfillmentId)
          ├── orderNo      → Order
          ├── orderItemId  → Order Item (Product Line Item)
          ├── productId / sku / quantity
          ├── stockLevel   (snapshot)
          ├── distance     (snapshot)
          ├── leadTime     (snapshot)
          └── fulfillmentStatus
```

### 8.4 Metadata XML (object types create karne ke liye)

Object types **code se** define hote hain aur import kiye jate hain. File: `meta/custom-objecttype-definitions.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">
    <custom-type type-id="fulfillmentLocation">
        <display-name xml:lang="x-default">Fulfillment Location</display-name>
        <staging-mode>source-to-target</staging-mode>
        <storage-scope>organization</storage-scope>
        <key-definition attribute-id="locationId">
            <display-name xml:lang="x-default">Location ID</display-name>
            <type>string</type>
            <min-length>1</min-length>
        </key-definition>
        <attribute-definitions>
            <attribute-definition attribute-id="active">
                <display-name xml:lang="x-default">Active</display-name>
                <type>boolean</type>
                <default-value>true</default-value>
            </attribute-definition>
            <attribute-definition attribute-id="city">
                <display-name xml:lang="x-default">City</display-name>
                <type>string</type>
                <mandatory-flag>true</mandatory-flag>
            </attribute-definition>
            <attribute-definition attribute-id="latitude">
                <display-name xml:lang="x-default">Latitude</display-name>
                <type>double</type>
            </attribute-definition>
            <attribute-definition attribute-id="longitude">
                <display-name xml:lang="x-default">Longitude</display-name>
                <type>double</type>
            </attribute-definition>
            <attribute-definition attribute-id="postalCode">
                <display-name xml:lang="x-default">Postal Code</display-name>
                <type>string</type>
            </attribute-definition>
        </attribute-definitions>
        <group-definitions>
            <attribute-group group-id="general">
                <display-name xml:lang="x-default">General</display-name>
                <attribute attribute-id="locationId"/>
                <attribute attribute-id="city"/>
                <attribute attribute-id="postalCode"/>
                <attribute attribute-id="latitude"/>
                <attribute attribute-id="longitude"/>
                <attribute attribute-id="active"/>
            </attribute-group>
        </group-definitions>
    </custom-type>

    <custom-type type-id="orderItemFulfillment">
        <display-name xml:lang="x-default">Order Item Fulfillment</display-name>
        <staging-mode>no-staging</staging-mode>
        <storage-scope>organization</storage-scope>
        <key-definition attribute-id="fulfillmentId">
            <display-name xml:lang="x-default">Fulfillment ID</display-name>
            <type>string</type>
            <min-length>1</min-length>
        </key-definition>
        <attribute-definitions>
            <attribute-definition attribute-id="orderNo"><type>string</type><mandatory-flag>true</mandatory-flag></attribute-definition>
            <attribute-definition attribute-id="orderItemId"><type>string</type></attribute-definition>
            <attribute-definition attribute-id="productId"><type>string</type></attribute-definition>
            <attribute-definition attribute-id="productName"><type>string</type></attribute-definition>
            <attribute-definition attribute-id="sku"><type>string</type></attribute-definition>
            <attribute-definition attribute-id="quantity"><type>int</type></attribute-definition>
            <attribute-definition attribute-id="locationId"><type>string</type><mandatory-flag>true</mandatory-flag></attribute-definition>
            <attribute-definition attribute-id="city"><type>string</type></attribute-definition>
            <attribute-definition attribute-id="postalCode"><type>string</type></attribute-definition>
            <attribute-definition attribute-id="stockLevel"><type>int</type></attribute-definition>
            <attribute-definition attribute-id="distance"><type>double</type></attribute-definition>
            <attribute-definition attribute-id="distanceUnit">
                <type>enum-of-string</type>
                <value-definitions>
                    <value-definition default="true"><value>KM</value></value-definition>
                    <value-definition><value>MILES</value></value-definition>
                </value-definitions>
            </attribute-definition>
            <attribute-definition attribute-id="leadTime"><type>double</type></attribute-definition>
            <attribute-definition attribute-id="leadTimeUnit">
                <type>enum-of-string</type>
                <value-definitions>
                    <value-definition default="true"><value>DAYS</value></value-definition>
                    <value-definition><value>HOURS</value></value-definition>
                </value-definitions>
            </attribute-definition>
            <attribute-definition attribute-id="fulfillmentStatus">
                <type>enum-of-string</type>
                <value-definitions>
                    <value-definition default="true"><value>PENDING</value></value-definition>
                    <value-definition><value>CONFIRMED</value></value-definition>
                    <value-definition><value>SHIPPED</value></value-definition>
                    <value-definition><value>DELIVERED</value></value-definition>
                </value-definitions>
            </attribute-definition>
            <attribute-definition attribute-id="createdFromScapi"><type>boolean</type></attribute-definition>
        </attribute-definitions>
        <group-definitions>
            <attribute-group group-id="general">
                <display-name xml:lang="x-default">General</display-name>
                <attribute attribute-id="orderNo"/>
                <attribute attribute-id="orderItemId"/>
                <attribute attribute-id="productId"/>
                <attribute attribute-id="productName"/>
                <attribute attribute-id="sku"/>
                <attribute attribute-id="quantity"/>
                <attribute attribute-id="locationId"/>
                <attribute attribute-id="city"/>
                <attribute attribute-id="postalCode"/>
                <attribute attribute-id="stockLevel"/>
                <attribute attribute-id="distance"/>
                <attribute attribute-id="distanceUnit"/>
                <attribute attribute-id="leadTime"/>
                <attribute attribute-id="leadTimeUnit"/>
                <attribute attribute-id="fulfillmentStatus"/>
                <attribute attribute-id="createdFromScapi"/>
            </attribute-group>
        </group-definitions>
    </custom-type>
</metadata>
```

### 8.5 Master Data (location records)

File: `custom-objects/fulfillmentLocation.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<custom-objects xmlns="http://www.demandware.com/xml/impex/customobject/2006-10-31">
    <custom-object type-id="fulfillmentLocation" object-id="LOC-001">
        <object-attribute attribute-id="active">true</object-attribute>
        <object-attribute attribute-id="city">Tbilisi</object-attribute>
        <object-attribute attribute-id="latitude">41.7151</object-attribute>
        <object-attribute attribute-id="longitude">44.8271</object-attribute>
        <object-attribute attribute-id="postalCode">0105</object-attribute>
    </custom-object>
    <custom-object type-id="fulfillmentLocation" object-id="LOC-002">
        <object-attribute attribute-id="active">true</object-attribute>
        <object-attribute attribute-id="city">Batumi</object-attribute>
        <object-attribute attribute-id="postalCode">6000</object-attribute>
    </custom-object>
    <custom-object type-id="fulfillmentLocation" object-id="LOC-003">
        <object-attribute attribute-id="active">true</object-attribute>
        <object-attribute attribute-id="city">Kutaisi</object-attribute>
        <object-attribute attribute-id="postalCode">4600</object-attribute>
    </custom-object>
</custom-objects>
```

(Batumi/Kutaisi ka latitude/longitude business se confirm karke add karein.)

### 8.6 Import kaise karein

Dono XML files ko ek zip mein rakhein:

```text
fulfillment-import/
├── meta/custom-objecttype-definitions.xml
└── custom-objects/fulfillmentLocation.xml
```

Phir:

- **BM se:** Administration → Site Development → **Site Import & Export** → zip upload → import.
- **CLI se:** B2C CLI / `sfcc-ci` ke through instance par upload + import (CI mein bhi chal sakta hai).

Import ke baad `fulfillmentLocation` aur `orderItemFulfillment` **Custom Object Types** list mein nazar aane chahiye.

### 8.7 Order ke waqt record kaise likha jayega

Shopper SCAPI se custom object direct create nahi hota. Fulfillment info ko basket/order tak pohnchane aur records likhne ka flow:

1. Storefront basket line item par `c_fulfillmentLocationId`, `c_fulfillmentCity`, `c_postalCode`, `c_distance`, `c_leadTime` wagaira custom attributes set karta hai (Shopper Baskets API ke `productItems` par `c_` properties; pehle **System Object Types → ProductLineItem** mein yeh attributes define karne honge).
2. Order place hone par SFCC server-side **order hook** ya **Custom SCAPI endpoint** chalta hai.
3. Woh script har `ProductLineItem` ke liye `CustomObjectMgr.createCustomObject('orderItemFulfillment', fulfillmentId)` se ek record banata hai aur snapshot values (stock, distance, lead time) copy karta hai.
4. Yeh sab **ek transaction** mein ho (`Transaction.wrap`) taake partial write na ho.
5. Snapshot **server-side values** se bane, browser JSON se seedha nahi (checkout par stock/lead time re-validate karke).

> Alternative: OCAPI Data API (`/custom_objects/orderItemFulfillment/{id}`) se bhi likha ja sakta hai, lekin hook/Custom SCAPI approach behtar hai kyunke order ke saath atomic hai.

### 8.8 Example: 1 Order, 3 Cities

```text
Order: ORD-1001
├── Order Item 1 → Product A
├── Order Item 2 → Product B
└── Order Item 3 → Product C

ORD-1001-1  Product A  LOC-001  Tbilisi  0105  Stock 15  8 KM   2 Days
ORD-1001-2  Product B  LOC-002  Batumi   6000  Stock 5   15 KM  3 Days
ORD-1001-3  Product C  LOC-003  Kutaisi  4600  Stock 7   20 KM  4 Days
```

---

## 9. Snapshot Rules

Checkout ke waqt ki values fulfillment record mein **snapshot** ke taur par save hoti hain. Baad mein inventory/distance/lead time change ho jaye to purana order **change nahi** hota.

| Snapshot | Example | Field |
|---|---|---|
| Stock | Checkout par 15 → baad mein 10 | `stockLevel = 15` (rehta hai) |
| Distance | User → Tbilisi = 8 KM | `distance = 8`, `distanceUnit = KM` |
| Lead Time | 2 Days | `leadTime = 2`, `leadTimeUnit = DAYS` |
| City / Postal | Tbilisi / 0105 | `city`, `postalCode` |

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
10. SFCC mein order-level aur product-level fulfillment relationship preserve rahe.
11. Har order item ki fulfillment info separately maintain ho.
12. Historical order ke liye checkout-time stock, distance, lead time preserve hon.
13. Locations master object mein centrally manage hon.
14. Nayi city/location add karne se architecture break na ho (**config/data-driven**, hard-coded 3 cities nahi).

---

## 11. Is Project mein Implementation Guidance

Yeh section is repo ([CLAUDE.md](../CLAUDE.md)) ke rules ke mutabiq hai.

### 11.1 File Layout (implemented)

CLAUDE.md rule: *naya commerce concept = apna folder in `src/lib/`.* `src/components/fulfillment/` pehle se BOPIS ka hai, is liye is feature ka naam **`fulfillment-location`** hai.

```text
src/lib/fulfillment-location/
├── types.ts                      # LocationAvailability, CartFulfillment, CartFulfillmentItem, payload types
├── product-availability.json     # sample availability data (40 products x 3 cities)
├── availability.ts               # master/variant lookup, best-location sorting
├── cart-fulfillment.ts           # pure state: upsert/remove/qty/changeLocation, group, reconcile, parse
├── storage.ts                    # localStorage JSON + useCartFulfillmentState (SSR-safe)
├── selected-location.ts          # PDP selection store (per product)
├── record-added-item.ts          # add-to-cart ke baad location JSON mein save
└── payload.ts                    # storage -> SCAPI payload, basket c_* attributes

src/components/fulfillment-location/
├── availability-summary.tsx      # PLP card summary
├── location-selector.tsx         # PDP location picker
├── fulfillment-groups.tsx        # Cart + Checkout city-wise groups (+ JSON sync)
└── use-fulfillment-format.ts     # lead time / distance labels (i18n)
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
- [ ] SFCC mein har order item ke liye ek `orderItemFulfillment` custom object record bana hai, jis ka `locationId` `fulfillmentLocation` se match karta hai.
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
6. **SFCC write path:** `orderItemFulfillment` records order hook se banenge ya Custom SCAPI endpoint se?
7. **Existing extensions (`bopis`, `multiship`):** kya inhein extend karna hai ya yeh feature independent extension hoga?

---

## 15. Frontend Implementation Status

Branch `nestosh/multi-checkout-flow`. Sirf frontend + browser storage; backend (SFCC custom objects, order hook) abhi baqi hai.

| Requirement | Status | Kahan |
|---|---|---|
| PLP: city, stock, postal code, distance, lead time | Done | `product-tile/index.tsx` -> `ProductAvailabilitySummary` |
| PDP: location-wise details + selector | Done | `product-view/product-view.tsx` -> `LocationSelector` |
| Add to Cart: selected location save | Done | `hooks/product/use-product-actions.ts` -> `recordAddedItemFulfillment` |
| Browser storage JSON (add / remove / qty / location) | Done | `lib/fulfillment-location/storage.ts`, `cart-fulfillment.ts` |
| Cart: city-wise groups | Done | `cart/cart-content.tsx` -> `FulfillmentGroups` |
| Checkout: numbered delivery groups | Done | `checkout/checkout-form-page.tsx` -> `FulfillmentGroups` |
| SCAPI payload builder | Done (helper only) | `payload.ts` -> `buildFulfillmentPayload`; order place flow se abhi connect nahi |
| Server-side re-validation at checkout | Pending | backend |
| SFCC custom objects + `orderItemFulfillment` records | Pending | backend (section 8) |
| Basket line `c_*` attributes | Pending | BM mein attributes + `toBasketLineCustomAttributes` wiring |

### Known limitations (jaan bujh kar)

1. **Ek product = ek location per cart.** Salesforce basket mein same `productId` ki ek hi line hoti hai, is liye same product ko do cities se add karne par location **replace** hoti hai (do lines nahi banti). Section 5.3 ka "alag location = alag line" backend/basket-attribute (`c_fulfillmentLocationId` par line split) ke baad mumkin hoga.
2. **Data static hai.** Availability `product-availability.json` se aati hai (sample stock). Asli inventory API se replace karni hogi; `availability.ts` sirf wahi ek jagah hai jo badalni hai.
3. **Storage sync sirf Cart/Checkout par.** Cart ya checkout page khulne par JSON basket ke mutabiq reconcile hota hai (removed products drop, quantities update). Mini-cart se remove karne par JSON agli cart/checkout visit par update hota hai; UI hamesha basket se derive hoti hai, is liye stale data kabhi dikhta nahi.
4. **`localStorage` use hua hai** (requirement ke mutabiq). SSR snapshot khali hota hai, data hydration ke baad aata hai (hydration mismatch nahi). CLAUDE.md rule 16 cookies prefer karta hai — open question 4.
5. **Stock 0 wali location** PDP par disabled dikhti hai; default selection hamesha best in-stock location hoti hai. Add-to-cart button ko location-stock se gate karna abhi nahi kiya (existing SCAPI inventory check hi authoritative hai).
6. Sets/bundles ke liye fulfillment data nahi (unka availability record nahi hai).
7. Translations abhi sirf `en-US` / `en-GB` mein hain (`fulfillmentLocation` namespace); baqi locales English par fall back karte hain.
