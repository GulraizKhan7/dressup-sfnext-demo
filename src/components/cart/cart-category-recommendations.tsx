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
import { Suspense, type ReactElement } from 'react';
import { Await } from 'react-router';
import type { ShopperSearch } from '@/scapi';
import ProductCarousel from '@/components/product-carousel/carousel';
import { ProductRecommendationSkeleton } from '@/components/product/skeletons';
import { useDeferredRender } from '@/hooks/use-deferred-render';

type ProductHits = ShopperSearch.schemas['ProductSearchHit'][];

interface CartCategoryRecommendationsProps {
    mayAlsoLikePromise: Promise<ProductHits>;
    moreFromCategoriesPromise: Promise<ProductHits>;
    mayAlsoLikeTitle: string;
    moreFromCategoriesTitle: string;
}

/**
 * One category-products carousel with its own deferred mount and Suspense boundary.
 *
 * These are plain category products, not Einstein recommendations, so the carousel is rendered directly and no
 * recommender name is passed along — clicks and impressions are not reported as Einstein recommender events.
 * Mounting is deferred to an idle frame (see `DeferredProductRecommendations`) so the below-the-fold carousel does not
 * compete with the critical paint.
 */
function CategoryProductsCarousel({ title, data }: { title: string; data: Promise<ProductHits> }): ReactElement {
    const shouldRender = useDeferredRender(true);
    const fallback = <ProductRecommendationSkeleton title={title} className="max-w-none px-0" />;

    if (!shouldRender) {
        return fallback;
    }

    return (
        <Suspense fallback={fallback}>
            <Await resolve={data} errorElement={null}>
                {(products: ProductHits) =>
                    products.length > 0 ? (
                        <ProductCarousel products={products} title={title} className="max-w-none px-0" />
                    ) : null
                }
            </Await>
        </Suspense>
    );
}

export default function CartCategoryRecommendations({
    mayAlsoLikePromise,
    moreFromCategoriesPromise,
    mayAlsoLikeTitle,
    moreFromCategoriesTitle,
}: CartCategoryRecommendationsProps): ReactElement {
    return (
        <>
            <CategoryProductsCarousel title={mayAlsoLikeTitle} data={mayAlsoLikePromise} />
            <CategoryProductsCarousel title={moreFromCategoriesTitle} data={moreFromCategoriesPromise} />
        </>
    );
}
