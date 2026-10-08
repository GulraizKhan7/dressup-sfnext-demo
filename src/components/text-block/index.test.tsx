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
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TextBlock from './index';

const { usePageDesignerMode } = vi.hoisted(() => ({ usePageDesignerMode: vi.fn() }));

vi.mock('@salesforce/storefront-next-runtime/design/react/core', () => ({
    usePageDesignerMode,
}));

describe('TextBlock', () => {
    beforeEach(() => {
        usePageDesignerMode.mockReturnValue({ isDesignMode: false });
    });

    it('renders configured heading and content', () => {
        render(<TextBlock heading="Our story" content={'First line\nSecond line'} />);

        expect(screen.getByRole('heading', { name: 'Our story', level: 2 })).toBeInTheDocument();
        expect(screen.getByText('First line\nSecond line')).toBeInTheDocument();
    });

    it('shows editable placeholders in Page Designer when fields are empty', () => {
        usePageDesignerMode.mockReturnValue({ isDesignMode: true });

        render(<TextBlock />);

        expect(screen.getByText('Add a heading')).toBeInTheDocument();
        expect(screen.getByText('Add content')).toBeInTheDocument();
    });

    it('renders nothing on the storefront when no content is configured', () => {
        const { container } = render(<TextBlock />);

        expect(container).toBeEmptyDOMElement();
    });
});
