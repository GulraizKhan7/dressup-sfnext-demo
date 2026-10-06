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
import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import i18n from 'i18next';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import { buildDeliveries, setShopperCityId } from '@/lib/delivery-promise';
import { toDeliveryLines } from '@/components/delivery-promise/use-cart-deliveries';
import { formatDeliveryDate } from '@/components/delivery-promise/use-delivery-format';
import ShippingSummary from './shipping-summary';

const TODAY = new Date(2026, 9, 1);
const dateLabel = (isoDate: string) => formatDeliveryDate(isoDate, i18n.language);

// Resolved once: `use()` tracks promises by identity.
const emptyProductMap = Promise.resolve({});

const deliveryWindow = {
    c_deliveryWindowStartAt: '2026-10-09T00:00:00.000Z',
    c_deliveryWindowEndAt: '2026-10-11T00:00:00.000Z',
};

const buildBasket = (productItems: Array<Record<string, unknown>>) =>
    ({
        basketId: 'basket-1',
        productItems: productItems.map((item) => ({ shipmentId: 'me', ...item })),
        shipments: [
            {
                shipmentId: 'me',
                shippingMethod: { id: 'standard', name: 'Standard shipping', price: 0 },
                ...deliveryWindow,
            },
        ],
    }) as never;

// Async act: `use(productMapPromise)` suspends on first read until the resolved promise is observed.
const renderSummary = async (basket: never) => {
    await act(async () => {
        render(
            <AllProvidersWrapper>
                <Suspense fallback={null}>
                    <ShippingSummary basket={basket} productMapPromise={emptyProductMap} />
                </Suspense>
            </AllProvidersWrapper>
        );
    });
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TODAY);
    act(() => setShopperCityId('BUS'));
});
afterEach(() => {
    vi.useRealTimers();
});

describe('ShippingSummary', () => {
    test('shows items from two hubs as two groups, each with its own delivery date', async () => {
        const productItems = [
            { itemId: 'a1', productId: 'DU-879242-M', productName: 'Polo', quantity: 1 }, // Batumi hub
            { itemId: 'b2', productId: 'DU-879251-S', productName: 'Shirt', quantity: 2 }, // Tbilisi hub
        ];
        const deliveries = buildDeliveries(toDeliveryLines(productItems as never), 'BUS');
        expect(deliveries).toHaveLength(2);

        await renderSummary(buildBasket(productItems));

        const groups = await screen.findAllByTestId('fulfillment-line-info');
        expect(groups).toHaveLength(2);
        deliveries.forEach((delivery, index) => {
            expect(groups[index]).toHaveTextContent(dateLabel(delivery.deliveryDate));
            expect(groups[index]).toHaveTextContent(delivery.city);
        });
    });

    test('shows only our delivery date when it exists, not the shipping method window', async () => {
        await renderSummary(
            buildBasket([{ itemId: 'a1', productId: 'DU-879242-M', productName: 'Polo', quantity: 1 }])
        );

        const summary = await screen.findByTestId('checkout-shipping-summary');
        expect(within(summary).getAllByText(/Delivery by/)).toHaveLength(1);
        expect(within(summary).queryByText(/^Arrives/)).not.toBeInTheDocument();
        expect(within(summary).getByText('Standard shipping')).toBeInTheDocument();
    });

    test('falls back to the shipping method window when there is no delivery data for the items', async () => {
        await renderSummary(
            buildBasket([{ itemId: 'x1', productId: 'NO-HUB-DATA', productName: 'Unknown', quantity: 1 }])
        );

        const summary = await screen.findByTestId('checkout-shipping-summary');
        expect(within(summary).getByText(/^Arrives/)).toBeInTheDocument();
        expect(within(summary).queryByTestId('fulfillment-line-info')).not.toBeInTheDocument();
    });
});
