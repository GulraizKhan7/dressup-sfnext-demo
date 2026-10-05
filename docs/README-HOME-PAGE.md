# Home Page: data flow and styling

This document explains how the home page (`/`) gets its data, which files are involved, and how styling is applied. All paths are relative to the project root `dressup-sfnext-demo/`.

## 1. Overview

```
Browser request "/"
  -> src/routes.ts                         (file-based routes)
  -> src/root.tsx                          (<html>, theme CSS, providers)
  -> src/routes/_app.tsx                   (layout loader: categories + mega menu data)
       -> src/routes/_app._index.tsx       (HOME PAGE route)
            loader: featured products (streamed), SEO urls
```

The home route sets `handle = { customChrome: true }`. That tells the `_app.tsx` layout **not** to render its default header and footer, because the home page renders its own (`Header` and `Footer`) inside the page.

Everything is loaded on the server (SSR) through route loaders. There is no client-side `useEffect` fetching.

## 2. Where the data comes from

### 2.1 Layout loader: `src/routes/_app.tsx`

| Data | Function | SCAPI API | Used by |
|---|---|---|---|
| Root category and sub categories | `fetchCategory`, `fetchCategoriesByIds` in `src/lib/api/categories.server.ts` | Shopper Products `getCategory` / `getCategories` | The navigation menu in the header |
| Mega menu component | `fetchComponentWithComponentData({ componentId: 'mega-menu' })` in `src/lib/page-designer/component-loader.server.ts` | Shopper Experience (Page Designer) | Mega menu panels |

This loader only runs on the first navigation (`shouldRevalidate() { return false }`). The home header reads this data with `useRouteLoaderData('routes/_app')`.

### 2.2 Home loader: `src/routes/_app._index.tsx`

| Loader field | Source | Awaited? | Used by |
|---|---|---|---|
| `searchResult` | `fetchCarouselProducts(...)` in `src/components/product-carousel/loaders.ts`, which calls `fetchSearchProducts` in `src/lib/api/search.server.ts` (category `root`, limit `pages.home.featuredProductsCount` = 12, current currency) | No, the Promise is streamed | `StartsHere` (the "Featured Products" section) |
| `pageUrl` | `buildCanonicalUrl` in `src/utils/canonical-url.ts` | n/a | SEO (`SeoMeta`) |
| `ogImageUrl` | `/images/hero.webp` | n/a | Open Graph image |

The loader also redirects a bare `/` to the default site/locale prefixed home page (for example `/us/en-US/`).

Following the project rules in `CLAUDE.md`, nothing non-critical blocks the loader: the products are returned as an unresolved Promise and the page renders with a skeleton until they arrive.

Revalidation is defined in `src/lib/revalidation/routes/home.ts`.

## 3. What is rendered (top to bottom)

`HomePage` in `src/routes/_app._index.tsx`:

```
<SeoMeta>
<Header>            src/components/mainheader/mainheader.tsx
                      - logo, search, city selector, sign in, CartBadge (real basket count + mini cart)
                      - category navigation (ResponsiveNavigationMenu)
<HeroCarousel>      src/components/mainherocarousel/mainherocarousel.tsx
<StartsHere>        src/components/mainstarthere/mainstarthere.tsx
                      - "Featured Products": first 6 products as ProductTile cards + "All Products" button
<NewAndNow>         src/components/mainnewandnow/mainnewandnow.tsx      (static content)
<Brands>            src/components/mainbrands/mainbrands.tsx            (static content)
<DressUp>           src/components/maindressup/maindressup.tsx          (static content)
<BagSection>        src/components/mainbagsection/mainbagsection.tsx    (static content)
<Wordrobe>          src/components/mainwordrobe/wordrobe.tsx            (static content)
<Footer>            src/components/footer/index.tsx -> main-footer.tsx
                      - email sign-up, link columns, language / currency switchers, legal row
```

