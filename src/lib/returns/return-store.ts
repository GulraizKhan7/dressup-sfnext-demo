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

import type { CreateReturnInput, ReturnRequest, ReturnStatus } from './types';

/**
 * The only module that saves return data. Today it is backed by `localStorage`; when real persistence is added
 * only this file is replaced. Every method is async so callers never depend on the storage being synchronous.
 *
 * Concurrency
 * - Every mutation is one synchronous read-modify-write block. JavaScript cannot interleave two calls inside
 *   it, so two clicks in one tab can never overwrite each other.
 * - Each mutation re-reads storage first, so a change made in another tab is never lost.
 * - `advanceStatus` takes the status the caller saw; a stale double click becomes a no-op instead of skipping a step.
 * - `createReturn` enforces the per-line quantity cap against what is stored, not against what the form saw.
 *
 * React
 * - {@link subscribeToReturns} / {@link getReturnsSnapshot} / {@link getReturnsServerSnapshot} are shaped for
 *   `useSyncExternalStore`. The snapshot object only changes when the stored data changes, and the server snapshot is
 *   one frozen constant, so React never sees a "new" value on an unchanged store (no render loop) and the first
 *   client render matches the server HTML.
 */

export const RETURNS_STORAGE_KEY = 'returns:v1';

export interface ReturnsSnapshot {
    /** False on the server and during hydration, true once the browser store has been read. */
    ready: boolean;
    returns: readonly ReturnRequest[];
}

const SERVER_SNAPSHOT: ReturnsSnapshot = Object.freeze({
    ready: false,
    returns: Object.freeze([]) as readonly ReturnRequest[],
});

const RMA_ATTEMPTS = 10;
const STEPS_BEFORE_FINAL: readonly ReturnStatus[] = ['submitted', 'approved', 'received'];

let snapshot: ReturnsSnapshot | null = null;
let lastRaw: string | null = null;
/** Used only when `localStorage` is unavailable (private mode, blocked storage), so the demo still works in-session. */
let memoryRaw: string | null = null;
let storageUnavailable = false;
const listeners = new Set<() => void>();
let storageListenerAttached = false;

// ---------------------------------------------------------------------------------------------------------------
// Storage access. Every call is guarded: storage can throw or be absent.
// ---------------------------------------------------------------------------------------------------------------

function readRaw(): string | null {
    if (storageUnavailable) return memoryRaw;
    try {
        return window.localStorage.getItem(RETURNS_STORAGE_KEY);
    } catch {
        storageUnavailable = true;
        return memoryRaw;
    }
}

function writeRaw(raw: string): void {
    try {
        window.localStorage.setItem(RETURNS_STORAGE_KEY, raw);
    } catch {
        // Quota or blocked storage: keep the data in memory so the demo still works for this session.
        storageUnavailable = true;
        memoryRaw = raw;
    }
}

function isReturnRequest(value: unknown): value is ReturnRequest {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<ReturnRequest>;
    return (
        typeof candidate.rmaNo === 'string' &&
        typeof candidate.orderNo === 'string' &&
        typeof candidate.status === 'string' &&
        Array.isArray(candidate.items) &&
        Array.isArray(candidate.history)
    );
}

/** Corrupt or foreign data is dropped instead of crashing the page. */
function parse(raw: string | null): ReturnRequest[] {
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(isReturnRequest) : [];
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Snapshot handling
// ---------------------------------------------------------------------------------------------------------------

/** Re-reads storage and replaces the snapshot only if the stored text changed. Returns true when it changed. */
function refresh(): boolean {
    const raw = readRaw();
    if (snapshot && raw === lastRaw) return false;
    lastRaw = raw;
    snapshot = Object.freeze({ ready: true, returns: Object.freeze(parse(raw)) });
    return true;
}

function notify(): void {
    for (const listener of Array.from(listeners)) listener();
}

function handleStorageEvent(event: StorageEvent): void {
    // `key === null` means the whole storage was cleared.
    if (event.key !== null && event.key !== RETURNS_STORAGE_KEY) return;
    if (refresh()) notify();
}

/** Writes the new list, then publishes it. Called only from inside a mutation block. */
function commit(next: ReturnRequest[]): void {
    const raw = JSON.stringify(next);
    writeRaw(raw);
    refresh();
    notify();
}

export function subscribeToReturns(listener: () => void): () => void {
    listeners.add(listener);
    if (!storageListenerAttached && typeof window !== 'undefined') {
        window.addEventListener('storage', handleStorageEvent);
        storageListenerAttached = true;
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && storageListenerAttached) {
            window.removeEventListener('storage', handleStorageEvent);
            storageListenerAttached = false;
        }
    };
}

export function getReturnsSnapshot(): ReturnsSnapshot {
    if (typeof window === 'undefined') return SERVER_SNAPSHOT;
    // Also picks up a write from another tab whose `storage` event has not reached us yet.
    refresh();
    return snapshot ?? SERVER_SNAPSHOT;
}

export function getReturnsServerSnapshot(): ReturnsSnapshot {
    return SERVER_SNAPSHOT;
}

// ---------------------------------------------------------------------------------------------------------------
// Mock data generation
// ---------------------------------------------------------------------------------------------------------------

function randomDigits(length: number): string {
    const bytes = new Uint32Array(length);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 10);
    }
    return Array.from(bytes, (value) => String(value % 10)).join('');
}

