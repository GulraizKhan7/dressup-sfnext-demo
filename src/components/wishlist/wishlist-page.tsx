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
import { type ReactElement, useEffect, useState, useCallback, useMemo } from 'react';
import type { ShopperCustomers, ShopperProducts } from '@/scapi';
import { createLogger } from '@/lib/logger';

const logger = createLogger();
import { Button } from '@/components/ui/button';
import { Link } from '@/components/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { WishlistListItem } from '@/components/wishlist/wishlist-list-item';
import {
    WishlistSortFilter,
    type WishlistSortOption,
    type WishlistFilterOption,
} from '@/components/wishlist/wishlist-sort-filter';
import { getPriceData } from '@/components/product-price/utils';
import { cn } from '@/lib/utils';

type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];
type Product = ShopperProducts.schemas['Product'];

/**
 * Returns true when the product shows as "available" — i.e. InventoryMessage would
 * render IN_STOCK, PRE_ORDER, or BACK_ORDER. Mirrors the status logic in InventoryMessage.
 *
 * Note: The SCAPI Variant schema does not carry an `inventory` object, so InventoryMessage
 * always falls through to `product.inventory` for items from the variants array. We use
 * `product.inventory` directly to stay consistent.
 */
function isItemInStock(product: Product): boolean {
    const inventory = product.inventory;
    if (!inventory) return false;
    if (!inventory.orderable) return false;
    if (inventory.preorderable || inventory.backorderable) return true;
    return (inventory.ats || 0) > 0;
}

/**
 * Returns true when the product shows as OUT_OF_STOCK — i.e. InventoryMessage would
 * render "Out of stock". Items without inventory data (UNKNOWN status) are excluded
 * from both stock filters.
 */
function isItemOutOfStock(product: Product): boolean {
    const inventory = product.inventory;
    if (!inventory) return false;
    if (!inventory.orderable) return true;
    if (inventory.preorderable || inventory.backorderable) return false;
    return (inventory.ats || 0) === 0;
}

/**
 * Returns true when ProductPrice would show a strikethrough list price.
 * Delegates to the existing `getPriceData` utility so the filter stays consistent
 * with the rendered price display — handles master products, tiered prices, price
 * ranges, and promotional prices.
 */
function isProductOnSale(product: Product): boolean {
    return getPriceData(product).isOnSale;
}

/**
 * Skeleton shown while product details are streaming from the server.
 */
