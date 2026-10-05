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
import { type ReactElement, type ReactNode, Suspense } from 'react';
import { Await } from 'react-router';
import { Link } from '@/components/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { OrderListBody, OrderListSkeleton } from '@/components/account/order-list';
import { User, CreditCard, Receipt, MapPin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateForLocale } from '@/lib/date-utils';
import type { ShopperCustomers } from '@/scapi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/hooks/use-navigate';
import { AppDownloadSection } from '@/components/account/app-download-section';
import { AccountHelp } from '@/components/account/account-help';
import type { CustomerOrdersResult } from '@/lib/api/order.server';
import { UITarget } from '@/targets/ui-target';
import { RateRecentPurchasesCard } from '@/components/account/account-overview/rate-recent-purchases-card';
import { routes, routeHref } from '@/route-paths';

type Customer = ShopperCustomers.schemas['Customer'];

/**
 * Quick link item data for the Quick Links section
 */
interface QuickLinkItem {
    path: string;
    icon: React.ElementType;
    label: string;
}

/**
 * Props for the AccountOverview component
 */
export interface AccountOverviewProps {
    /** Customer data for personalization */
    customer?: Customer | null;
    /** Deferred promise for the shopper's recent orders */
    ordersPromise?: Promise<CustomerOrdersResult>;
    /** Slot for product recommendations (rendered below the orders section) */
    recommendationsSlot?: ReactNode;
}

/**
 * Welcome section that displays the personalized greeting
 */
export function WelcomeSection({ customer }: { customer?: Customer | null }): ReactElement {
    const { t } = useTranslation('account');
    const firstName = customer?.firstName || t('overview.defaultName');

    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <h1 className="text-2xl font-semibold text-foreground mb-1">
                    {t('overview.welcomeBack', { name: firstName })}
                </h1>
                <p className="text-sm text-muted-foreground">{t('overview.welcomeSubtitle')}</p>
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton for the welcome section while loading
 */
export function WelcomeSectionSkeleton(): ReactElement {
    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <Skeleton className="h-6 w-64 mb-1" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </CardContent>
        </Card>
    );
}

/**
 * Quick Links section with navigation cards
 */
