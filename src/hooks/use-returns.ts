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
import { useMemo, useSyncExternalStore } from 'react';
import {
    getReturnsServerSnapshot,
    getReturnsSnapshot,
    isFinalStatus,
    subscribeToReturns,
    type ReturnsSnapshot,
} from '@/lib/returns/return-store';
import type { ReturnRequest } from '@/lib/returns/types';

/**
 * Reads the return store. `ready` is false on the server and during hydration, so the first client render matches the
 * server HTML; callers render nothing (badge) or a skeleton (tracking page) until it turns true.
 */
export function useReturns(): ReturnsSnapshot {
    return useSyncExternalStore(subscribeToReturns, getReturnsSnapshot, getReturnsServerSnapshot);
}

export function useReturnForOrder(orderNo: string | undefined): { ready: boolean; request: ReturnRequest | undefined } {
    const { ready, returns } = useReturns();
    return useMemo(() => {
        const forOrder = returns.filter((request) => request.orderNo === orderNo);
        return { ready, request: forOrder[forOrder.length - 1] };
    }, [ready, returns, orderNo]);
}

export function useReturnByRma(rmaNo: string | undefined): { ready: boolean; request: ReturnRequest | undefined } {
    const { ready, returns } = useReturns();
    return useMemo(
        () => ({ ready, request: returns.find((request) => request.rmaNo === rmaNo) }),
        [ready, returns, rmaNo]
    );
}

/**
 * `inProgress` is true while any request for the order has not reached its final status (Refunded / Exchange shipped).
 * `ready` is false on the server and during hydration.
 */
export function useReturnInProgress(orderNo: string | undefined): { ready: boolean; inProgress: boolean } {
    const { ready, returns } = useReturns();
    return useMemo(
        () => ({
            ready,
            inProgress: returns.some((request) => request.orderNo === orderNo && !isFinalStatus(request)),
        }),
        [ready, returns, orderNo]
    );
}
