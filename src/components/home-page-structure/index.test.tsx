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
import { describe, expect, test, vi } from 'vitest';
import type { ComponentType } from '@/components/region';
import HomePageStructure from './index';

vi.mock('@/components/region', () => ({
    Region: ({ regionId }: { regionId: string }) => <div data-testid={`home-region-${regionId}`} />,
}));

describe('HomePageStructure', () => {
    test('renders the homepage regions in the fixed section order', () => {
        const component = {
            id: 'homepage-structure',
            typeId: 'Layout.homePageStructure',
            regions: [],
        } as ComponentType;

        const { container } = render(<HomePageStructure component={component} />);

        const regions = Array.from(container.querySelectorAll('[data-testid^="home-region-"]')).map((region) =>
            region.getAttribute('data-testid')
        );
        expect(regions).toEqual([
            'home-region-featuredProducts',
            'home-region-popularCategories',
            'home-region-featuredContent',
        ]);
        expect(screen.getByTestId('home-region-featuredProducts').parentElement).toHaveClass('space-y-16');
    });

    test('renders nothing when Page Designer has not supplied the structure component', () => {
        const { container } = render(<HomePageStructure />);

        expect(container).toBeEmptyDOMElement();
    });
});