export function QuickLinksSection(): ReactElement {
    const { t } = useTranslation('account');

    const quickLinks: QuickLinkItem[] = [
        {
            path: routes.account,
            icon: User,
            label: t('navigation.accountDetails'),
        },
        {
            path: routes.accountAddresses,
            icon: MapPin,
            label: t('navigation.manageAddresses'),
        },
        {
            path: routes.accountPaymentMethods,
            icon: CreditCard,
            label: t('navigation.paymentMethods'),
        },
        {
            path: routes.accountOrders,
            icon: Receipt,
            label: t('navigation.orderHistory'),
        },
    ];

    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">{t('overview.quickLinks.title')}</h2>
                <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <li key={link.path} className="h-full">
                                <Link to={link.path} className="group h-full flex">
                                    <div className="h-full flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-ui border transition-all duration-200 hover:shadow-md hover:border-primary/50 group-focus-visible:ring-2 group-focus-visible:ring-primary">
                                        <Icon className="h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
                                        <span className="text-sm font-medium text-foreground text-center leading-5 group-hover:text-primary transition-colors">
                                            {link.label}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton for the Quick Links section
 */
export function QuickLinksSectionSkeleton(): ReactElement {
    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <Skeleton className="h-7 w-32 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-full flex flex-col items-center justify-center gap-3 p-6 rounded-ui border">
                            <Skeleton className="w-4 h-4" />
                            <Skeleton className="h-5 w-24" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

type RecentOrdersListBlockProps = {
    result: CustomerOrdersResult;
    onViewDetails: (orderNo: string) => void;
};

/**
 * Recent orders header + list (no deferred data wrapper).
 */
function RecentOrdersListBlock({ result, onViewDetails }: RecentOrdersListBlockProps): ReactElement {
    const { t } = useTranslation('account');

    return (
        <div className="space-y-0">
            <Card className="bg-card border-border rounded-b-none border-b-0">
                <CardContent className="px-6">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col items-start gap-1.5 flex-1">
                            <h2 className="text-lg font-bold leading-[120%] text-card-foreground">
                                {t('overview.recentOrders.title')}
                            </h2>
                            <p className="text-sm font-normal leading-5 text-muted-foreground">
                                {t('overview.recentOrders.subtitle')}
                            </p>
                        </div>
                        <Button variant="outline" asChild className="shrink-0 bg-secondary shadow-2xs">
                            <Link to={routes.accountOrders}>{t('overview.recentOrders.viewAll')}</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <OrderListBody orders={result.orders} onViewDetails={onViewDetails} />
        </div>
    );
}

/**
 * Deferred recent orders plus “rate recent purchase” card (card renders below the list when orders exist).
 */
export function AccountOverviewOrdersAwait({
    ordersPromise,
}: {
    ordersPromise: Promise<CustomerOrdersResult>;
}): ReactElement {
    const navigate = useNavigate();

    const handleViewDetails = (orderNo: string) => {
        // oxlint-disable-next-line @typescript-eslint/no-floating-promises -- navigate() result intentionally not awaited
        navigate(routeHref(routes.accountOrderDetail, { orderNo }));
    };

    return (
        <Suspense fallback={<RecentOrdersSectionSkeleton />}>
            <Await resolve={ordersPromise}>
                {(result) => (
                    <div className="space-y-5">
                        <RecentOrdersListBlock result={result} onViewDetails={handleViewDetails} />
                        {result.orders.length > 0 ? <RateRecentPurchasesCard order={result.orders[0]} /> : null}
                    </div>
                )}
            </Await>
        </Suspense>
    );
}

/**
 * Skeleton for the Recent Orders section while loading
 */
export function RecentOrdersSectionSkeleton(): ReactElement {
    return (
        <div className="space-y-5">
            <div className="space-y-0">
                <Card className="bg-card border-border rounded-b-none border-b-0">
                    <CardContent className="px-5">
                        <Skeleton className="h-7 w-40 mb-1.5" />
                        <Skeleton className="h-4 w-56" />
                    </CardContent>
                </Card>
                <OrderListSkeleton />
            </div>
            <Card className="py-0">
                <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-7 w-72 max-w-full" />
                    <Skeleton className="h-4 w-full max-w-lg" />
                    <div className="rounded-ui border border-border p-4 sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                <div className="flex shrink-0 gap-2">
                                    <Skeleton className="h-16 w-16 shrink-0" />
                                    <Skeleton className="h-16 w-16 shrink-0" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                            <div className="flex w-full justify-end sm:w-auto sm:self-center">
                                <Skeleton className="h-10 w-full max-w-none sm:h-10 sm:w-40" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Dashboard card: titled panel with an optional "manage" link in the header.
 */
function DashboardCard({
    title,
    linkLabel,
    linkTo,
    className,
    children,
    testId,
}: {
    title: string;
    linkLabel?: string;
    linkTo?: string;
    className?: string;
    children: ReactNode;
    testId?: string;
}): ReactElement {
    return (
        <section className={cn('flex flex-col border border-border bg-card', className)} data-testid={testId}>
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <h2 className="text-sm font-normal text-foreground">{title}</h2>
                {linkLabel && linkTo && (
                    <Link to={linkTo} className="text-xs text-foreground underline">
                        {linkLabel}
                    </Link>
                )}
            </header>
            {children}
        </section>
    );
}

/** Centered empty state: message with an outlined call-to-action button. */
function DashboardEmptyState({
    message,
    ctaLabel,
    ctaTo,
}: {
    message: string;
    ctaLabel: string;
    ctaTo: string;
}): ReactElement {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
            <p className="max-w-xs text-xs text-foreground">{message}</p>
            <Button asChild variant="outline" size="sm" className="border-foreground font-semibold">
                <Link to={ctaTo}>{ctaLabel}</Link>
            </Button>
        </div>
    );
}

/** Card listing link rows, each with a trailing chevron. */
function DashboardLinkList({
    description,
    links,
}: {
    description?: string;
    links: { to: string; label: string }[];
}): ReactElement {
    return (
        <div className="flex flex-1 flex-col">
            {description && <p className="px-4 py-3 text-xs text-foreground">{description}</p>}
            <ul role="list">
                {links.map((link) => (
                    <li key={link.to} className="border-t border-border">
                        <Link to={link.to} className="flex items-center justify-between px-4 py-3 text-sm">
                            {link.label}
                            <ChevronRight className="size-4" aria-hidden="true" />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function PurchasesCard({ ordersPromise }: { ordersPromise?: Promise<CustomerOrdersResult> }): ReactElement {
    const { t, i18n } = useTranslation('account');
    const emptyState = (
        <DashboardEmptyState
            message={t('overview.dashboard.purchasesEmpty', {
                defaultValue:
                    "You'll be able to view details, track packages, manage returns and more when you make a purchase",
            })}
            ctaLabel={t('overview.dashboard.startShopping', { defaultValue: 'Start Shopping' })}
            ctaTo="/"
        />
    );

    return (
        <DashboardCard
            title={t('overview.dashboard.purchases', { defaultValue: 'Purchases' })}
            linkLabel={t('overview.dashboard.viewAllPurchases', { defaultValue: 'View all purchases' })}
            linkTo={routes.accountOrders}
            testId="dashboard-purchases">
            {ordersPromise ? (
                <Suspense fallback={<Skeleton className="m-4 h-24" />}>
                    <Await resolve={ordersPromise}>
                        {(result: CustomerOrdersResult) =>
                            result.orders.length === 0 ? (
                                emptyState
                            ) : (
                                <ul role="list">
                                    {result.orders.slice(0, 3).map((order) => (
                                        <li key={order.orderNo} className="border-b border-border last:border-b-0">
                                            <Link
                                                to={routeHref(routes.accountOrderDetail, { orderNo: order.orderNo })}
                                                className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                                <span className="flex flex-col gap-1">
                                                    <span className="font-semibold">
                                                        {t('overview.dashboard.orderNo', {
                                                            defaultValue: 'Order #{{orderNo}}',
                                                            orderNo: order.orderNo,
                                                        })}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDateForLocale(order.orderDate, i18n.language)}
                                                    </span>
                                                </span>
                                                <ChevronRight className="size-4" aria-hidden="true" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )
                        }
                    </Await>
                </Suspense>
            ) : (
                emptyState
            )}
        </DashboardCard>
    );
}

/**
 * Account Overview Dashboard component
 *
 * Card-grid dashboard: Purchases, Wish Lists, Addresses, Payment Methods,
 * Settings, Your Store and Customer Service, followed by recommendations.
 */
export function AccountOverview({ customer, ordersPromise, recommendationsSlot }: AccountOverviewProps): ReactElement {
    const { t } = useTranslation('account');
    const firstName = customer?.firstName || t('overview.defaultName');

    return (
        <div className="space-y-6">
            <div className="bg-muted/30 p-6 sm:p-8">
                <h1 className="mb-6 flex items-center justify-center gap-3 text-xl font-semibold text-foreground">
                    <span
                        aria-hidden="true"
                        className="flex size-9 items-center justify-center rounded-full bg-foreground text-base text-background">
                        {firstName.charAt(0).toUpperCase()}
                    </span>
                    {t('overview.dashboard.accountTitle', { defaultValue: "{{name}}'s Account", name: firstName })}
                </h1>
                <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <PurchasesCard ordersPromise={ordersPromise} />
                    </div>
                    <UITarget targetId="sfcc.myAccount.loyalty.summary" />

                    <DashboardCard
                        title={t('navigation.wishlist')}
                        linkLabel={t('overview.dashboard.manageLists', { defaultValue: 'Manage lists' })}
                        linkTo={routes.accountWishlist}>
                        <DashboardEmptyState
                            message={t('overview.dashboard.wishlistEmpty', {
                                defaultValue:
                                    'Add items to your list by shopping the site. Then, share your list so friends and family know what you love.',
                            })}
                            ctaLabel={t('overview.dashboard.startShopping', { defaultValue: 'Start Shopping' })}
                            ctaTo="/"
                        />
                    </DashboardCard>
                    <DashboardCard
                        title={t('navigation.paymentMethods')}
                        linkLabel={t('overview.dashboard.managePayments', { defaultValue: 'Manage payments' })}
                        linkTo={routes.accountPaymentMethods}>
                        <DashboardEmptyState
                            message={t('overview.dashboard.paymentEmpty', {
                                defaultValue: 'Add a payment method to check out even faster',
                            })}
                            ctaLabel={t('overview.dashboard.addPayment', { defaultValue: 'Add Payment Method' })}
                            ctaTo={routes.accountPaymentMethods}
                        />
                    </DashboardCard>

                    <DashboardCard
                        title={t('navigation.shippingAddresses', { defaultValue: 'Shipping Addresses' })}
                        linkLabel={t('overview.dashboard.manageAddresses', { defaultValue: 'Manage addresses' })}
                        linkTo={routes.accountAddresses}>
                        <DashboardEmptyState
                            message={t('overview.dashboard.addressEmpty', {
                                defaultValue: 'Add a shipping address to check out even faster',
                            })}
                            ctaLabel={t('overview.dashboard.addAddress', { defaultValue: 'Add Shipping Address' })}
                            ctaTo={routes.accountAddresses}
                        />
                    </DashboardCard>
                    <DashboardCard
                        title={t('navigation.yourStore', { defaultValue: 'Your Store' })}
                        linkLabel={t('overview.dashboard.setYourStore', { defaultValue: 'Set your store' })}
                        linkTo={routes.accountStorePreferences}>
                        <DashboardEmptyState
                            message={t('overview.dashboard.storeEmpty', {
                                defaultValue:
                                    'Set your store for a personalized shopping experience and easily filter for items near you',
                            })}
                            ctaLabel={t('overview.dashboard.setYourStoreCta', { defaultValue: 'Set Your Store' })}
                            ctaTo={routes.accountStorePreferences}
                        />
                    </DashboardCard>

                    <DashboardCard title={t('overview.dashboard.settings', { defaultValue: 'Settings' })}>
                        <DashboardLinkList
                            description={t('overview.dashboard.settingsDescription', {
                                defaultValue:
                                    'Update communication preferences and personal info like your password, email and mobile',
                            })}
                            links={[
                                {
                                    to: routes.account,
                                    label: t('overview.dashboard.updatePassword', {
                                        defaultValue: 'Update password & personal info',
                                    }),
                                },
                                {
                                    to: routes.account,
                                    label: t('overview.dashboard.updateEmail', {
                                        defaultValue: 'Update email & mail preferences',
                                    }),
                                },
                            ]}
                        />
                    </DashboardCard>
                    <DashboardCard
                        title={t('overview.dashboard.customerService', { defaultValue: 'Customer Service' })}
                        linkLabel={t('overview.dashboard.moreOptions', { defaultValue: 'More options' })}
                        linkTo={routes.accountOrders}>
                        <DashboardLinkList
                            links={[
                                {
                                    to: routes.accountOrders,
                                    label: t('overview.dashboard.startReturn', { defaultValue: 'Start a return' }),
                                },
                                {
                                    to: routes.accountOrders,
                                    label: t('overview.dashboard.trackOrder', { defaultValue: 'Track your order' }),
                                },
                            ]}
                        />
                    </DashboardCard>
                </div>
            </div>
            <UITarget targetId="sfcc.myAccount.reviews.pending" />
            {recommendationsSlot}
            <AccountHelp />
            <AppDownloadSection />
        </div>
    );
}

/**
 * Skeleton for the App Download section
 */
export function AppDownloadSectionSkeleton(): ReactElement {
    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1">
                        <Skeleton className="h-7 w-48 mb-2" />
                        <Skeleton className="h-4 w-full max-w-xl mb-6" />
                        <div className="flex flex-wrap gap-3">
                            <Skeleton className="h-12 w-32" />
                            <Skeleton className="h-12 w-36" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 lg:flex-shrink-0">
                        <Skeleton className="w-40 h-40" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton for the Account Help section
 */
export function AccountHelpSkeleton(): ReactElement {
    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-4 w-full max-w-xl mb-4" />
                <div className="flex flex-wrap gap-3">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-36" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Account overview skeleton for loading state
 */
export function AccountOverviewSkeleton({
    recommendationsSlot,
}: {
    recommendationsSlot?: ReactNode;
} = {}): ReactElement {
    return (
        <div className="space-y-5">
            <WelcomeSectionSkeleton />
            <RecentOrdersSectionSkeleton />
            {recommendationsSlot}
            <AccountHelpSkeleton />
            <AppDownloadSectionSkeleton />
            <QuickLinksSectionSkeleton />
        </div>
    );
}

export default AccountOverview;
