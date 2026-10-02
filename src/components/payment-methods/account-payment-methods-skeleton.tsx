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
import type { ReactElement } from 'react';
import { AccountPanel } from '@/components/account-panel';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the account payment methods page.
 * Displays placeholder elements while payment methods data is being loaded.
 */
export function AccountPaymentMethodsSkeleton(): ReactElement {
    return (
        <AccountPanel>
            <Skeleton className="h-6 w-48 mb-3" />
            <Skeleton className="h-8 w-40" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2].map((i) => (
                    <div key={i} className="min-h-48 space-y-3 border border-border p-6">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-56" />
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-3 w-14" />
                    </div>
                ))}
            </div>
        </AccountPanel>
    );
}