/** Bounded retry: ten attempts is far more than a demo store can collide on, then a timestamp suffix guarantees uniqueness. */
function generateRmaNo(existing: readonly ReturnRequest[]): string {
    const taken = new Set(existing.map((request) => request.rmaNo));
    for (let attempt = 0; attempt < RMA_ATTEMPTS; attempt += 1) {
        const candidate = `RMA-${randomDigits(6)}`;
        if (!taken.has(candidate)) return candidate;
    }
    return `RMA-${Date.now()}`;
}

/** Derived from the RMA number, so advancing twice can never produce two different tracking numbers. */
export function getMockTrackingNo(rmaNo: string): string {
    let hash = 0;
    for (let i = 0; i < rmaNo.length; i += 1) hash = (hash * 31 + rmaNo.charCodeAt(i)) >>> 0;
    return `1Z${String(hash).padStart(10, '0').slice(-10)}DEMO`;
}

/** Status the request ends in. Any exchange line means the final step is "Exchange shipped". */
export function getFinalStatus(request: Pick<ReturnRequest, 'items'>): ReturnStatus {
    return request.items.some((item) => item.action === 'exchange') ? 'exchange_shipped' : 'refunded';
}

/** Ordered steps for a request, used by the timeline. */
export function getStatusSteps(request: Pick<ReturnRequest, 'items'>): ReturnStatus[] {
    return [...STEPS_BEFORE_FINAL, getFinalStatus(request)];
}

export function isFinalStatus(request: Pick<ReturnRequest, 'items' | 'status'>): boolean {
    return request.status === getFinalStatus(request);
}

// ---------------------------------------------------------------------------------------------------------------
// Public API (async so a real backend can replace this module without touching callers)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Runs `work` right now, in the caller's tick, and wraps the outcome in a promise. The Promise executor is
 * synchronous, so the read-modify-write inside `work` is never split by an `await`.
 */
function runNow<T>(work: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        try {
            resolve(work());
        } catch (error) {
            reject(error);
        }
    });
}

function readAll(): readonly ReturnRequest[] {
    refresh();
    return snapshot?.returns ?? [];
}

export function listReturns(): Promise<readonly ReturnRequest[]> {
    return runNow(readAll);
}

export function getReturn(rmaNo: string): Promise<ReturnRequest | undefined> {
    return runNow(() => readAll().find((request) => request.rmaNo === rmaNo));
}

export function getReturnForOrder(orderNo: string): Promise<ReturnRequest | undefined> {
    return runNow(() => {
        const forOrder = readAll().filter((request) => request.orderNo === orderNo);
        return forOrder[forOrder.length - 1];
    });
}

export function createReturn(input: CreateReturnInput): Promise<ReturnRequest> {
    return runNow(() => createReturnNow(input));
}

function createReturnNow(input: CreateReturnInput): ReturnRequest {
    refresh();
    const existing = [...(snapshot?.returns ?? [])];

    if (input.items.length === 0) throw new Error('A return needs at least one item.');

    const requested = new Map<string, number>();
    for (const request of existing) {
        if (request.orderNo !== input.orderNo) continue;
        for (const item of request.items)
            requested.set(item.lineKey, (requested.get(item.lineKey) ?? 0) + item.quantity);
    }
    for (const item of input.items) {
        const remaining = item.orderedQuantity - (requested.get(item.lineKey) ?? 0);
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > remaining) {
            throw new Error(`Quantity for ${item.lineKey} exceeds what can still be returned.`);
        }
    }

    const at = new Date().toISOString();
    const request: ReturnRequest = {
        rmaNo: generateRmaNo(existing),
        orderNo: input.orderNo,
        createdAt: at,
        status: 'submitted',
        history: [{ status: 'submitted', at }],
        items: input.items.map((item) => ({ ...item })),
    };
    commit([...existing, request]);
    return request;
}

/**
 * Moves a request one step forward.
 * @param expectedStatus The status the caller was looking at. If the stored status differs (a double click, or another
 * tab already advanced it), nothing changes and the current request is returned, so a step is never skipped.
 */
export function advanceStatus(rmaNo: string, expectedStatus?: ReturnStatus): Promise<ReturnRequest | undefined> {
    return runNow(() => advanceStatusNow(rmaNo, expectedStatus));
}

function advanceStatusNow(rmaNo: string, expectedStatus?: ReturnStatus): ReturnRequest | undefined {
    refresh();
    const existing = [...(snapshot?.returns ?? [])];
    const index = existing.findIndex((request) => request.rmaNo === rmaNo);
    if (index === -1) return undefined;

    const current = existing[index];
    if (expectedStatus && current.status !== expectedStatus) return current;
    if (isFinalStatus(current)) return current;

    const steps = getStatusSteps(current);
    const nextStatus = steps[steps.indexOf(current.status) + 1];
    if (!nextStatus) return current;

    const updated: ReturnRequest = {
        ...current,
        status: nextStatus,
        history: [...current.history, { status: nextStatus, at: new Date().toISOString() }],
        ...(nextStatus === 'exchange_shipped' ? { trackingNo: getMockTrackingNo(current.rmaNo) } : {}),
    };
    existing[index] = updated;
    commit(existing);
    return updated;
}

/** Test helper: clears module state so each test starts clean. Not used by the app. */
export function resetReturnStoreForTests(): void {
    snapshot = null;
    lastRaw = null;
    memoryRaw = null;
    storageUnavailable = false;
}
