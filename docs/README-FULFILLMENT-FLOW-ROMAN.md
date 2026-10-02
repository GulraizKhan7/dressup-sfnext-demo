# Multi-City Fulfillment: Complete Working Flow (Roman Urdu Guide)

Yeh document batata hai ke hamari storefront mein **multi-city fulfillment** abhi kaise kaam kar raha hai: data JSON file se kaise aata hai, kis file mein jata hai, product JSON se storefront ke product se kaise match hota hai, aur PLP se lekar Checkout tak poora flow kya hai.

> Branch: `nestosh/multi-checkout-flow`
> Requirement/spec ke liye dekhein: [README-MULTI-CITY-FULFILLMENT.md](./README-MULTI-CITY-FULFILLMENT.md). Yeh guide us spec ka **implementation walkthrough** hai (code kaise chal raha hai).

---

## 1. Ek nazar mein (Big Picture)

```
product-availability.json  (static data: 40 products, 3 cities)
        │
        ▼
lib/fulfillment-location/availability.ts   (JSON load + index + sorting)
        │
        ├──► PLP  : ProductAvailabilitySummary   (product tile par city/stock/lead time)
        ├──► PDP  : LocationSelector             (city choose karna)
        │              │  choice memory mein: selected-location.ts
        │              ▼
        ├──► Add to Cart: recordAddedItemFulfillment  ──► localStorage (storage.ts)
        │
        ├──► Cart : useFulfillmentSplit  (basket + localStorage join, city-wise cards)
        └──► Checkout: FulfillmentGroups (numbered "Delivery group 1 – Tbilisi")
```

**Do data sources hain, aur dono ka role alag hai:**

| Source | Kya rakhta hai | Role |
|---|---|---|
| **Salesforce Basket (SCAPI)** | Cart mein kaun se products aur kitni quantity | **Source of truth** (cart kya hai) |
| **`product-availability.json`** | Har product kis city mein hai, stock, distance, lead time | Fulfillment ka **static data** |
| **`localStorage`** (`sf.multiCityFulfillment.v1`) | Customer ne cart mein kaunsi city chuni thi | Client-side fulfillment context |

Basket batata hai *kya* cart mein hai; JSON batata hai *kahan se* fulfill hoga.

---

## 2. Data kahan se aata hai: JSON file

### 2.1 File ka location

- **Jo file code use karta hai:** [src/lib/fulfillment-location/product-availability.json](../src/lib/fulfillment-location/product-availability.json)
- **Reference copy (docs):** [docs/data/product-availability.json](./data/product-availability.json) (content bilkul same hai, sirf documentation ke liye)

> Agar data badalna hai to **`src/lib/fulfillment-location/product-availability.json`** edit karein. `docs/data/` wali copy se app par koi asar nahi parta.

### 2.2 JSON ka structure

```jsonc
{
  "_note": "Sample data...",
  "source": "DressUp-products-tshirts-tops.xml",   // catalog XML jahan se products liye gaye
  "totalProducts": 40,

  "locations": [                                    // master list of cities
    { "locationId": "LOC-001", "city": "Tbilisi", "postalCode": "0105", "latitude": 41.7151, "longitude": 44.8271, "active": true },
    { "locationId": "LOC-002", "city": "Batumi",  "postalCode": "6000", ... },
    { "locationId": "LOC-003", "city": "Kutaisi", "postalCode": "4600", ... }
  ],

  "summary": {                                      // sirf reading ke liye: city -> productIds
    "Tbilisi": { "count": 14, "productIds": ["DU-893268", ...] },
    "Batumi":  { "count": 13, ... },
    "Kutaisi": { ... }
  },

  "products": [                                     // ASAL data jo code padhta hai
    {
      "productId": "DU-893268",                     // MASTER product id (catalog ka id)
      "productName": "s.OLIVER - Knitted layering pullover",
      "sku": "DU-893268",
      "manufacturerSku": "2182445 9999",
      "brand": "s.Oliver",
      "category": "1663-t-shirts",
      "variantIds": ["DU-893268-34", "DU-893268-36", "DU-893268-38", "DU-893268-40"],
      "availability": [                             // is product ki locations
        {
          "fulfillmentLocationId": "LOC-001",
          "city": "Tbilisi",
          "postalCode": "0105",
          "stockLevel": 5,
          "distance": 8,        "distanceUnit": "KM",
          "leadTime": 2,        "leadTimeUnit": "DAYS"
        }
      ]
    }
  ]
}
```

