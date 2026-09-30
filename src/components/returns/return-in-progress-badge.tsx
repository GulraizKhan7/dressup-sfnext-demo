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
import { useTranslation } from 'react-i18next';
import { Link } from '@/components/link';
import { Badge } from '@/components/ui/badge';
import { useReturnForOrder } from '@/hooks/use-returns';
import { routes, routeHref } from '@/route-paths';

/**
 * "Return in progress" badge linking to the tracking page. Renders nothing until the browser store has been read
 * (server and hydration render), so it never causes a hydration mismatch.
 */
export function ReturnInProgressBadge({ orderNo }: { orderNo: string }): ReactElement | null {
    const { t } = useTranslation('returns');
    const { ready, request } = useReturnForOrder(orderNo);
    if (!ready || !request) return null;

    return (
        <Badge asChild variant="info" data-testid="return-in-progress-badge">
            <Link to={routeHref(routes.accountReturnDetail, { rmaNo: request.rmaNo })}>{t('actions.inProgress')}</Link>
        </Badge>
    );
}
