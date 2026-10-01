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

import { useMemo, type ReactElement } from 'react';
import { Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildDeliveries, hasDeliveryData, useShopperCityId } from '@/lib/delivery-promise';
import { useDeliveryFormat } from './use-delivery-format';

export interface OrderDeliveryLine {
    /** Order line item id; unique per line. */
    itemId: string;
    productId: string;
    productName: string;
    quantity: number;
}

interface OrderDeliveriesProps {
    orderNo: string;
    items: readonly OrderDeliveryLine[];
}

/**
 * Order confirmation: each delivery with its items, delivery date and mock tracking number. The tracking
 * numbers are seeded from the order number, so the same order always shows the same numbers. Renders
 * nothing when no line has hub stock data.
 */
export function OrderDeliveries({ orderNo, items }: OrderDeliveriesProps): ReactElement | null {
    const { t, date, leadTime } = useDeliveryFormat();
    const cityId = useShopperCityId();
    const deliveries = useMemo(
        () =>
            buildDeliveries(
                items.filter((item) => hasDeliveryData(item.productId)),
                cityId,
                { trackingSeed: orderNo }
            ),
        [items, cityId, orderNo]
    );
    if (deliveries.length === 0) return null;

    return (
        <Card className="border border-border/70" data-testid="order-deliveries">
            <CardHeader className="pb-3">
                <CardTitle as="h2" className="text-2xl font-medium">
                    {t('deliveriesTitle', 'Deliveries')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul role="list" className="space-y-4 list-none">
                    {deliveries.map((delivery, index) => (
                        <li
                            key={delivery.id}
                            data-testid={`order-delivery-${delivery.id}`}
                            className="rounded-ui border border-border/70 p-4">
                            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                                <Truck className="size-4 shrink-0" aria-hidden />
                                {t('deliveryNumberFrom', {
                                    number: index + 1,
                                    total: deliveries.length,
                                    city: delivery.city,
                                    defaultValue: 'Delivery {{number}} of {{total}} – from {{city}}',
                                })}
                            </h3>
                            <dl className="mt-2 grid gap-1 text-sm text-muted-foreground md:grid-cols-3">
                                <div>
                                    <dt className="font-medium text-foreground">{t('arrives', 'Arrives')}</dt>
                                    <dd>
                                        {date(delivery.deliveryDate)} (
                                        {leadTime(delivery.leadTimeDays + delivery.transitDays)})
                                    </dd>
                                </div>
                                {delivery.trackingNumber && (
                                    <div>
                                        <dt className="font-medium text-foreground">
                                            {t('trackingNumber', 'Tracking number')}
                                        </dt>
                                        <dd data-testid={`tracking-${delivery.id}`}>{delivery.trackingNumber}</dd>
                                    </div>
                                )}
                            </dl>
                            <ul role="list" className="mt-3 space-y-1 text-sm list-none">
                                {delivery.items.map((item) => (
                                    <li key={item.itemId}>
                                        {item.productName} × {item.quantity}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

export default OrderDeliveries;
