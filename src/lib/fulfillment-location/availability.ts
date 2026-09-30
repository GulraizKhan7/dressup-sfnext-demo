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
import availabilityData from './product-availability.json';
import type { CartFulfillment, LocationAvailability, ProductAvailability } from './types';

const products = (availabilityData as unknown as { products: ProductAvailability[] }).products;

/** Index by master id AND by every variant id, so PLP (master) and cart (variant) ids both resolve. */
const productIndex = new Map<string, ProductAvailability>();
for (const product of products) {
    productIndex.set(product.productId, product);
    for (const variantId of product.variantIds) {
        productIndex.set(variantId, product);
    }
}

export function getProductAvailability(productId: string | null | undefined): ProductAvailability | undefined {
    return productId ? productIndex.get(productId) : undefined;
}

/** Master product id for a master or variant id; `undefined` when the product has no fulfillment data. */
export function getMasterProductId(productId: string | null | undefined): string | undefined {
    return getProductAvailability(productId)?.productId;
}

export function isLocationInStock(location: LocationAvailability): boolean {
    return location.stockLevel > 0;
}

/**
 * Orders locations best-first: in-stock before out-of-stock, then shortest lead time, then closest.
 * Does not mutate the input.
 */
export function sortLocationsByPreference(locations: readonly LocationAvailability[]): LocationAvailability[] {
    return [...locations].sort((a, b) => {
        const stockDiff = Number(isLocationInStock(b)) - Number(isLocationInStock(a));
        if (stockDiff !== 0) return stockDiff;
        const leadDiff = (a.leadTime ?? Number.POSITIVE_INFINITY) - (b.leadTime ?? Number.POSITIVE_INFINITY);
        if (leadDiff !== 0) return leadDiff;
        return a.distance - b.distance;
    });
}

/** All locations for a product, best first. Empty when the product has no fulfillment data. */
export function getLocationAvailability(productId: string | null | undefined): LocationAvailability[] {
    const product = getProductAvailability(productId);
    return product ? sortLocationsByPreference(product.availability) : [];
}

export function getDefaultLocation(productId: string | null | undefined): LocationAvailability | undefined {
    return getLocationAvailability(productId)[0];
}

export function toCartFulfillment(location: LocationAvailability): CartFulfillment {
    return {
        locationId: location.fulfillmentLocationId,
        city: location.city,
        postalCode: location.postalCode,
        stockLevel: location.stockLevel,
        distance: location.distance,
        distanceUnit: location.distanceUnit,
        leadTime: location.leadTime,
        leadTimeUnit: location.leadTimeUnit,
    };
}
