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
import type { ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared account content surface: a white area inside a light grey panel.
 * Used by account sub-pages (addresses, payment methods) so they share one look.
 */
export function AccountPanel({
    children,
    className,
    ...props
}: {
    children: ReactNode;
    className?: string;
} & React.ComponentProps<'div'>): ReactElement {
    return (
        <div className="bg-muted/30 p-4 sm:p-6" data-testid="account-panel">
            <div className={cn('min-h-[32rem] bg-card px-6 py-6 sm:px-6', className)} {...props}>
                {children}
            </div>
        </div>
    );
}

export default AccountPanel;