**Code sirf `products[]` array padhta hai.** `locations` aur `summary` abhi runtime mein use nahi hote (reference/master data hain).

### 2.3 Abhi data ki halat (sample data)

- Total **40 products**, 3 cities (Tbilisi, Batumi, Kutaisi) mein round-robin se divide kiye gaye.
- **Har product ki abhi sirf 1 location hai** (`availability` array mein 1 entry). Yani abhi PLP/PDP par single-location wala view dikhta hai. Multi-location UI (list / radio selector) tab dikhegi jab kisi product ki `availability` mein 2+ entries hongi. Code dono cases handle karta hai.
- `stockLevel` sample (deterministic) values hain, asli inventory nahi.
- Batumi/Kutaisi ke `latitude/longitude` abhi `null` hain (confirm karne baqi).

---

## 3. Product JSON se storefront product se kaise match hota hai

Yeh sabse important hissa hai. File: [availability.ts](../src/lib/fulfillment-location/availability.ts)

### 3.1 Matching key = `productId`

Storefront ka product (SCAPI) aur JSON ka product **`productId`** se match hota hai. JSON mein `productId` wohi hai jo Commerce Cloud catalog mein hai (jaise `DU-893268`).

### 3.2 Master vs Variant problem aur uska hal

Storefront mein alag-alag jagah alag ids aati hain:

| Jagah | Kaunsi id milti hai | Misaal |
|---|---|---|
| PLP (product tile) | **Master** product id | `DU-893268` |
| PDP (product page) | Master id (`product.id`) | `DU-893268` |
| Cart / Basket | **Variant** id (size select karne ke baad) | `DU-893268-38` |

Agar sirf master id se match karte to cart mein variant id aane par data nahi milta. Isliye load ke waqt ek **index (Map)** banta hai jo **master id aur har variant id dono** ko same product ki taraf point karta hai:

```ts
const productIndex = new Map<string, ProductAvailability>();
for (const product of products) {
    productIndex.set(product.productId, product);          // "DU-893268"    -> product
    for (const variantId of product.variantIds) {
        productIndex.set(variantId, product);              // "DU-893268-38" -> same product
    }
}
```

Is tarah `getProductAvailability('DU-893268')` aur `getProductAvailability('DU-893268-38')` dono ek hi record dete hain. Isi liye JSON mein `variantIds` array zaroori hai.

### 3.3 Agar match na ho to?

Jis product ka JSON mein record nahi (ya `variantIds` mein id missing hai), uske liye:
- PLP/PDP par fulfillment UI **kuch render nahi karti** (`null` return).
- Cart mein woh item **default delivery card** mein rehta hai (city-wise group mein nahi jata).
- Add to cart par fulfillment record **save nahi hota** (no-op).

Yani match na hone par kuch crash nahi hota, bas fulfillment info nahi dikhti.

### 3.4 Sorting (best location pehle)

`sortLocationsByPreference()` locations ko is order mein lagata hai:
1. **In-stock** pehle, out-of-stock (stock 0) baad mein
2. Phir **kam lead time** wali
3. Phir **kam distance** wali

`getDefaultLocation()` = sorted list ki pehli location (best option). Agar customer kuch select na kare to yahi use hoti hai.

---

## 4. File-by-file guide

### 4.1 Data/logic layer: `src/lib/fulfillment-location/`

