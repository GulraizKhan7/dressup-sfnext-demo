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
import { describe, expect, it } from 'vitest';
import {
    addDays,
    buildDeliveries,
    calculateDeliveryDate,
    generateTrackingNumber,
    getDistanceKm,
    getTransitDays,
    resolveCityByPostcode,
} from './index';

// Monday 5 Jan 2026 (local time)
const today = new Date(2026, 0, 5);

// Stocked only in one city each (see simplified_city_management.json).
const TBILISI_ONLY = 'DU-893268';
const BATUMI_ONLY = 'DU-893259';
const BATUMI_ONLY_2 = 'DU-892764';

describe('resolveCityByPostcode', () => {
    it('matches by prefix', () => {
        expect(resolveCityByPostcode('0105').id).toBe('TBS');
        expect(resolveCityByPostcode('6000').id).toBe('BUS');
        expect(resolveCityByPostcode('61100').id).toBe('BUS');
        expect(resolveCityByPostcode('4600').id).toBe('KUT');
    });

    it('ignores whitespace and falls back to the default city', () => {
        expect(resolveCityByPostcode(' 60 00 ').id).toBe('BUS');
        expect(resolveCityByPostcode('9999').id).toBe('TBS');
        expect(resolveCityByPostcode(undefined).id).toBe('TBS');
        expect(resolveCityByPostcode('').id).toBe('TBS');
    });
});

describe('distance and transit', () => {
    it('uses the local distance in the same city and routes both ways', () => {
        expect(getDistanceKm('TBS', 'TBS')).toBe(15);
        expect(getDistanceKm('TBS', 'BUS')).toBe(370);
        expect(getDistanceKm('BUS', 'TBS')).toBe(370);
    });

    it('maps distance to transit days by band', () => {
        expect(getTransitDays(15)).toBe(1);
        expect(getTransitDays(150)).toBe(2);
        expect(getTransitDays(230)).toBe(3);
        expect(getTransitDays(370)).toBe(4);
        expect(getTransitDays(9999)).toBe(4);
    });
});

describe('addDays', () => {
    it('adds calendar days across a month end', () => {
        expect(addDays(new Date(2026, 0, 30), 3)).toBe('2026-02-02');
    });
});

describe('calculateDeliveryDate', () => {
    it('is today + transit (+ handling days when a hub sets them) for the fulfilling hub', () => {
        expect(calculateDeliveryDate({ postcode: '0105', productId: TBILISI_ONLY, quantity: 1, today })).toMatchObject({
            locationId: 'HUB-TBS',
            city: 'Tbilisi',
            leadTimeDays: 0,
            transitDays: 1,
            deliveryDate: '2026-01-06',
            inStock: true,
        });
    });

    it('takes longer when the hub is far from the shopper', () => {
        const promise = calculateDeliveryDate({ postcode: '6000', productId: TBILISI_ONLY, quantity: 1, today });
        expect(promise.transitDays).toBe(4);
        expect(promise.deliveryDate).toBe('2026-01-09');
    });

    it('resolves variant ids to the master product stock', () => {
        expect(
            calculateDeliveryDate({ postcode: '6000', productId: `${BATUMI_ONLY}-34`, quantity: 1, today }).locationId
        ).toBe('HUB-BUS');
    });

    it('falls back to the default city when the postcode is missing', () => {
        expect(calculateDeliveryDate({ productId: TBILISI_ONLY, quantity: 1, today }).deliveryDate).toBe('2026-01-06');
    });

    it('falls back to the central hub, out of stock, when no hub has enough units', () => {
        const promise = calculateDeliveryDate({ postcode: '6000', productId: BATUMI_ONLY, quantity: 9999, today });
        expect(promise.inStock).toBe(false);
        expect(promise.locationId).toBe('HUB-TBS');
    });

    it('falls back for unknown products', () => {
        expect(calculateDeliveryDate({ postcode: '0105', productId: 'NOPE', quantity: 1, today }).inStock).toBe(false);
    });
});

describe('buildDeliveries', () => {
    const line = (productId: string, quantity = 1) => ({ productId, quantity });

    it('groups lines with the same hub and lead time into one delivery', () => {
        const deliveries = buildDeliveries([line(BATUMI_ONLY), line(BATUMI_ONLY_2)], '6000', { today });
        expect(deliveries).toHaveLength(1);
        expect(deliveries[0]).toMatchObject({ id: 'delivery-1', locationId: 'HUB-BUS', deliveryDate: '2026-01-06' });
        expect(deliveries[0].items).toHaveLength(2);
    });

    it('splits lines that ship from different hubs / with different lead times', () => {
        const deliveries = buildDeliveries([line(BATUMI_ONLY), line(TBILISI_ONLY)], '6000', { today });
        expect(deliveries.map((d) => [d.id, d.locationId, d.deliveryDate])).toEqual([
            ['delivery-1', 'HUB-BUS', '2026-01-06'],
            ['delivery-2', 'HUB-TBS', '2026-01-09'],
        ]);
    });

    it('recalculates for another postcode', () => {
        expect(buildDeliveries([line(BATUMI_ONLY)], '0105', { today })[0].deliveryDate).toBe('2026-01-09');
    });

    it('skips empty lines and adds tracking only with a seed', () => {
        expect(buildDeliveries([line(BATUMI_ONLY, 0)], '6000', { today })).toEqual([]);
        expect(buildDeliveries([line(BATUMI_ONLY)], '6000', { today })[0].trackingNumber).toBeUndefined();
        expect(
            buildDeliveries([line(BATUMI_ONLY)], '6000', { today, trackingSeed: 'ORD-1' })[0].trackingNumber
        ).toMatch(/^DRS-BUS-\d{8}$/);
    });
});

describe('generateTrackingNumber', () => {
    it('is deterministic and uses the hub prefix', () => {
        expect(generateTrackingNumber('HUB-KUT', 'a')).toBe(generateTrackingNumber('HUB-KUT', 'a'));
        expect(generateTrackingNumber('HUB-KUT', 'a')).toMatch(/^DRS-KUT-\d{8}$/);
        expect(generateTrackingNumber('HUB-KUT', 'a')).not.toBe(generateTrackingNumber('HUB-KUT', 'b'));
    });

    it('uses a generic prefix for an unknown hub', () => {
        expect(generateTrackingNumber('HUB-XXX', 'a')).toMatch(/^DRS-\d{8}$/);
    });
});