export function WishlistSkeleton(): ReactElement {
    const { t } = useTranslation('account');

    return (
        <div className="bg-muted/30 p-6 sm:p-8">
            <div className="bg-card px-6 py-8 sm:px-10">
                <h1 className="text-lg font-bold text-foreground mb-4">{t('navigation.wishlist')}</h1>
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                    {(['skeleton-1', 'skeleton-2', 'skeleton-3', 'skeleton-4'] as const).map((key) => (
                        <div key={key} className="space-y-3">
                            <Skeleton className="w-full aspect-[3/4]" />
                            <Skeleton className="h-4 w-3/4 mx-auto" />
                            <Skeleton className="h-4 w-16 mx-auto" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export interface WishlistPageContentProps {
    items: CustomerProductListItem[];
    productsByProductId: Record<string, Product>;
}

/**
 * WishlistPageContent — full client-side content for the My Wishlist page.
 *
 * Owns all client state: removed-item tracking, sort option, filter option.
 * Computes the filtered/sorted display list from the loader-provided data.
 */
export function WishlistPageContent({ items, productsByProductId }: WishlistPageContentProps): ReactElement {
    const { t } = useTranslation('account');

    // Track removed items client-side, persisted in sessionStorage to survive revalidations
    const [disabledItemIds, setDisabledItemIds] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('wishlist-disabled');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored) as string[];
                    return new Set(parsed);
                } catch (e) {
                    logger.error('Failed to parse stored disabled IDs', { error: e });
                }
            }
        }
        return new Set();
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('wishlist-disabled', JSON.stringify(Array.from(disabledItemIds)));
        }
    }, [disabledItemIds]);

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('wishlist-disabled');
            }
        };
    }, []);

    const [sortOption, setSortOption] = useState<WishlistSortOption>('recently-added');
    const [filterOption, setFilterOption] = useState<WishlistFilterOption>('all');

    const handleItemRemove = useCallback((itemId: string) => {
        setDisabledItemIds((prev) => new Set(prev).add(itemId));
    }, []);

    const visibleItems = useMemo(
        () => items.filter((item) => !item.id || !disabledItemIds.has(item.id)),
        [items, disabledItemIds]
    );

    const displayItems = useMemo(() => {
        const filtered = visibleItems.filter((item) => {
            if (!item.productId) return false;
            const product = productsByProductId[item.productId];
            if (!product?.name) return false;
            if (filterOption === 'all') return true;
            if (filterOption === 'in-stock') return isItemInStock(product);
            if (filterOption === 'out-of-stock') return isItemOutOfStock(product);
            if (filterOption === 'on-sale') return isProductOnSale(product);
            return true;
        });

        if (sortOption === 'recently-added') return filtered;

        return [...filtered].sort((a, b) => {
            const pA = productsByProductId[a.productId ?? ''];
            const pB = productsByProductId[b.productId ?? ''];
            if (sortOption === 'name-asc') return (pA?.name ?? '').localeCompare(pB?.name ?? '');
            if (sortOption === 'price-low') return (pA?.price ?? 0) - (pB?.price ?? 0);
            if (sortOption === 'price-high') return (pB?.price ?? 0) - (pA?.price ?? 0);
            return 0;
        });
    }, [visibleItems, productsByProductId, sortOption, filterOption]);

    // Screen-reader summary of the current result set. Removing an item or changing
    // the filter updates this text; because the region below is always mounted (empty
    // when the wishlist itself is empty), a screen reader hears each change announced.
    // The count reflects displayItems (the filtered/sorted set actually rendered), so
    // narrowing a filter that changes which items show announces the new count.
    const resultSummary = useMemo(() => {
        if (visibleItems.length === 0) return '';
        if (displayItems.length === 0) return t('wishlist.noFilterResults');
        return t('wishlist.itemCount', { count: displayItems.length });
    }, [visibleItems.length, displayItems.length, t]);

    return (
        <div className="bg-muted/30 p-6 sm:p-8" data-testid="wishlist-panel">
            <div className="bg-card px-6 py-8 sm:px-10 min-h-[32rem]">
                {/* List selector (single list) */}
                <div className="flex items-center gap-8 border-b border-border pb-6">
                    <div className="min-w-64 border border-foreground/60 px-4 py-4 text-sm text-foreground">
                        {t('wishlist.pageTitle')}
                        <p
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                            className={cn(
                                'mt-1 text-xs text-muted-foreground',
                                displayItems.length === 0 && visibleItems.length > 0 && 'sr-only'
                            )}>
                            {resultSummary}
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <h1 className="text-lg font-bold text-foreground">{t('wishlist.savedItems')}</h1>
                    {visibleItems.length > 0 && (
                        <WishlistSortFilter
                            sortValue={sortOption}
                            filterValue={filterOption}
                            onSortChange={setSortOption}
                            onFilterChange={setFilterOption}
                        />
                    )}
                </div>

                {visibleItems.length === 0 ? (
                    <div className="py-14">
                        <h2 className="text-base text-foreground mb-4">{t('wishlist.emptyTitle')}</h2>
                        <p className="text-sm text-foreground mb-6">{t('wishlist.emptySubtitle')}</p>
                        <Button asChild size="lg" className="rounded-ui">
                            <Link to="/">{t('wishlist.shopNow', { defaultValue: 'Shop now' })}</Link>
                        </Button>
                    </div>
                ) : displayItems.length === 0 ? (
                    <div aria-hidden="true" className="py-14">
                        <p className="text-sm text-muted-foreground">{t('wishlist.noFilterResults')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 sm:grid-cols-3 lg:grid-cols-4">
                        {displayItems.map((item) => {
                            if (!item.id || !item.productId) return null;
                            const product = productsByProductId[item.productId];
                            if (!product?.name) return null;

                            return (
                                <WishlistListItem
                                    key={item.id}
                                    product={product}
                                    wishlistItem={item}
                                    onRemove={handleItemRemove}
                                />
                            );
                        })}
                    </div>
                )}

                <p className="mt-10 text-xs text-foreground">
                    {t('wishlist.sharedComputerNotice', {
                        defaultValue:
                            'Other people who use this computer will be able to view your Wish List until you sign out.',
                    })}
                </p>
            </div>
        </div>
    );
}
