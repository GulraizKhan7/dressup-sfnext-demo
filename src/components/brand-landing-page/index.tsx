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

@Component('brandLandingPage', {
    name: 'Brand Landing Page',
    description: 'Brand-specific landing page with hero, brand story, featured products, and personalized messaging',
    group: 'Layout',
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
// oxlint-disable-next-line react/only-export-components -- Page Designer metadata is co-located with its registered component
export class BrandLandingPageMetadata {}

interface BrandLandingPageProps {
    component?: ComponentType;
}

export default function BrandLandingPage({ component }: BrandLandingPageProps) {
    if (!component) return null;

    return (
        <div className="space-y-12">
            {/* Hero Section - Full width */}
            <Region component={component} regionId="hero" />

            {/* Brand Story - Content blocks */}
            <div className="section-container">
                <Region component={component} regionId="brandStory" className="grid grid-cols-1 md:grid-cols-2 gap-8" />
            </div>

            {/* Personalized Message - Targeted messaging */}
            <div className="section-container">
                <Region component={component} regionId="personalizedMessage" />
            </div>

            {/* Featured Products - Product grid */}
            <div className="section-container">
                <Region component={component} regionId="featuredProducts" />
            </div>

            {/* Additional Content - Optional sections */}
            <div className="section-container">
                <Region component={component} regionId="additionalContent" className="space-y-8" />
            </div>
        </div>
    );
}
