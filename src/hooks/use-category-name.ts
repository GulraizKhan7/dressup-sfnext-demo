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
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Translation key for a catalog category name: lowercase letters and digits only, e.g.
 * `Face Wash & Cleanse` -> `facewashcleanse`. Names without a Latin letter or digit (already localized by the
 * catalog, e.g. Georgian) have no key and are left untouched.
 */
export const categoryNameKey = (name: string | undefined): string => (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Returns a function that localizes a category name for the active language.
 *
 * Category names come from the Commerce Cloud catalog, which only carries the default-locale name for categories
 * nobody translated in Business Manager. The `categoryNames` namespace (see `src/locales/<locale>/translations.json`)
 * maps the English name to the active language, and the original name is kept when there is no entry, so a name
 * the catalog already localized always wins.
 */
export function useCategoryName(): (name: string | undefined) => string {
    const { t, i18n } = useTranslation('categoryNames');
    const isEnglish = i18n?.language?.toLowerCase().startsWith('en') ?? true;
    return useCallback(
        (name: string | undefined): string => {
            const key = categoryNameKey(name);
            // English is the catalog's own language: keep the name exactly as the catalog returns it.
            if (!name || !key || isEnglish) {
                return name ?? '';
            }
            return t(key, { defaultValue: name });
        },
        [t, isEnglish]
    );
}
