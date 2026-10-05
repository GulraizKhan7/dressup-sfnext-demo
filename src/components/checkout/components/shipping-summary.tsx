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

import { use, type ReactElement } from 'react';
import { Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ShopperBasketsV2, ShopperProducts } from '@/scapi';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Typography } from '@/components/typography';
import { formatCurrency } from '@/lib/currency';
import { formatDeliveryWindow } from '@/lib/date-utils';
import { findImageGroupBy } from '@/lib/product/image-groups-utils';
import { toImageUrl } from '@/lib/images/dynamic-image';
import { CartLineDeliveryInfo } from '@/components/delivery-promise/cart-delivery';
import { useCartDeliveries } from '@/components/delivery-promise/use-cart-deliveries';

type Basket = ShopperBasketsV2.schemas['Basket'];
type ProductMap = Record<string, ShopperProducts.schemas['Product']>;

type CartDelivery = NonNullable<ReturnType<ReturnType<typeof useCartDeliveries>['getDelivery']>>;

/** Splits a shipment's items by delivery (hub + lead time) so each part can show its own delivery lines. */
function splitByDelivery(
    items: Array<ShopperBasketsV2.schemas['ProductItem']>,
    getDelivery: (itemId: string | undefined) => CartDelivery | undefined
): Array<{ key: string; delivery?: CartDelivery; items: Array<ShopperBasketsV2.schemas['ProductItem']> }> {
    const parts = new Map<string, { key: string; delivery?: CartDelivery; items: typeof items }>();
    for (const item of items) {
        const delivery = getDelivery(item.itemId);
        const key = delivery?.id ?? 'no-delivery-data';
        const part = parts.get(key) ?? { key, delivery, items: [] };
        part.items.push(item);
        parts.set(key, part);
    }
    return [...parts.values()];
}

/** Placeholder with the same shape as the Shipping card while the basket / product data resolves. */
export function ShippingSummarySkeleton(): ReactElement {
    return (
        <Card className="gap-4 py-6" data-testid="checkout-shipping-summary-skeleton">
            <CardContent className="space-y-4">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="size-16" />
            </CardContent>
        </Card>
    );
}

interface ShippingSummaryProps {
    basket: Basket;
    productMapPromise: Promise<ProductMap>;
    /** Opens the Shipping Method step ("Change shipping speed"). Omit to hide the link. */
    onChangeShippingSpeed?: () => void;
}

/**
 * First card of the checkout page: the page title, a "Shipping" heading, a "Change shipping speed" link, and the
 * items grouped by shipment. Each shipment shows the method name with its price and a thumbnail per item. Dates: when
 * our own delivery estimate exists for the items (hub + lead time) only that is shown, per delivery; otherwise the
 * shipment shows the selected method's delivery window, when known. Store-pickup shipments are skipped: they have
 * their own pickup section.
 */
