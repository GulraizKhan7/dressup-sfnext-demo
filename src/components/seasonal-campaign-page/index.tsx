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

@Component('seasonalCampaignPage', {
    name: 'Seasonal Campaign Page',
    description: 'Seasonal promotional page with campaign hero, messaging, product highlights, and call-to-action sections',
    group: 'Layout',
})
@RegionDefinition([
    {
        id: 'campaignHero',
        name: 'Campaign Hero',
        description: 'Main campaign banner with promotional messaging',
        maxComponents: 1,
        componentTypeInclusions: ['Content.hero'],
    },
    {
        id: 'campaignMessage',
        name: 'Campaign Message',
        description: 'Key campaign messaging and announcements',
        maxComponents: 2,
        componentTypeInclusions: ['Content.personalisedMessage', 'Content.textBlock'],
    },
    {
        id: 'campaignHighlights',
        name: 'Campaign Highlights',
        description: 'Featured campaign content (Image + Text cards)',
        maxComponents: 4,
        componentTypeInclusions: ['Content.contentCard'],
    },
    {
        id: 'campaignProducts',
        name: 'Campaign Products',
        description: 'Products featured in the campaign',
        maxComponents: 1,
        componentTypeInclusions: [
            'Layout.productMerchandisingGrid',
            'Layout.productCarousel',
            'Content.productRecommendations',
        ],
    },
    {
        id: 'campaignCTA',
        name: 'Call-to-Action',
        description: 'Final call-to-action section',
        maxComponents: 1,
        componentTypeInclusions: ['Content.contentCard', 'Content.textBlock'],
    },
])
// oxlint-disable-next-line react/only-export-components -- Page Designer metadata is co-located with its registered component
export class SeasonalCampaignPageMetadata {}

interface SeasonalCampaignPageProps {
    component?: ComponentType;
}

export default function SeasonalCampaignPage({ component }: SeasonalCampaignPageProps) {
    if (!component) return null;

    return (
        <div className="space-y-16">
            {/* Campaign Hero - Full width promotional banner */}
            <Region component={component} regionId="campaignHero" />

            {/* Campaign Message - Key announcements */}
            <div className="section-container">
                <Region component={component} regionId="campaignMessage" className="space-y-4" />
            </div>

            {/* Campaign Highlights - Featured content cards */}
            <div className="section-container">
                <Region component={component} regionId="campaignHighlights" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" />
            </div>

            {/* Campaign Products - Product showcase */}
            <div className="section-container">
                <Region component={component} regionId="campaignProducts" />
            </div>

            {/* Campaign CTA - Final call-to-action */}
            <div className="section-container">
                <Region component={component} regionId="campaignCTA" />
            </div>
        </div>
    );
}
