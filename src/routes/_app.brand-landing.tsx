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
import type { ReactElement } from 'react';
import type { Route } from './+types/_app.brand-landing';
import { Link } from '@/components/link';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import BrandLandingPage from '@/components/brand-landing-page';
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getLogger } from '@/lib/logger.server';
import brandHero from '/images/hero-01.webp';
import { Region } from '@/components/region';
import { fetchPageWithComponentData, type PageWithComponentData } from '@/lib/page-designer/page-loader.server';

@PageType({
    name: 'Brand Landing Page',
    description: 'Brand-specific landing page with hero, brand story, featured products, and personalized messaging',
    supportedAspectTypes: [],
})
@RegionDefinition([
    {
        id: 'hero',
        name: 'Hero Section',
        description: 'Main hero banner for brand introduction',
        maxComponents: 1,
        componentTypeInclusions: ['Content.hero'],
    },
    {
        id: 'brandStory',
        name: 'Brand Story',
        description: 'Brand narrative and messaging (Image + Text, Text Block)',
        maxComponents: 3,
        componentTypeInclusions: ['Content.contentCard', 'Content.textBlock'],
    },
    {
        id: 'personalizedMessage',
        name: 'Personalized Message',
        description: 'Targeted message based on customer segment',
        maxComponents: 1,
        componentTypeInclusions: ['Content.personalisedMessage'],
    },
    {
        id: 'featuredProducts',
        name: 'Featured Products',
        description: 'Product grid showcasing brand products',
        maxComponents: 1,
        componentTypeInclusions: [
            'Layout.productMerchandisingGrid',
            'Layout.productCarousel',
            'Content.productRecommendations',
        ],
    },
    {
        id: 'additionalContent',
        name: 'Additional Content',
        description: 'Optional additional content sections',
        maxComponents: 5,
        componentTypeInclusions: ['Content.contentCard', 'Content.textBlock', 'Layout.grid'],
    },
])
export class BrandLandingPageMetadata {}

export type BrandLandingPageData = {
    page: PageWithComponentData | null;
    pageUrl: string;
    ogImageUrl: string;
};

export async function loader(args: Route.LoaderArgs): Promise<BrandLandingPageData> {
    const logger = getLogger(args.context);
    logger.debug('BrandLanding: loader starting');

    const requestUrl = new URL(args.request.url);

    let page = null;
    // Try multiple possible page IDs
    const possiblePageIds = ['brand-landing', 'brand-landing-page', 'brand-page', 'brand_landing'];

    for (const pageId of possiblePageIds) {
        try {
            page = await fetchPageWithComponentData(args, { pageId });
            if (page) {
                logger.debug('BrandLanding: page fetched successfully', { pageId: page?.id, pageName: page?.name });
                break;
            }
        } catch (error) {
            logger.debug('BrandLanding: failed to fetch page with ID', { pageId, error });
            continue;
        }
    }

    if (!page) {
        logger.error('BrandLanding: failed to fetch page with all possible IDs', { possiblePageIds });
    }

    return {
        page,
        pageUrl: buildCanonicalUrl(requestUrl.origin, requestUrl.pathname, requestUrl.search),
        ogImageUrl: new URL(brandHero, requestUrl.origin).href,
    };
}

/**
 * Static fallback content for when Page Designer page is not configured
 */
function StaticFallbackContent({ t }: { t: TFunction<'brandLanding'> }) {
    return (
        <div className="space-y-16">
            {/* Info Banner */}
            <div className="section-container">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Page Designer Content Not Loaded:</strong> The brand-landing page could not be fetched from Commerce Cloud.
                        This is expected if the page hasn't been created in Business Manager or if there's an authentication issue.
                        Showing static fallback content instead.
                    </p>
                </div>
            </div>

            {/* Hero Section Fallback */}
            <div className="relative h-[500px] bg-muted flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-foreground mb-4">
                        {t('hero.title', { defaultValue: 'Welcome to Our Brand' })}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        {t('hero.subtitle', { defaultValue: 'Discover our story and products' })}
                    </p>
                </div>
            </div>

            {/* Brand Story Fallback */}
            <div className="section-container">
                <h2 className="text-2xl font-semibold text-foreground mb-6">
                    {t('brandStory.title', { defaultValue: 'Our Story' })}
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-3xl">
                    {t('brandStory.content', { defaultValue: 'Learn about our brand journey and commitment to quality.' })}
                </p>
            </div>

            {/* Featured Products Fallback */}
            <div className="section-container">
                <h2 className="text-2xl font-semibold text-foreground mb-6">
                    {t('featuredProducts.title', { defaultValue: 'Featured Products' })}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-muted/50 border border-border rounded-lg p-4 h-64 flex items-center justify-center">
                            <span className="text-muted-foreground">Product {i}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Brand Landing page component that displays brand-specific content
 *
 * This component renders:
 * - Breadcrumb navigation
 * - Page Designer configurable regions with static fallback
 *
 * Header and Footer are automatically included from the root layout.
 * @returns JSX element representing the Brand Landing page
 */
export default function BrandLanding({ loaderData }: { loaderData: BrandLandingPageData }): ReactElement {
    const { t } = useTranslation('brandLanding');

    // If no page data, show static fallback
    if (!loaderData.page) {
        return (
            <div className="pb-8">
                <SeoMeta
                    title={t('title', { defaultValue: 'Brand Landing' })}
                    description={t('meta.description', {
                        defaultValue: 'Discover our brand story and featured products.',
                    })}
                    openGraph={{ type: 'website', url: loaderData.pageUrl, image: loaderData.ogImageUrl }}
                />
                <div className="max-w-screen-2xl mx-auto px-4 pb-6">
                    <Breadcrumb className="mb-2.5">
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link to="/">{t('breadcrumb.home', { defaultValue: 'Home' })}</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{t('breadcrumb.brandLanding', { defaultValue: 'Brand' })}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('title', { defaultValue: 'Brand Landing' })}
                    </h1>
                </div>
                <StaticFallbackContent t={t} />
            </div>
        );
    }

    return (
        <div className="pb-8">
            <SeoMeta
                title={t('title', { defaultValue: 'Brand Landing' })}
                description={t('meta.description', {
                    defaultValue: 'Discover our brand story and featured products.',
                })}
                openGraph={{ type: 'website', url: loaderData.pageUrl, image: loaderData.ogImageUrl }}
            />
            <div className="max-w-screen-2xl mx-auto px-4 pb-6">
                <Breadcrumb className="mb-2.5">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/">{t('breadcrumb.home', { defaultValue: 'Home' })}</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t('breadcrumb.brandLanding', { defaultValue: 'Brand' })}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('title', { defaultValue: 'Brand Landing' })}
                </h1>
            </div>

            {/* Page Designer Regions */}
            <div className="max-w-screen-2xl mx-auto px-4 py-6">
                <Region page={loaderData.page} regionId="hero" />
            </div>
            <div className="max-w-screen-2xl mx-auto px-4 py-6">
                <Region page={loaderData.page} regionId="brandStory" />
            </div>
            <div className="max-w-screen-2xl mx-auto px-4 py-6">
                <Region page={loaderData.page} regionId="personalizedMessage" />
            </div>
            <div className="max-w-screen-2xl mx-auto px-4 py-6">
                <Region page={loaderData.page} regionId="featuredProducts" />
            </div>
            <div className="max-w-screen-2xl mx-auto px-4 py-6">
                <Region page={loaderData.page} regionId="additionalContent" />
            </div>
        </div>
    );
}