Notes:
- Only the **Featured Products** section uses live catalog data. The other sections are static design content (images from `public/images/`, text in the components).
- Each product card is the shared `ProductTile` (`src/components/product-tile/index.tsx`), so price, image, link, quick add and the delivery date (`src/components/delivery-promise/availability-summary.tsx`) come from the real catalog and the shopper's selected city.
- The "All Products" button links to `/category/root`.
- The `Footer` includes the language and currency switchers (`src/components/footer/switchers.tsx`).

### Text (i18n)
Home text uses `useTranslation('home')`. Translations live in `src/locales/<locale>/translations.json` under the `home` key (for example `featuredProducts.title`, `featuredProducts.allProducts`).

## 4. How styling is applied

### 4.1 Where the CSS is loaded
`src/root.tsx` links `src/theme/index.css`, which imports, in order:

| File | Purpose |
|---|---|
| `tailwind.css` | Tailwind theme bridge: turns CSS variables into utilities (`bg-background`, `text-foreground`, `rounded-ui`, ...) and defines the font `--font-sans: 'Sen', ...` |
| `tokens/core.css` | The real colors: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, status colors |
| `tokens/brand.css` | Brand palette (`--brand-black`, `--brand-white-bone`, ...) and hero overlay gradients |
| `tokens/header.css`, `sidebar.css`, `components.css`, `custom.css`, `status.css`, `swatch.css`, `agentic.css` | Tokens for specific areas |
| `animations.css` | Keyframes |
| `base.css` | Global base layer: `@font-face` for Sen (`public/fonts/sen-variable.woff2`), `body` background / text / font, `.section-container`, focus and cursor rules |
| `overrides/*.css` | Component overrides: `navigation.css`, `sonner.css`, `cart-sheet.css`, `store-locator.css` |

### 4.2 How components are styled
- **Tailwind utility classes** directly in JSX, for example `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6` for the featured products grid.
- **Design tokens, not hard-coded colors:** `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`. To change a color, change the variable in `tokens/core.css` or `tokens/brand.css`. The `custom/color-linter` lint rule rejects hard-coded color utilities such as `bg-white`.
- **Shape tokens:** `rounded-ui`, `shadow-ui`, `border-ui`. Override the source variables (`--ui-radius`, `--ui-shadow`, `--ui-border-width`), never the bridge variables. See `docs/README-SHAPE-TOKENS.md`.
- **`.section-container`** (`base.css`): the page content width, `px-4 sm:px-8 lg:px-16 max-w-screen-2xl mx-auto`.
- **`cn()`** from `src/lib/utils` merges class names conditionally.
- **Breakpoints:** `sm`, `md`, `lg`, `xl`, `2xl`.
- **Header colors** come from `tokens/header.css` and the inline CSS variables set on the home header (`--header-background`, `--header-foreground`, ...).
- **Skeletons:** the featured products section reserves space with `Skeleton` blocks while the Promise resolves, to avoid layout shift.

## 5. Where to change things

| Task | File |
|---|---|
| Number of featured products fetched | `config.server.ts` -> `pages.home.featuredProductsCount` |
| How many are shown in the section | `FEATURED_COUNT` in `src/components/mainstarthere/mainstarthere.tsx` |
| Which category the featured products come from | `src/routes/_app._index.tsx` -> `fetchCarouselProducts({ categoryId: 'root' })` |
| Section title / button text | `src/locales/<locale>/translations.json` -> `home.featuredProducts.*` |
| Section order | `HomePage` in `src/routes/_app._index.tsx` |
| Static section content | The matching `src/components/main*/` component |
| Font | `src/theme/base.css` (`@font-face`) and `src/theme/tailwind.css` (`--font-sans`) |
| Colors | `src/theme/tokens/core.css`, `src/theme/tokens/brand.css` |
| Navigation categories | Business Manager catalog; depth in `config.server.ts` -> `pages.navigation` |
