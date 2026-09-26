import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Pencil } from 'lucide-react';
import { useState } from 'react';
import FaqController from '@/actions/App/Http/Controllers/Admin/FaqController';
import PlanController from '@/actions/App/Http/Controllers/Admin/PlanController';
import { AccentText } from '@/components/admin/accent-text-input';
import { localeProps } from '@/components/admin/bilingual';
import type { ContentLocale } from '@/components/admin/bilingual';
import { button } from '@/components/admin/button';
import { EmptyState } from '@/components/admin/empty-state';
import { plural } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { PreviewLocaleToggle } from '@/components/admin/preview-locale-toggle';
import { RelativeTime } from '@/components/admin/relative-time';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { cn } from '@/lib/utils';
import { ArabicMissing } from '@/components/admin/arabic-missing';
import { CurrenciesPanel } from './partials/currencies-panel';
import { CurrencySwitch } from './partials/currency-switch';
import { PlanCard } from './partials/plan-card';
import { cardDataOf, PLAN_TEXT_LABELS, PRICE_MODE_LABELS } from './types';
import type { PlansIndexProps } from './types';

const SITE_CONTENT_SECTIONS = '/admin/content?group=sections';

const linkClass =
    'group inline-flex items-center gap-1.5 rounded-[8px] text-[13px] text-mist transition-colors duration-300 ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

export default function PlansIndex({
    plans,
    currencies,
    currencyOptions,
    copy,
    faqs,
}: PlansIndexProps) {
    const [currency, setCurrency] = useState(currencies[0]?.code ?? 'USD');
    const [locale, setLocale] = useState<ContentLocale>('en');
    const pageCopy = copy[locale];
    // Keep the preview on a shown currency after the list changes.
    const shown = currencies.some((option) => option.code === currency)
        ? currency
        : (currencies[0]?.code ?? 'USD');

    return (
        <>
            <Head title="Plans & prices · Admin" />
            <PageHeader
                title={
                    <>
                        Plans and <em>prices.</em>
                    </>
                }
                description="The three ways to own the device, drawn as the pricing section shows them, in English or Arabic. Edit a plan to change its copy, prices or features."
                actions={<ViewOnSite href="/#pricing" />}
            />

            <div className="mt-8 grid gap-8">
                {/* The ledger band, as on the landing: currency over the cards, the note on the right. */}
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-white/10 pb-5">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                        <CurrencySwitch
                            currencies={currencies}
                            value={shown}
                            onChange={setCurrency}
                            label="Preview in"
                        />
                        <PreviewLocaleToggle
                            value={locale}
                            onValueChange={setLocale}
                        />
                    </div>
                    {pageCopy.note ? (
                        <p
                            {...localeProps(locale)}
                            className="max-w-[44ch] text-[13px] leading-relaxed text-mist"
                        >
                            {pageCopy.note}
                        </p>
                    ) : null}
                </div>

                {plans.length === 0 ? (
                    <Panel>
                        <EmptyState
                            title={
                                <>
                                    No plans <em>yet.</em>
                                </>
                            }
                            description="The three plans (Buy, Lease and Chain) are created by the content seeder: run php artisan db:seed --class=LandingContentSeeder."
                        />
                    </Panel>
                ) : (
                    <section aria-label="Plans" className="@container">
                        <div className="grid gap-x-6 gap-y-10 @min-[58rem]:grid-cols-3 @min-[58rem]:items-start @min-[58rem]:pt-[6rem]">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={cn(
                                        'grid min-w-0 gap-3',
                                        plan.is_featured &&
                                            '@min-[58rem]:-mt-[6rem]',
                                    )}
                                >
                                    <PlanCard
                                        plan={cardDataOf(plan, locale)}
                                        currency={shown}
                                        customPrice={pageCopy.customPrice}
                                        locale={locale}
                                        level="h2"
                                    />
                                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
                                        <p className="text-[12px] leading-snug text-smoke">
                                            {PRICE_MODE_LABELS[plan.price_mode]}
                                            {plan.updated_at ? (
                                                <>
                                                    {' · edited '}
                                                    <RelativeTime
                                                        value={plan.updated_at}
                                                    />
                                                </>
                                            ) : null}
                                            {plan.missing_arabic.length ? (
                                                <>
                                                    <br />
                                                    <ArabicMissing
                                                        fields={plan.missing_arabic.map(
                                                            (field) =>
                                                                PLAN_TEXT_LABELS[
                                                                    field
                                                                ].toLowerCase(),
                                                        )}
                                                    />
                                                </>
                                            ) : null}
                                        </p>
                                        <Link
                                            href={PlanController.edit.url(
                                                plan.key,
                                            )}
                                            className={button({
                                                variant: 'glass',
                                                size: 'xs',
                                            })}
                                        >
                                            <Pencil aria-hidden /> Edit{' '}
                                            {plan.name}
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
                    <CurrenciesPanel
                        options={currencyOptions}
                        plans={plans}
                        className="lg:col-span-7"
                    />
                    <Panel
                        title="Around the plans"
                        description="The rest of the pricing section is edited elsewhere."
                        className="lg:col-span-5"
                    >
                        <dl className="grid">
                            <div className="grid gap-1 border-b border-white/[0.07] pb-4">
                                <dt className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase">
                                    Section title
                                </dt>
                                <dd
                                    {...localeProps(locale)}
                                    className="font-display text-[1.35rem] leading-tight text-bone rtl:leading-[1.5] [&_em]:text-mint"
                                >
                                    <AccentText
                                        text={pageCopy.title}
                                        locale={locale}
                                    />
                                </dd>
                                <dd
                                    {...localeProps(locale)}
                                    className="text-[13px] leading-relaxed text-mist"
                                >
                                    {pageCopy.lede}
                                </dd>
                            </div>
                            <div className="grid gap-1 border-b border-white/[0.07] py-4">
                                <dt className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase">
                                    Instead of a figure
                                </dt>
                                <dd
                                    {...localeProps(locale)}
                                    className="font-display text-[1.2rem] text-bone italic rtl:not-italic"
                                >
                                    {pageCopy.customPrice}
                                </dd>
                            </div>
                            <div className="grid gap-1 pt-4">
                                <dt
                                    {...localeProps(locale)}
                                    className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase rtl:text-[12.5px]"
                                >
                                    {pageCopy.faqTitle}
                                </dt>
                                <dd className="text-[13px] text-mist">
                                    {plural(faqs.live, 'question')} live
                                    {faqs.total > faqs.live
                                        ? `, ${faqs.total - faqs.live} hidden`
                                        : null}
                                </dd>
                            </div>
                        </dl>
                        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                            <Link
                                href={SITE_CONTENT_SECTIONS}
                                className={linkClass}
                            >
                                Edit the section copy
                                <ArrowRight
                                    aria-hidden
                                    className="size-3.5 transition-transform duration-300 ease-glass group-hover:translate-x-0.5"
                                />
                            </Link>
                            <Link
                                href={FaqController.index.url()}
                                className={linkClass}
                            >
                                Edit the questions
                                <ArrowRight
                                    aria-hidden
                                    className="size-3.5 transition-transform duration-300 ease-glass group-hover:translate-x-0.5"
                                />
                            </Link>
                        </div>
                    </Panel>
                </div>
            </div>
        </>
    );
}
