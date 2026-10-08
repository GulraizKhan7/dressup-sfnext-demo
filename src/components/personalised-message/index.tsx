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
import { forwardRef, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageDesignerMode } from '@salesforce/storefront-next-runtime/design/react/core';
import type { ComponentDesignMetadata } from '@salesforce/storefront-next-runtime/design/react';
import type { ComponentType } from '@/components/region';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators';

const PERSONALIZATION_TARGET_VALUES = [
    'All Customers',
    'New Customers',
    'Returning Customers',
    'VIP Customers',
    'Logged In',
    'Guest',
] as const;

type PersonalizationTarget = (typeof PERSONALIZATION_TARGET_VALUES)[number];

const MESSAGE_STYLE_VALUES = ['Default', 'Prominent', 'Subtle', 'Alert'] as const;
type MessageStyle = (typeof MESSAGE_STYLE_VALUES)[number];

function normalizePersonalizationTarget(value: string | undefined): PersonalizationTarget {
    if (value && (PERSONALIZATION_TARGET_VALUES as readonly string[]).includes(value)) {
        return value as PersonalizationTarget;
    }
    return 'All Customers';
}

function normalizeMessageStyle(value: string | undefined): MessageStyle {
    if (value && (MESSAGE_STYLE_VALUES as readonly string[]).includes(value)) {
        return value as MessageStyle;
    }
    return 'Default';
}

const MESSAGE_STYLE_CLASS: Record<MessageStyle, string> = {
    Default: 'bg-muted/50 border-border',
    Prominent: 'bg-primary text-primary-foreground border-primary',
    Subtle: 'bg-muted/30 border-border/50',
    Alert: 'bg-destructive/10 border-destructive text-destructive',
};

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('personalisedMessage', {
    name: 'Personalised Message',
    description: 'Display targeted messages based on customer type, location, or other personalization criteria',
    group: 'Content',
})
@RegionDefinition([])
// oxlint-disable-next-line react/only-export-components -- oxlint flags the co-exported Page Designer metadata class; eslint-plugin-react-refresh does not
export class PersonalisedMessageMetadata {
    @AttributeDefinition({
        name: 'Message',
        description: 'The message text to display',
        type: 'text',
    })
    message?: string;

    @AttributeDefinition({
        id: 'personalizationTarget',
        name: 'Target Audience',
        description: 'Who should see this message',
        type: 'enum',
        values: ['All Customers', 'New Customers', 'Returning Customers', 'VIP Customers', 'Logged In', 'Guest'],
        defaultValue: 'All Customers',
    })
    personalizationTarget?: string;

    @AttributeDefinition({
        id: 'messageStyle',
        name: 'Message Style',
        description: 'Visual style of the message',
        type: 'enum',
        values: ['Default', 'Prominent', 'Subtle', 'Alert'],
        defaultValue: 'Default',
    })
    messageStyle?: string;

    @AttributeDefinition({
        id: 'showIcon',
        name: 'Show Icon',
        description: 'Display an icon alongside the message',
        type: 'boolean',
        defaultValue: true,
    })
    showIcon?: boolean;

    @AttributeDefinition({
        id: 'dismissible',
        name: 'Dismissible',
        description: 'Allow users to dismiss the message',
        type: 'boolean',
        defaultValue: false,
    })
    dismissible?: boolean;
}
/* v8 ignore stop */

interface PersonalisedMessageProps extends ComponentProps<'div'> {
    message?: string;
    personalizationTarget?: string;
    messageStyle?: string;
    showIcon?: boolean;
    dismissible?: boolean;

    // Page Designer props (need to be extracted to avoid passing to DOM)
    regionId?: string;
    component?: ComponentType;
    componentData?: Record<string, Promise<unknown>>;
    designMetadata?: ComponentDesignMetadata;
    data?: unknown;
}

export const PersonalisedMessage = forwardRef<HTMLDivElement, PersonalisedMessageProps>(
    (
        {
            className,
            message,
            personalizationTarget,
            messageStyle,
            showIcon = true,
            dismissible = false,
            regionId: _regionId,
            component: _component,
            componentData: _componentData,
            designMetadata: _designMetadata,
            data: _data,
            ...props
        },
        ref
    ) => {
        const { t } = useTranslation('common');
        const { isDesignMode } = usePageDesignerMode();

        const target = normalizePersonalizationTarget(personalizationTarget);
        const style = normalizeMessageStyle(messageStyle);
        const styleClass = MESSAGE_STYLE_CLASS[style];

        const hasMessage = Boolean(message?.trim());

        // Empty state for design mode
        const isUnconfigured = !hasMessage;
        const showEmptyState = isUnconfigured && isDesignMode;

        const resolvedMessage = showEmptyState ? t('personalisedMessage.emptyMessage') : message;

        return (
            <Card
                ref={ref}
                className={cn(
                    'relative overflow-hidden transition-all',
                    styleClass,
                    className
                )}
                {...props}>
                <CardContent className="p-4 md:p-6">
                    <div className="flex items-start gap-3">
                        {showIcon && (
                            <div className="flex-shrink-0 mt-0.5">
                                <div
                                    className={cn(
                                        'w-5 h-5 rounded-full flex items-center justify-center',
                                        style === 'Prominent' && 'bg-primary-foreground/20',
                                        style === 'Alert' && 'bg-destructive/20',
                                        style !== 'Prominent' && style !== 'Alert' && 'bg-foreground/10'
                                    )}>
                                    <svg
                                        className={cn(
                                            'w-3 h-3',
                                            style === 'Prominent' && 'text-primary-foreground',
                                            style === 'Alert' && 'text-destructive',
                                            style !== 'Prominent' && style !== 'Alert' && 'text-foreground'
                                        )}
                                        fill="currentColor"
                                        viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            {hasMessage || showEmptyState ? (
                                <>
                                    <p
                                        className={cn(
                                            'text-sm leading-relaxed whitespace-pre-line',
                                            style === 'Prominent' && 'text-primary-foreground',
                                            style === 'Alert' && 'text-destructive',
                                            style !== 'Prominent' && style !== 'Alert' && 'text-foreground'
                                        )}>
                                        {resolvedMessage}
                                    </p>
                                    {isDesignMode && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            Target: {target}
                                        </div>
                                    )}
                                </>
                            ) : (
                                isDesignMode && (
                                    <p className="text-sm text-muted-foreground">
                                        {t('personalisedMessage.emptyMessage')}
                                    </p>
                                )
                            )}
                        </div>
                        {dismissible && (
                            <button
                                type="button"
                                className={cn(
                                    'flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors',
                                    style === 'Prominent' && 'hover:bg-primary-foreground/10',
                                    style === 'Alert' && 'hover:bg-destructive/10'
                                )}
                                aria-label={t('personalisedMessage.dismiss')}>
                                <svg
                                    className={cn(
                                        'w-4 h-4',
                                        style === 'Prominent' && 'text-primary-foreground',
                                        style === 'Alert' && 'text-destructive',
                                        style !== 'Prominent' && style !== 'Alert' && 'text-foreground'
                                    )}
                                    fill="currentColor"
                                    viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }
);

PersonalisedMessage.displayName = 'PersonalisedMessage';

export default PersonalisedMessage;
