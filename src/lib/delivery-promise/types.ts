/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** One city and the hub that ships from it (`simplified_city_management.json`). */
export interface CityConfig {
    id: string;
    name: string;
    postalCode?: string;
    /** Shopper postcodes starting with one of these belong to this city. */
    postalCodePrefixes?: string[];
    hub: { id: string; name: string; trackingPrefix: string; handlingDays?: number };
    sameCityDistanceKm: number;
}

export interface CityRoute {
    fromCityId: string;
    toCityId: string;
    distanceKm: number;
}

export interface LeadTimeBand {
    maxKm: number;
    leadTimeDays: number;
}

export interface InventoryEntry {
    productId: string;
    productName?: string;
    brand?: string;
    category?: string;
    variantIds?: string[];
    scenario?: string;
    /** Units on hand per hub id. */
    stock: Record<string, number>;
}

export interface CityManagementData {
    defaultCityId: string;
    fallbackHubId: string;
    cities: CityConfig[];
    routes: CityRoute[];
    leadTimeBands: LeadTimeBand[];
    inventory: InventoryEntry[];
}

export interface DeliveryPromiseInput {
    /** Shopper (shipping) postcode. Missing or unknown falls back to the default city. */
    postcode?: string | null;
    /** Master product id or variant id. */
    productId: string;
    quantity: number;
    /** Injected for tests; defaults to now. */
    today?: Date;
}

export interface DeliveryPromise {
    /** Hub id that fulfils the item (also the delivery's location id). */
    locationId: string;
    cityId: string;
    city: string;
    /** Hub handling/prep days (0 unless the hub sets handlingDays). */
    leadTimeDays: number;
    /** Days on the road from the hub city to the shopper city. */
    transitDays: number;
    distanceKm: number;
    /** `YYYY-MM-DD`: today + leadTimeDays + transitDays. */
    deliveryDate: string;
    /** `false` when no hub has enough stock and the fallback hub is used. */
    inStock: boolean;
}

export interface DeliveryLineInput {
    productId: string;
    quantity: number;
}

export interface Delivery<T extends DeliveryLineInput = DeliveryLineInput> {
    /** Stable within one `buildDeliveries` call: `delivery-1`, `delivery-2`, ... */
    id: string;
    locationId: string;
    cityId: string;
    city: string;
    leadTimeDays: number;
    transitDays: number;
    deliveryDate: string;
    inStock: boolean;
    items: T[];
    trackingNumber?: string;
}