| File | Kya karti hai |
|---|---|
| [product-availability.json](../src/lib/fulfillment-location/product-availability.json) | Static data (section 2) |
| [types.ts](../src/lib/fulfillment-location/types.ts) | Saari TypeScript types: `ProductAvailability`, `LocationAvailability`, `CartFulfillment`, `CartFulfillmentItem`, `DeliveryGroup`, `FulfillmentPayload` |
| [availability.ts](../src/lib/fulfillment-location/availability.ts) | JSON load, master+variant index, `getProductAvailability`, `getLocationAvailability` (sorted), `getDefaultLocation`, `isLocationInStock`, `toCartFulfillment`. **Asli API lagani ho to sirf yeh file badalni hai.** |
| [selected-location.ts](../src/lib/fulfillment-location/selected-location.ts) | PDP par customer ne kaunsi city chuni, woh **sirf memory** mein (Map) rakhta hai. `useSyncExternalStore` se UI re-render hoti hai. Agar choose ki hui location stock mein nahi to best location par fall back |
| [record-added-item.ts](../src/lib/fulfillment-location/record-added-item.ts) | Add to cart **kamyab hone ke baad** call hota hai. Selected location + product ko localStorage mein save karta hai. Quantity **returned basket** se leta hai (request se nahi) taake dobara add karne par double count na ho |
| [cart-fulfillment.ts](../src/lib/fulfillment-location/cart-fulfillment.ts) | **Pure functions** (koi side effect nahi): `upsertItem`, `removeItem`, `updateQuantity`, `changeLocation`, `resolveCartItems` (basket + storage join), `reconcileWithBasket` (storage ko basket ke mutabiq sync), `groupByLocation` (city-wise groups), `parseCartFulfillmentState` (untrusted JSON validate) |
| [storage.ts](../src/lib/fulfillment-location/storage.ts) | localStorage read/write. Key: `sf.multiCityFulfillment.v1`. `useCartFulfillmentState()` hook |
| [payload.ts](../src/lib/fulfillment-location/payload.ts) | `buildFulfillmentPayload` (order ke liye payload) aur `toBasketLineCustomAttributes` (`c_*` attributes). **Abhi order flow se connect nahi** (section 8) |
| [index.ts](../src/lib/fulfillment-location/index.ts) | Sab kuch ek jagah se export |

### 4.2 UI layer: `src/components/fulfillment-location/`

| File | Kahan use hoti hai | Kya dikhata hai |
|---|---|---|
| [availability-summary.tsx](../src/components/fulfillment-location/availability-summary.tsx) | **PLP** product tile | Ek location: city, stock, postal code, distance, lead time. Kayi locations: har city ki ek chhoti line. Stock 0 par "Unavailable" |
| [location-selector.tsx](../src/components/fulfillment-location/location-selector.tsx) | **PDP** | Har location ka radio card. Out-of-stock disabled. Selection `selected-location.ts` mein jati hai |
| [use-fulfillment-split.ts](../src/components/fulfillment-location/use-fulfillment-split.ts) | **Cart** | Hook: basket ko city ke hisaab se groups mein todta hai + storage ko basket se sync karta hai |
| [cart-group-title.tsx](../src/components/fulfillment-location/cart-group-title.tsx) | **Cart** | `CartGroupTitle` ("Delivery from Tbilisi - 2 out of 3 items" + postal code) aur `CartLineFulfillmentInfo` (har item ke neeche stock/distance/lead time, agar quantity > stock to red warning) |
| [fulfillment-groups.tsx](../src/components/fulfillment-location/fulfillment-groups.tsx) | **Checkout** | Numbered groups: "Delivery group 1 – Tbilisi" + items |
| [use-fulfillment-format.ts](../src/components/fulfillment-location/use-fulfillment-format.ts) | Sab jagah | Labels aur formatters (lead time "2 days", distance "8 km"). i18n namespace `fulfillmentLocation` |
| [fulfillment-location.test.tsx](../src/components/fulfillment-location/fulfillment-location.test.tsx) | Tests | UI tests |

### 4.3 Purani (existing) files jo modify hui hain

| File | Change |
|---|---|
| [product-tile/index.tsx](../src/components/product-tile/index.tsx) | Price ke neeche `<ProductAvailabilitySummary productId={product.productId} />` |
| [product-view/product-view.tsx](../src/components/product-view/product-view.tsx) | Add to Cart se pehle `<LocationSelector productId={product.id} />` |
| [use-product-actions.ts](../src/hooks/product/use-product-actions.ts) | Add to cart success par `recordAddedItemFulfillment(basketData, variantId ya product.id)` |
| [cart-content.tsx](../src/components/cart/cart-content.tsx) | Delivery items ko city-wise cards mein split karta hai |
| [checkout-form-page.tsx](../src/components/checkout/checkout-form-page.tsx) | `<FulfillmentGroups basket={cart} variant="checkout" />` add kiya |
| [en-US](../src/locales/en-US/translations.json), [en-GB](../src/locales/en-GB/translations.json) `translations.json` | `fulfillmentLocation` namespace ke text |

