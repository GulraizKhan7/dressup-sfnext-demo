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

import { useTranslation } from 'react-i18next';
import { AccountPanel } from '@/components/account-panel';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton component for the account addresses page content.
 * Matches the structure of the actual addresses page with vertically stacked address cards.
 */
export function AccountAddressesSkeleton() {
    const { t } = useTranslation('account');
    return (
        <AccountPanel>
            <h1 className="mb-3 text-lg font-bold text-foreground">
                {t('navigation.shippingAddresses', { defaultValue: 'Shipping Addresses' })}
            </h1>
            <Skeleton className="h-8 w-36" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 2 }, (_, i) => i).map((index) => (
                    <div key={index} className="min-h-48 space-y-3 border border-border p-6">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-3 w-14" />
                    </div>
                ))}
            </div>
        </AccountPanel>
    );
}

export default AccountAddressesSkeleton;
