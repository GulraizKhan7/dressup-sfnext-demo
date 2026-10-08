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

import { describe, expect, test } from 'vitest';
import { createReactComponentRegistry } from './registry';
import { initializeRegistry } from './static-registry';

const PAGE_DESIGNER_COMPONENT_TYPES = [
    'Content.announcementBanner',
    'Content.contentCard',
    'Content.hero',
    'Content.pdImage',
    'Content.popularCategory',
    'Content.productRecommendations',
    'Content.productTile',
    'Content.textBlock',
    'Layout.grid',
    'Layout.header',
    'Layout.heroCarousel',
    'Layout.homePageStructure',
    'Layout.megaMenu',
    'Layout.popularCategories',
    'Layout.productCarousel',
    'Layout.productMerchandisingGrid',
];

describe('static Page Designer component mappings', () => {
    test('loads a React implementation for every registered Page Designer component type', async () => {
        const testRegistry = createReactComponentRegistry();
        initializeRegistry(testRegistry);

        await Promise.all(PAGE_DESIGNER_COMPONENT_TYPES.map((typeId) => testRegistry.loadAndRegister(typeId)));

        for (const typeId of PAGE_DESIGNER_COMPONENT_TYPES) {
            expect(testRegistry.hasConcreteComponent(typeId), typeId).toBe(true);
            expect(testRegistry.getComponent(typeId), typeId).toBeDefined();
        }
    });
});
