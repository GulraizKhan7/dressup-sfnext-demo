import { Search, User, ShoppingBag, ChevronDown } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { useRouteLoaderData } from 'react-router';
import ResponsiveNavigationMenu from '@/components/navigation-menu-mega';
import { CitySelector } from '@/components/delivery-promise/city-selector';
import type { LoaderData as AppLoaderData } from '@/routes/_app';
 
const INK = '#111111';
const MUTED = '#4b5563';
const LINE = '#e5e7eb';
const headerStyle = {
  background: '#fff',
  color: INK,
  '--header-background': '#fff',
  '--header-foreground': INK,
  '--header-border': LINE,
  '--header-menu-background': '#fff',
  '--header-menu-foreground': INK,
  '--header-menu-border': LINE,
  '--header-menu-hover-background': '#f0f3f5',
  '--header-menu-hover-foreground': INK,
  '--header-menu-active-background': '#f0f3f5',
  '--header-menu-icon': MUTED,
} as CSSProperties;

const CATEGORY_LINKS = [
  { label: 'Men', aliases: ['men', 'mens'] },
  { label: 'New', aliases: ['new', 'newarrival', 'newarrivals', 'newandnow'] },
  { label: 'Women', aliases: ['women', 'womens'] },
  { label: 'Kids', aliases: ['kid', 'kids', 'child', 'children'] },
  { label: 'Online Exclusive', aliases: ['onlineexclusive', 'onlineexclusives'] },
  { label: 'Sports', aliases: ['sport', 'sports'] },
  { label: 'Beauty', aliases: ['beauty', 'selfcare', 'selfcareandbeauty'] },
  { label: 'Home', aliases: ['home', 'house'] },
  { label: 'Discount', aliases: ['discount', 'discounts', 'sale', 'clearance'] },
];

const iconStyle = (color: string) => ({ color, stroke: color, fill: 'none', display: 'block' });
 
function SearchBox({ className = '' }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <span className="absolute left-4 pointer-events-none flex items-center">
        <Search size={18} strokeWidth={2} style={iconStyle(INK)} />
      </span>
      <input
        type="text"
        placeholder="Search for products or brands"
        style={{ color: INK }}
        className="w-full bg-[#F0F3F5] text-[15px] placeholder-gray-500 rounded-md pl-11 pr-4 py-2.5 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black border border-transparent transition-all"
      />
    </div>
  );
}

type HeaderProps = {
  cartCount?: number;
  root?: AppLoaderData['root'];
  defer?: AppLoaderData['subs'];
  embeddedComponent?: AppLoaderData['megaMenuComponent'];
};

export default function Header({
  cartCount = 0,
  root: rootProp,
  defer: deferProp,
  embeddedComponent: embeddedComponentProp,
}: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const appLoaderData = useRouteLoaderData<AppLoaderData>('routes/_app');
  const root = rootProp ?? appLoaderData?.root;
  const defer = deferProp ?? appLoaderData?.subs;
  const embeddedComponent = embeddedComponentProp ?? appLoaderData?.megaMenuComponent;

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeaderHeight = () => {
      const height = `${header.offsetHeight}px`;
      header.style.setProperty('--header-height', height);
      document.documentElement.style.setProperty('--header-height', height);
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="relative z-50 w-full font-sans" style={headerStyle}>
      {/* 1. Announcement Bar */}
      <div
        className="text-[13px] md:text-[18px] py-3 px-4 lg:px-6 flex items-center justify-center relative w-full"
        style={{ background: '#000', color: '#fff' }}
      >
        <div className="text-center">
          Shipping outside of the U.S.?{' '}
          <a href="#international-shipping" style={{ color: '#fff', textDecoration: 'underline' }}>
            Learn About International Shopping
          </a>
        </div>
        <div className="hidden lg:flex items-center gap-1.5 text-[14px] absolute right-6" style={{ color: '#fff' }}>
          <span>🇵🇰</span> <span className="font-medium">Pakistan</span>
        </div>
      </div>
 
      {/* 2. Main Header Bar */}
      <div className="w-full px-4 md:px-8 lg:px-12 py-4 flex items-center justify-between gap-4 lg:gap-8">
        <a
          href="/"
          className="flex-shrink-0 text-[22px] md:text-[28px] lg:text-[32px] font-bold tracking-[0.1em]"
          style={{ color: INK, textDecoration: 'none' }}
        >
          DRESSUP.GE
        </a>
 
        <SearchBox className="hidden md:flex flex-1 max-w-3xl" />
 
        <div className="flex items-center gap-5 lg:gap-8 flex-shrink-0">
          <CitySelector className="hidden md:flex" />
          <a
            href="/account/login"
            className="flex items-center gap-1"
            style={{ color: INK, textDecoration: 'none' }}
          >
            <User size={22} strokeWidth={1.5} style={iconStyle(INK)} />
            <span className="text-[14px] font-medium hidden md:inline">Sign In</span>
            <ChevronDown size={14} className="hidden md:inline" style={iconStyle(MUTED)} />
          </a>
 
          <a href="/cart" className="relative" aria-label="Cart" style={{ color: INK, textDecoration: 'none' }}>
            <ShoppingBag size={22} strokeWidth={1.5} style={iconStyle(INK)} />
            <span
              className="absolute -top-1.5 -right-2 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: '#000', color: '#fff' }}
            >
              {cartCount}
            </span>
          </a>
        </div>
      </div>
 
      {/* Mobile search */}
      <div className="md:hidden px-4 pb-3 space-y-2">
        <CitySelector />
        <SearchBox />
      </div>
 
      {/* 3. Sub Navigation */}
      <div
        className="w-full px-4 md:px-8 lg:px-16"
        style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}
      >
        <ResponsiveNavigationMenu
          resolve={root}
          defer={defer}
          embeddedComponent={embeddedComponent}
          categoryLabels={CATEGORY_LINKS}
        />
      </div>
    </header>
  );
}