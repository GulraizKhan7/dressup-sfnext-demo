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
import { Region, type ComponentType } from '@/components/region';
import { Component, RegionDefinition } from '@/lib/decorators';

@Component('homePageStructure', {
    name: 'Home Page Structure',
    description: 'Fixed homepage section layout with content configured through Page Designer regions',
    group: 'Layout',
})
@RegionDefinition([
    {
        id: 'featuredProducts',
        name: 'Featured Products',
        description: 'Add a product carousel or merchandising grid',
        maxComponents: 1,
        componentTypeInclusions: [
            'Layout.productCarousel',
            'Layout.productMerchandisingGrid',
            'Content.productRecommendations',
        ],
    },
    {
        id: 'popularCategories',
        name: 'Popular Categories',
        description: 'Add a configurable category carousel',
        maxComponents: 1,
        componentTypeInclusions: ['Layout.popularCategories'],
    },
    {
        id: 'featuredContent',
        name: 'Featured Content',
        description: 'Add content cards, text blocks, or a grid of editorial content',
        maxComponents: 10,
        componentTypeInclusions: ['Content.contentCard', 'Content.textBlock', 'Layout.grid'],
    },
])
// oxlint-disable-next-line react/only-export-components -- Page Designer metadata is co-located with its registered component
export class HomePageStructureMetadata {}

interface HomePageStructureProps {
    component?: ComponentType;
}

export default function HomePageStructure({ component }: HomePageStructureProps) {
    if (!component) return null;

    return (
        <div className="space-y-16">
            <Region component={component} regionId="featuredProducts" />
            <Region component={component} regionId="popularCategories" />
            <Region component={component} regionId="featuredContent" />
        </div>
    );
}
