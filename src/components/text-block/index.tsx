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
import { usePageDesignerMode } from '@salesforce/storefront-next-runtime/design/react/core';
import type { ComponentDesignMetadata } from '@salesforce/storefront-next-runtime/design/react';
import type { ComponentType } from '@/components/region';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { Component } from '@/lib/decorators/component';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { cn } from '@/lib/utils';

@Component('textBlock', {
    name: 'Text Block',
    description: 'A configurable heading and text content block',
    group: 'Content',
})
@RegionDefinition([])
// oxlint-disable-next-line react-refresh/only-export-components -- Page Designer metadata is co-exported
export class TextBlockMetadata {
    @AttributeDefinition({ name: 'Heading', type: 'string' })
    heading?: string;

    @AttributeDefinition({
        name: 'Content',
        description: 'Plain text content. Line breaks are preserved.',
        type: 'text',
    })
    content?: string;
}

interface TextBlockProps {
    heading?: string;
    content?: string;
    className?: string;
    regionId?: string;
    component?: ComponentType;
    componentData?: Record<string, Promise<unknown>>;
    designMetadata?: ComponentDesignMetadata;
    data?: unknown;
}

export default function TextBlock({ heading, content, className }: TextBlockProps) {
    const { isDesignMode } = usePageDesignerMode();
    const hasHeading = Boolean(heading?.trim());
    const hasContent = Boolean(content?.trim());

    if (!hasHeading && !hasContent && !isDesignMode) return null;

    return (
        <section className={cn('section-container space-y-4 py-8', className)}>
            {hasHeading ? (
                <h2 className="text-2xl font-semibold text-foreground">{heading}</h2>
            ) : (
                isDesignMode && <h2 className="text-2xl font-semibold text-muted-foreground">Add a heading</h2>
            )}
            {hasContent ? (
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{content}</p>
            ) : (
                isDesignMode && <p className="whitespace-pre-line leading-relaxed text-muted-foreground">Add content</p>
            )}
        </section>
    );
}
