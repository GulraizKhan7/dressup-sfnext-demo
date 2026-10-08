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

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperExperience } from '@/scapi';
import HomePage, { type HomePageData, loader } from './_app._index';
import { createTestContext } from '@/lib/test-utils';
import { fetchPageWithComponentData } from '@/lib/page-designer/page-loader.server';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';

const createMockPage = (): ShopperExperience.schemas['Page'] =>
    ({
        id: 'homepage',
        typeId: 'homepage',
        regions: [
            { id: 'headerbanner', components: [] },
            { id: 'main', components: [] },
        ],
    }) as ShopperExperience.schemas['Page'];

vi.mock('@/components/region', () => ({
    Region: ({
        page,
        regionId,
        critical,
    }: {
        page: ShopperExperience.schemas['Page'] | null;
        regionId: string;
        critical?: boolean;
    }) =>
        page ? (
            <div data-testid={`page-region-${regionId}`} data-region-id={regionId} data-critical={critical} />
        ) : null,
}));

vi.mock('@/components/seo-meta', () => ({
    SeoMeta: () => null,
}));

vi.mock('react-i18next', async () => {
    const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
    return {
        ...actual,
        useTranslation: () => ({
            t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
        }),
    };
});

vi.mock('@/lib/decorators/page-type', () => ({
    PageType: () => (target: unknown) => target,
}));

vi.mock('@/lib/decorators/region-definition', () => ({
    RegionDefinition: () => (target: unknown) => target,
}));

vi.mock('@/lib/page-designer/page-loader.server', () => ({
    fetchPageWithComponentData: vi.fn(),
}));

vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        getConfig: vi.fn(),
    };
});

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    })),
}));

const renderComponent = (page: ShopperExperience.schemas['Page'] | null = createMockPage()) => {
    const data: HomePageData = {
        page: page ? { ...page, componentData: {} } : null,
        pageUrl: 'http://localhost/',
        ogImageUrl: 'http://localhost/__ASSET_MOCK__',
    };
    return render(<HomePage loaderData={data} />);
};

describe('HomePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetchPageWithComponentData).mockResolvedValue(createMockPage());
        vi.mocked(getConfig).mockReturnValue({ pages: { home: { featuredProductsCount: 8 } } } as AppConfig);
    });

    test('renders the Page Designer home region without hardcoded homepage sections', () => {
        const { container } = renderComponent();

        expect(screen.getByRole('heading', { level: 1, name: 'NextGen PWA Kit Store' })).toHaveClass('sr-only');
        expect(screen.getByTestId('page-region-headerbanner')).toHaveAttribute('data-critical', 'true');
        expect(screen.getByTestId('page-region-main')).not.toHaveAttribute('data-critical', 'true');
        expect(container.firstChild).toHaveClass('pb-16', '-mt-8');
        expect(screen.queryByText('Women')).not.toBeInTheDocument();
        expect(screen.queryByText('Featured Products')).not.toBeInTheDocument();
    });

    test('renders no homepage sections when the Page Designer page is missing', () => {
        renderComponent(null);

        expect(screen.queryByTestId('page-region-headerbanner')).not.toBeInTheDocument();
        expect(screen.queryByTestId('page-region-main')).not.toBeInTheDocument();
        expect(screen.queryByText('Women')).not.toBeInTheDocument();
        expect(screen.queryByText('Featured Products')).not.toBeInTheDocument();
    });

    describe('loader', () => {
        let context: ReturnType<typeof createTestContext>;
        let args: LoaderFunctionArgs;

        beforeEach(() => {
            context = createTestContext();
            args = {
                request: new Request('http://localhost/shop?campaign=summer'),
                url: new URL('http://localhost/shop?campaign=summer'),
                params: {},
                context,
                pattern: '/',
            };
        });

        test('loads the homepage through the Page Designer page loader', async () => {
            const page = { ...createMockPage(), componentData: { component: Promise.resolve('data') } };
            vi.mocked(fetchPageWithComponentData).mockResolvedValue(page);

            const result = await loader(args);

            expect(fetchPageWithComponentData).toHaveBeenCalledWith(args, { pageId: 'homepage' });
            expect(result.page).toBe(page);
            expect(result.pageUrl).toBe('http://localhost/shop');
            expect(result.ogImageUrl).toBe('http://localhost/__ASSET_MOCK__');
        });

        test('propagates Page Designer page loading failures', async () => {
            const error = new Error('Page API Error');
            vi.mocked(fetchPageWithComponentData).mockRejectedValue(error);

            await expect(loader(args)).rejects.toBe(error);
        });
    });

    test('re-exports the home page revalidation policy', async () => {
        const { shouldRevalidate } = await import('./_app._index');
        const { shouldRevalidate: shouldRevalidateHome } = await import('@/lib/revalidation/routes/home');
        expect(shouldRevalidate).toBe(shouldRevalidateHome);
    });
});