export default function ShippingSummary({
    basket,
    productMapPromise,
    onChangeShippingSpeed,
}: ShippingSummaryProps): ReactElement {
    const { t, i18n } = useTranslation('checkout');
    const config = useConfig();
    const { currency } = useSite();
    const productMap = use(productMapPromise);
    const { getDelivery } = useCartDeliveries(basket);

    const items = basket.productItems ?? [];
    const shipments = (basket.shipments ?? []).filter(
        (shipment) => !(shipment as Record<string, unknown>).c_fromStoreId
    );

    const groups = shipments
        .map((shipment) => {
            const record = shipment as Record<string, unknown>;
            const shipmentItems = items.filter((item) => item.shipmentId === shipment.shipmentId);
            // Our own delivery estimate (hub + lead time) is shown per item below. When it exists, it is the only
            // date shown: the SFCC shipping method's delivery window could disagree with it.
            const hasOwnDelivery = shipmentItems.some((item) => getDelivery(item.itemId));
            const arrival = hasOwnDelivery
                ? undefined
                : formatDeliveryWindow(
                      {
                          startAt: record.c_deliveryWindowStartAt as string | undefined,
                          endAt: record.c_deliveryWindowEndAt as string | undefined,
                      },
                      i18n.language
                  );
            const method = shipment.shippingMethod;
            const price = method?.price ?? shipment.shippingTotal;
            return {
                shipment,
                arrival,
                hasOwnDelivery,
                methodName: method?.name,
                methodDescription: method?.description,
                priceLabel:
                    typeof price === 'number'
                        ? price === 0
                            ? t('shippingSummary.free')
                            : formatCurrency(price, i18n.language, currency)
                        : undefined,
                items: shipmentItems,
            };
        })
        .filter((group) => group.items.length > 0);

    return (
        <Card data-testid="checkout-shipping-summary" className="gap-4 py-6">
            <CardContent className="space-y-4">
                <Typography variant="h2" as="h1">
                    {t('pageTitle')}
                </Typography>
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Truck className="size-6 shrink-0" aria-hidden />
                        <Typography variant="h3" as="h2" className="text-2xl font-semibold">
                            {t('shippingSummary.heading')}
                        </Typography>
                    </div>
                    {onChangeShippingSpeed && groups.some((group) => group.methodName) && (
                        <Button
                            type="button"
                            variant="link"
                            onClick={onChangeShippingSpeed}
                            className="h-auto cursor-pointer p-0 text-sm text-info">
                            {t('shippingSummary.changeSpeed')}
                        </Button>
                    )}
                </div>
                {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('shippingSummary.chooseMethod')}</p>
                ) : (
                    <ul role="list" className="list-none space-y-6">
                        {groups.map(
                            ({
                                shipment,
                                arrival,
                                hasOwnDelivery,
                                methodName,
                                methodDescription,
                                priceLabel,
                                items: shipmentItems,
                            }) => (
                                <li key={shipment.shipmentId} className="space-y-3">
                                    <div className="space-y-0.5">
                                        {arrival && (
                                            <p className="text-sm font-semibold text-success">
                                                {t('shippingSummary.arrives', { when: arrival })}
                                            </p>
                                        )}
                                        {methodName ? (
                                            <p className="text-sm text-foreground">
                                                <span
                                                    className={
                                                        arrival || hasOwnDelivery
                                                            ? undefined
                                                            : 'font-semibold text-success'
                                                    }>
                                                    {methodName}
                                                </span>
                                                {priceLabel && <span> · {priceLabel}</span>}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                {t('shippingSummary.chooseMethod')}
                                            </p>
                                        )}
                                        {!arrival && !hasOwnDelivery && methodDescription && (
                                            <p className="text-sm text-muted-foreground">{methodDescription}</p>
                                        )}
                                    </div>
                                    {splitByDelivery(shipmentItems, getDelivery).map(
                                        ({ key, delivery, items: partItems }) => (
                                            <div key={key} className="flex items-start gap-4">
                                                <ul role="list" className="flex shrink-0 list-none flex-wrap gap-3">
                                                    {partItems.map((item) => {
                                                        const product = item.itemId
                                                            ? productMap[item.itemId]
                                                            : undefined;
                                                        const imageGroup = findImageGroupBy(product?.imageGroups, {
                                                            viewType: 'small',
                                                            selectedVariationAttributes: product?.variationValues,
                                                        });
                                                        const imageUrl =
                                                            toImageUrl({ image: imageGroup?.images?.[0], config }) ||
                                                            '';
                                                        const name =
                                                            item.productName ?? product?.name ?? item.productId ?? '';
                                                        const quantity = item.quantity ?? 1;
                                                        return (
                                                            <li key={item.itemId} className="relative" title={name}>
                                                                <div className="size-20 overflow-hidden bg-muted">
                                                                    {imageUrl && (
                                                                        <img
                                                                            src={imageUrl}
                                                                            alt={name}
                                                                            className="size-full object-contain"
                                                                        />
                                                                    )}
                                                                </div>
                                                                {quantity > 1 && (
                                                                    <span
                                                                        className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 text-center text-xs text-primary-foreground"
                                                                        aria-label={t('shippingSummary.quantity', {
                                                                            count: quantity,
                                                                        })}>
                                                                        {quantity}
                                                                    </span>
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                                {delivery && (
                                                    <div className="min-w-0 flex-1 [&>div]:mt-0">
                                                        <CartLineDeliveryInfo delivery={delivery} />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                </li>
                            )
                        )}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