---

## 5. Complete flow: step by step

### Step 1: PLP (Product Listing Page)

1. Product tile render hota hai, `product.productId` (master id) milti hai.
2. `ProductAvailabilitySummary` `getLocationAvailability(productId)` call karta hai.
3. JSON index se product mila to locations (sorted) aati hain:
   - **1 location:** "Available from: Tbilisi", "Stock: 5 · Postal code: 0105", "Distance: 8 km · Lead time: 2 days".
   - **Kayi locations:** "Available locations" + har city ki line.
   - **Stock 0:** "Unavailable".
4. Product JSON mein nahi hai to kuch render nahi hota.

Data static (import ke waqt bundle mein) hai, isliye koi API call/loading state/layout shift nahi.

### Step 2: PDP (Product Detail Page)

1. `LocationSelector productId={product.id}` render hota hai.
2. Har location ka radio card dikhta hai. Default selected = best in-stock location (`getSelectedLocation` fallback).
3. Customer city badalta hai to `setSelectedLocationId(productId, locationId)`:
   - `productId` ko **master id** mein convert karta hai (variant ho to bhi),
   - Map mein `masterId -> locationId` save,
   - listeners ko notify, UI re-render.
4. Yeh choice **sirf memory** mein hai (refresh par jati rahegi); jab tak add to cart na ho, yeh temporary hai.

### Step 3: Add to Cart

1. Customer size select karke Add to Cart dabata hai. SCAPI se **basket mein item add** hota hai (yeh Salesforce ka normal flow hai).
2. Success par [use-product-actions.ts](../src/hooks/product/use-product-actions.ts) mein `recordAddedItemFulfillment(basketData, variantId)` chalta hai:
   - `getProductAvailability(variantId)`: variant id se master product mila (section 3.2),
   - `getSelectedLocation(variantId)`: customer ki chuni hui (ya default) location,
   - basket ki `productItems` mein us `productId` ki line dhoondhi (quantity yahan se),
   - `upsertItem(...)` se localStorage mein save.
3. localStorage mein yeh JSON banta hai (key `sf.multiCityFulfillment.v1`):

```json
{
  "cartItems": [
    {
      "productId": "DU-893268-38",
      "productName": "s.OLIVER - Knitted layering pullover",
      "sku": "DU-893268",
      "quantity": 1,
      "fulfillment": {
        "locationId": "LOC-001",
        "city": "Tbilisi",
        "postalCode": "0105",
        "stockLevel": 5,
        "distance": 8,
        "distanceUnit": "KM",
        "leadTime": 2,
        "leadTimeUnit": "DAYS"
      }
    }
  ]
}
```

Dhyan dein: cart mein `productId` **variant id** (`DU-893268-38`) hoti hai, `sku` master wali.

### Step 4: Cart Page

1. `cart-content.tsx` mein `useFulfillmentSplit(basket)` chalta hai.
2. `toBasketLines()` basket ki lines nikalta hai (bonus products chhod kar).
3. `resolveCartItems(lines, storedState)`: har basket line ke liye
   - agar localStorage mein entry hai to woh (quantity/name basket se update karke),
   - warna JSON ki **default best location** se nayi entry,
   - agar product JSON mein hi nahi to line skip.
4. `groupByLocation()` items ko city ke hisaab se group karta hai (pehle dekhe gaye order mein).
5. Cart mein har group ka apna card: **"Delivery from Tbilisi - 2 out of 3 items"** + postal code. Har item ke neeche stock / distance / lead time. Quantity stock se zyada ho to red alert "Only 5 available in Tbilisi".
6. Jo items ka fulfillment data nahi, woh purane default "Delivery" card mein rehte hain.
7. Ek `useEffect` `reconcileWithBasket` chalata hai: **localStorage ko basket ke mutabiq sync karta hai** (removed products hatao, quantities update, missing entries add). Basket load hone se pehle kuch write nahi hota, taake pending basket storage ko wipe na kare.

### Step 5: Checkout Page

1. `checkout-form-page.tsx` mein `<FulfillmentGroups basket={cart} variant="checkout" />` hai.
2. Wohi logic (basket + storage join, group by city), lekin title numbered: **"Delivery group 1 – Tbilisi"**, **"Delivery group 2 – Batumi"** waghera, har group mein items, distance aur lead time.
3. Yeh bhi storage ko basket se reconcile karta hai.

