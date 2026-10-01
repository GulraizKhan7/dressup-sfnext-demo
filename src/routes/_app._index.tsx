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
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { useTranslation } from 'react-i18next';
import Header from '@/components/mainheader/mainheader';
import HeroCarousel from '@/components/mainherocarousel/mainherocarousel';
import TopPicksSlider from '@/components/maintoppicksslider/maintoppicksslider';
import BagSection from '@/components/mainbagsection/mainbagsection';
import StartsHere from '@/components/mainstarthere/mainstarthere';
import NewAndNow from '@/components/mainnewandnow/mainnewandnow';
import Brands from '@/components/mainbrands/mainbrands';
import DressUp from '@/components/maindressup/maindressup';
import Wordrobe from '@/components/mainwordrobe/wordrobe';
import Footer from '@/components/mainfooter/mainfooter';

export { shouldRevalidate } from '@/lib/revalidation/routes/home';

export type HomePageData = {
    pageUrl: string;
    ogImageUrl: string;
};

export async function loader(args: Route.LoaderArgs): Promise<HomePageData> {
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

    return {
        pageUrl,
        ogImageUrl: new URL('/images/hero.webp', requestUrl.origin).href,
    };
}

export const handle = { customChrome: true } as const;

export default function HomePage({ loaderData }: { loaderData: HomePageData }) {
    const { t } = useTranslation('home');

    return (
        <div className="min-h-screen bg-white font-sans">
            <SeoMeta
                rawTitle
                title={t('meta.title', { defaultValue: 'NextGen PWA Kit Store' })}
                description={t('meta.description', {
                    defaultValue: 'Welcome to our web store for high performers!',
                })}
                openGraph={{ type: 'website', url: loaderData.pageUrl, image: loaderData.ogImageUrl }}
            />
            <Header />
            <HeroCarousel />
            <StartsHere />
            <NewAndNow />
            <Brands />
            <DressUp />
            <TopPicksSlider />
            <BagSection />
            <Wordrobe />
            <Footer />
        </div>
    );
}
