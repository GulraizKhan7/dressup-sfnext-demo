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
import { redirect } from 'react-router';
import type { Route } from './+types/_app._index';
import { resolvePrefix } from '@salesforce/storefront-next-runtime/site-context';
import { Region } from '@/components/region';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';

import { fetchPageWithComponentData } from '@/lib/page-designer/page-loader.server';
import { getLogger } from '@/lib/logger.server';

import hero01 from '/images/hero-01.webp';
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { useTranslation } from 'react-i18next';


export { shouldRevalidate } from '@/lib/revalidation/routes/home';

@PageType({
    name: 'Home Page',
    description: 'Main landing page composed with the Home Page Structure component',
    supportedAspectTypes: [],
})
@RegionDefinition([
    {
        id: 'headerbanner',
        name: 'Header Banner',
        description: 'Add the above-the-fold hero carousel or hero banner',
        maxComponents: 1,
        componentTypeInclusions: ['Layout.heroCarousel', 'Content.hero'],
    },
    {
        id: 'main',
        name: 'Home Page Structure',
        description: 'Add the Home Page Structure component to configure homepage sections in Page Designer',
        maxComponents: 1,
        componentTypeInclusions: ['Layout.homePageStructure'],
    },
])
export class HomePageMetadata {}

export type HomePageData = {
    page: Awaited<ReturnType<typeof fetchPageWithComponentData>>;
    pageUrl: string;
    ogImageUrl: string;
};

/**
 * Server-side loader function that fetches home page data.
 * This function runs on the server during SSR and prepares data for the home page.
 * @returns Page Designer page data and canonical metadata for the homepage
 */
export async function loader(args: Route.LoaderArgs): Promise<HomePageData> {
    const logger = getLogger(args.context);
    logger.debug('HomePage: loader starting');

    const config = getConfig(args.context);
    const requestUrl = new URL(args.request.url);

    // Redirect bare "/" to the default site/locale prefixed homepage
    if (requestUrl.pathname === '/' && config.url?.prefix && config.url.prefix !== '/') {
        const siteRef = config.siteAliasMap?.[config.defaultSiteId] ?? config.defaultSiteId;
        const defaultSite = config.commerce.sites.find((s) => s.id === config.defaultSiteId);
        const defaultLocale = defaultSite?.defaultLocale ?? config.i18n.fallbackLng;
        const localeRef = config.localeAliasMap?.[defaultLocale] ?? defaultLocale;
        const prefixedPath = resolvePrefix({
            prefix: config.url.prefix,
            params: { siteId: siteRef, localeId: localeRef },
        });
        throw redirect(`${prefixedPath}/`);
    }

    const pageUrl = buildCanonicalUrl(requestUrl.origin, requestUrl.pathname, requestUrl.search);
    const page = await fetchPageWithComponentData(args, { pageId: 'homepage' });

    logger.debug('HomePage: page data fetched', { 
        pageId: page?.id, 
        pageName: page?.name, 
        regionCount: page?.regions?.length,
        regions: page?.regions?.map(r => ({ id: r.id, componentCount: r.components?.length }))
    });

    return {
        page,
        pageUrl,
        ogImageUrl: new URL(hero01, requestUrl.origin).href,
    };
}

export function headers(): HeadersInit {
    return {
        // Disable caching for home page to ensure Page Designer changes appear immediately
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
    };
}

/**
 * Home page component that displays the home page content with granular Suspense boundaries.
 * Components within the page handle their own Suspense boundaries for progressive loading.
 * @returns JSX element representing the home page layout
 */
export default function HomePage({ loaderData }: { loaderData: HomePageData }) {
    const { t } = useTranslation('home');

    // Debug logging to check page data
    console.log('HomePage: loaderData.page', loaderData.page);
    console.log('HomePage: page regions', loaderData.page?.regions);
    console.log('HomePage: page is null?', loaderData.page === null);
    console.log('HomePage: page is undefined?', loaderData.page === undefined);

    return (
        <>
            <div className="pb-16 -mt-8">
                <h1 className="sr-only">{t('meta.title', { defaultValue: 'NextGen PWA Kit Store' })}</h1>
                <SeoMeta
                    rawTitle
                    title={t('meta.title', { defaultValue: 'NextGen PWA Kit Store' })}
                    description={t('meta.description', {
                        defaultValue: 'Welcome to our web store for high performers!',
                    })}
                    openGraph={{
                        type: 'website',
                        url: loaderData.pageUrl,
                        image: loaderData.ogImageUrl,
                    }}
                />
                <Region page={loaderData.page} regionId="headerbanner" critical={true} />
                <Region page={loaderData.page} regionId="main" />
            </div>
        </>
    );
}
