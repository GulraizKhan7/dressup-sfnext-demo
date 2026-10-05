---
'@salesforce/template': patch
---

Switching the language now translates the whole storefront: complete ka-GE (Georgian) translations for every namespace, and the homepage sections, header announcement bar and category menu, footer, checkout progress, category sort and filter placeholders, product size picker and share menu now read their text from the locale files instead of hardcoded English.

Catalog category names (header mega menu, mobile menu, breadcrumbs, category banner and page title) are now localized through a new `categoryNames` translation namespace and the `useCategoryName` hook, with Georgian names for all 978 distinct category names in the DressUp catalog. Names the catalog already localized are left untouched.
