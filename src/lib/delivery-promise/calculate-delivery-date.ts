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
import {
    cityManagement,
    getCityById,
    getDistanceKm,
    getHubStock,
    getTransitDays,
    resolveCityByPostcode,
} from './city-management';
import type { CityConfig, DeliveryPromise, DeliveryPromiseInput } from './types';

const DEFAULT_HANDLING_DAYS = 0;

/** `today` + `days` calendar days as `YYYY-MM-DD` (local calendar date, DST-safe). */
export function addDays(today: Date, days: number): string {
    const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + days));
    return date.toISOString().slice(0, 10);
}

function promiseFromHub(hubCity: CityConfig, shopperCity: CityConfig, today: Date, inStock: boolean): DeliveryPromise {
    const leadTimeDays = hubCity.hub.handlingDays ?? DEFAULT_HANDLING_DAYS;
    const distanceKm = getDistanceKm(hubCity.id, shopperCity.id);
    const transitDays = getTransitDays(distanceKm);
    return {
        locationId: hubCity.hub.id,
        cityId: hubCity.id,
        city: hubCity.name,
        leadTimeDays,
        transitDays,
        distanceKm,
        deliveryDate: addDays(today, leadTimeDays + transitDays),
        inStock,
    };
}

/**
 * The single place delivery dates are computed (PDP, cart, checkout and confirmation all call this).
 * Picks the hub with enough stock and the earliest date (ties: nearest). With no such hub it falls back to
 * the fallback hub and reports `inStock: false`.
 */
export function calculateDeliveryDate({
    postcode,
    productId,
    quantity,
    today = new Date(),
}: DeliveryPromiseInput): DeliveryPromise {
    const shopperCity = resolveCityByPostcode(postcode);
    const needed = Math.max(1, quantity);
    const candidates = cityManagement.cities
        .filter((city) => getHubStock(productId, city.hub.id) >= needed)
        .map((city) => promiseFromHub(city, shopperCity, today, true))
        .sort(
            (a, b) => a.leadTimeDays + a.transitDays - (b.leadTimeDays + b.transitDays) || a.distanceKm - b.distanceKm
        );
    if (candidates[0]) return candidates[0];

    const fallback =
        cityManagement.cities.find((city) => city.hub.id === cityManagement.fallbackHubId) ??
        (getCityById(cityManagement.defaultCityId) as CityConfig);
    return promiseFromHub(fallback, shopperCity, today, false);
}