### Step 6: Order place (abhi baqi)

`payload.ts` mein `buildFulfillmentPayload(orderId, items)` aur `toBasketLineCustomAttributes(item)` **bane hue hain** aur unit tests mein test bhi hote hain, lekin **abhi order-place flow se jude nahi**. Yani abhi order ke saath fulfillment data SCAPI/backend ko **nahi jata**.

---

## 6. Data flow diagram (ek product ka safar)

```
JSON products[]  ──(load, index by master+variant id)──►  productIndex Map
                                                              │
PLP tile (master id) ─── getLocationAvailability ────────────►│ dikhata hai
PDP (master id)      ─── LocationSelector ───────────────────►│ customer choose
                              │ setSelectedLocationId
                              ▼
                     selectedByProduct Map (memory)
                              │
Add to Cart success ──► recordAddedItemFulfillment(basket, variantId)
                              │  (variant id ──► master product ──► selected location)
                              ▼
                localStorage: sf.multiCityFulfillment.v1
                              │
Cart / Checkout ──► resolveCartItems(basketLines, storage) ──► groupByLocation
                              │
                              ▼
             City-wise cards / "Delivery group N – City"
             + reconcileWithBasket  (storage ko basket se sync rakhta hai)
```

---

## 7. Rules jo yaad rakhne hain

1. **Basket = source of truth.** Cart mein kya hai woh basket decide karta hai; localStorage sirf city ka context hai. UI hamesha basket se derive hoti hai, is liye stale data kabhi nahi dikhta.
2. **Ek product = ek location per cart.** Basket mein ek `productId` ki ek hi line hoti hai, to same product ko do cities se add karne par location **replace** hoti hai.
3. **SSR safe.** Server snapshot khali hota hai; localStorage data hydration ke baad aata hai (hydration mismatch nahi).
4. **Corrupt storage safe.** `parseCartFulfillmentState` galat/edited JSON ke invalid entries drop kar deta hai; storage block ho to memory copy use hoti hai.
5. **Stock 0 wali location** PDP par disabled; default hamesha best in-stock.

---

## 8. Abhi kya baqi hai (Known limitations)

| Cheez | Halat |
|---|---|
| Data source | Static JSON. Asli inventory API lagani ho to sirf `availability.ts` badalna hai |
| Har product ki 1 hi location | Sample data ki wajah se. Multi-location UI ready hai, data 2+ locations ka chahiye |
| Order place par fulfillment data bhejna | `payload.ts` ready, connect nahi |
| Basket line `c_fulfillment*` custom attributes | Business Manager mein attributes define karne hain, phir `toBasketLineCustomAttributes` wire karna hai |
| Server-side stock re-validation, SFCC custom objects (`orderItemFulfillment`) | Backend pending (spec section 8) |
| Mini-cart se remove | Storage agli Cart/Checkout visit par sync hota hai (UI phir bhi sahi rehti hai) |
| `localStorage` vs cookies | CLAUDE.md rule 16 cookies prefer karta hai; requirement ke mutabiq abhi `localStorage` |
| Translations | Sirf `en-US` / `en-GB`; baqi locales English par fall back |
| Bundles/sets | Fulfillment data nahi |

---

## 9. Nayi cheez add / data badalne ka tareeqa

**Naya product add karna:** `product-availability.json` ke `products[]` mein entry add karein. **`productId` bilkul catalog wali** ho, aur **saare size/variant ids `variantIds` mein** likhein, warna cart mein match nahi hoga.

**Kisi product ko 2 cities dena:** uski `availability` array mein doosri location object add karein (`fulfillmentLocationId`, `city`, `postalCode`, `stockLevel`, `distance`, `distanceUnit`, `leadTime`, `leadTimeUnit`). PLP par list aur PDP par radio selector khud dikhne lagega.

**Stock 0 karna:** `stockLevel: 0` aur `leadTime: null`. Woh location PDP par disabled dikhegi.

**Storage reset karna (testing):** browser DevTools > Application > Local Storage se `sf.multiCityFulfillment.v1` delete karein.

**Tests chalana:**

```bash
pnpm test src/lib/fulfillment-location
pnpm test src/components/fulfillment-location
```
