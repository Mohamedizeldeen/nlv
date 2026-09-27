import { Form, Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import PlanController from '@/actions/App/Http/Controllers/Admin/PlanController';
import { CompletenessBadge } from '@/components/admin/arabic-completeness';
import type { CompletenessField } from '@/components/admin/arabic-completeness';
import {
    bilingualValue,
    isBlank,
    localeProps,
    localized,
} from '@/components/admin/bilingual';
import type {
    BilingualValue,
    ContentLocale,
} from '@/components/admin/bilingual';
import {
    BilingualField,
    BilingualTextarea,
} from '@/components/admin/bilingual-field';
import {
    BilingualList,
    bilingualRows,
    splitRows,
} from '@/components/admin/bilingual-list';
import type { BilingualRow } from '@/components/admin/bilingual-list';
import { CurrencyGrid } from '@/components/admin/currency-grid';
import { Field, FieldError } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { PreviewLocaleToggle } from '@/components/admin/preview-locale-toggle';
import { SaveBar } from '@/components/admin/save-bar';
import { TextInput } from '@/components/admin/text-input';
import { Toggle } from '@/components/admin/toggle';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { cn } from '@/lib/utils';
import type { PriceMode } from '@/types/landing';
import { ChoiceGroup } from './partials/choice-group';
import type { Choice } from './partials/choice-group';
import { CurrencySwitch } from './partials/currency-switch';
import { PlanCard } from './partials/plan-card';
import {
    detailKindOf,
    localizedLines,
    PLAN_TEXT_LABELS,
    PRICE_MODE_LABELS,
} from './types';
import type {
    AdminPlan,
    DetailKind,
    PlanCardData,
    PlanEditProps,
    PlanText,
} from './types';

const MAX_FEATURES = 8;
const MAX_FEATURE = 120;
const SITE_CONTENT_SECTIONS = '/admin/content?group=sections';

type Prices = Record<string, number | null>;

/** A text of the card, in both languages. */
type Text = BilingualValue;

type Draft = {
    name: Text;
    blurb: Text;
    price_mode: PriceMode;
    prices: Prices;
    price_caption: Text;
    detail_kind: DetailKind;
    detail_label: Text;
    detail_prices: Prices;
    detail_value: string;
    detail_caption: Text;
    features_heading: Text;
    features: BilingualRow[];
    cta_label: Text;
    is_featured: boolean;
    badge: Text;
    badge_note: Text;
};

/** The draft keys that hold one text in both languages. */
type TextKey = {
    [K in keyof Draft]: Draft[K] extends Text ? K : never;
}[keyof Draft];

function pricesFor(
    amounts: AdminPlan['prices'],
    codes: string[],
): Record<string, number | null> {
    return Object.fromEntries(
        codes.map((code) => [code, amounts?.[code] ?? null]),
    );
}

function draftOf(plan: AdminPlan, codes: string[]): Draft {
    return {
        name: bilingualValue(plan, 'name'),
        blurb: bilingualValue(plan, 'blurb'),
        price_mode: plan.price_mode,
        prices: pricesFor(plan.prices, codes),
        price_caption: bilingualValue(plan, 'price_caption'),
        detail_kind: detailKindOf(plan),
        detail_label: bilingualValue(plan, 'detail_label'),
        detail_prices: pricesFor(plan.detail_prices, codes),
        detail_value: plan.detail_value ?? '',
        detail_caption: bilingualValue(plan, 'detail_caption'),
        features_heading: bilingualValue(plan, 'features_heading'),
        features: bilingualRows(plan.features, plan.features_ar),
        cta_label: bilingualValue(plan, 'cta_label'),
        is_featured: plan.is_featured,
        badge: bilingualValue(plan, 'badge'),
        badge_note: bilingualValue(plan, 'badge_note'),
    };
}

function trimmed(text: Text): Text {
    return { en: text.en.trim(), ar: text.ar.trim() };
}

/** A draft in comparable form: trimmed, row ids dropped. */
function snapshot(draft: Draft): string {
    return JSON.stringify(
        Object.fromEntries(
            Object.entries(draft).map(([key, value]) => {
                if (key === 'features') {
                    return [
                        key,
                        (value as BilingualRow[]).map((row) => [
                            row.en.trim(),
                            row.ar.trim(),
                        ]),
                    ];
                }

                const text = value as Partial<Text>;

                return [
                    key,
                    typeof text === 'object' &&
                    text !== null &&
                    'en' in text &&
                    'ar' in text
                        ? trimmed(text as Text)
                        : value,
                ];
            }),
        ),
    );
}

/** The card as the page in `locale` draws it (untranslated texts in English). */
function cardOf(draft: Draft, locale: ContentLocale): PlanCardData {
    const text = (key: TextKey) => localized(trimmed(draft[key]), locale);

    return {
        name: text('name'),
        blurb: text('blurb'),
        priceMode: draft.price_mode,
        prices: draft.prices,
        priceCaption: text('price_caption'),
        detail: {
            kind: draft.detail_kind,
            label: text('detail_label'),
            prices: draft.detail_prices,
            value: draft.detail_value.trim(),
            caption: text('detail_caption'),
        },
        featuresHeading: text('features_heading'),
        features: localizedLines(draft.features, locale),
        ctaLabel: text('cta_label'),
        featured: draft.is_featured,
        badge: text('badge'),
        badgeNote: text('badge_note'),
    };
}

const PRICE_MODES: Choice<PriceMode>[] = [
    {
        value: 'one_off',
        label: PRICE_MODE_LABELS.one_off,
        description: 'Paid once, per device.',
    },
    {
        value: 'monthly',
        label: PRICE_MODE_LABELS.monthly,
        description: 'Per device, every month.',
    },
    {
        value: 'custom',
        label: PRICE_MODE_LABELS.custom,
        description: 'No figure: priced per rollout.',
    },
];

const DETAIL_KINDS: Choice<DetailKind>[] = [
    {
        value: 'prices',
        label: 'A second price',
        description: 'In every currency, e.g. the cloud app a month.',
    },
    {
        value: 'value',
        label: 'A figure',
        description: 'The same everywhere, e.g. a 24-month term.',
    },
    {
        value: 'none',
        label: 'Nothing',
        description: 'The price stands alone.',
    },
];

function Section({
    index,
    title,
    description,
    actions,
    children,
}: {
    index: string;
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Panel
            kicker={index}
            title={title}
            description={description}
            actions={actions}
            variant="strong"
        >
            <div className="grid gap-7">{children}</div>
        </Panel>
    );
}

export default function PlanEdit({
    plan,
    currencies,
    hiddenCurrencies,
    storedHidden,
    featuredPlan,
    copy,
}: PlanEditProps) {
    const codes = useMemo(
        () => currencies.map((currency) => currency.code),
        [currencies],
    );
    const initial = useMemo(() => draftOf(plan, codes), [plan, codes]);
    const [draft, setDraft] = useState(initial);
    // Bumped by "Discard" so the uncontrolled price grids start over.
    const [version, setVersion] = useState(0);
    const [currency, setCurrency] = useState(codes[0] ?? 'USD');
    const [locale, setLocale] = useState<ContentLocale>('en');
    const dirty = snapshot(draft) !== snapshot(initial);
    const guard = useUnsavedGuard(dirty, {
        subject: `the ${plan.name} plan`,
    });

    const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
        setDraft((current) => ({ ...current, [key]: value }));
    const setText = (key: TextKey) => (value: Text) => set(key, value);

    const lockedFeatured = plan.is_featured;
    const codeList = codes.join(', ');
    const hasLine = draft.detail_kind !== 'none';

    // In form order, so the badge jumps to the first gap on the page.
    const texts: PlanText[] = [
        'name',
        'cta_label',
        'blurb',
        'price_caption',
        ...(hasLine ? (['detail_label', 'detail_caption'] as const) : []),
        'features_heading',
        'features',
        'badge',
        'badge_note',
    ];
    const completeness: CompletenessField[] = texts.map((name) => ({
        name,
        label: PLAN_TEXT_LABELS[name],
        ...(name === 'features' ? splitRows(draft.features) : draft[name]),
    }));

    return (
        <>
            <Head title={`${plan.name} · Plans & prices · Admin`} />
            {guard}

            <PageHeader
                crumbs={[{ label: plan.name }]}
                title={
                    <>
                        Edit the <em>{plan.name}</em> plan.
                    </>
                }
                description="One of the three ways to own the device, in English and Arabic. The pricing section changes as soon as you save."
                actions={<ViewOnSite href="/#pricing" />}
            />

            <Form
                {...PlanController.update.form(plan.key)}
                options={{ preserveScroll: true }}
                className="mt-8 grid gap-5 lg:grid-cols-12 lg:items-start"
            >
                {({ errors, processing, hasErrors }) => (
                    <>
                        <div
                            key={version}
                            className="grid min-w-0 gap-5 lg:col-span-7"
                        >
                            <Section
                                index="01"
                                title="Name and button"
                                description="What the card is called, who it is for, and what its button says."
                                actions={
                                    <CompletenessBadge fields={completeness} />
                                }
                            >
                                <BilingualField
                                    label="Name"
                                    name="name"
                                    required
                                    maxLength={40}
                                    value={draft.name}
                                    onValueChange={setText('name')}
                                    errors={errors}
                                    hint="One word reads best."
                                    inputProps={{ autoComplete: 'off' }}
                                />
                                <BilingualField
                                    label="Button label"
                                    name="cta_label"
                                    required
                                    maxLength={40}
                                    value={draft.cta_label}
                                    onValueChange={setText('cta_label')}
                                    errors={errors}
                                    hint="Opens the order form with this plan chosen."
                                    placeholder={{
                                        en: 'Order a device',
                                        ar: 'اطلب جهازك',
                                    }}
                                    inputProps={{ autoComplete: 'off' }}
                                />
                                <BilingualTextarea
                                    label="One-line description"
                                    name="blurb"
                                    required
                                    maxLength={200}
                                    rows={2}
                                    value={draft.blurb}
                                    onValueChange={setText('blurb')}
                                    errors={errors}
                                    hint="Under the name: who the plan is for."
                                />
                            </Section>

                            <Section
                                index="02"
                                title="Headline price"
                                description="The big figure, in each currency the page offers. Figures are the same on both pages."
                            >
                                <ChoiceGroup
                                    name="price_mode"
                                    legend="How it is priced"
                                    choices={PRICE_MODES}
                                    value={draft.price_mode}
                                    onChange={(value) =>
                                        set('price_mode', value)
                                    }
                                    error={errors.price_mode}
                                />
                                {draft.price_mode === 'custom' ? (
                                    <p className="rounded-[14px] border border-dashed border-white/[0.14] px-4 py-3 text-[13px] leading-relaxed text-mist">
                                        The card shows “
                                        <span className="font-display text-bone italic">
                                            {copy.en.customPrice}
                                        </span>
                                        ” (“
                                        <span
                                            {...localeProps('ar')}
                                            className="font-display text-bone"
                                        >
                                            {copy.ar.customPrice}
                                        </span>
                                        ” in Arabic) instead of a figure. That
                                        wording is in{' '}
                                        <Link
                                            href={SITE_CONTENT_SECTIONS}
                                            className="text-mint underline decoration-mint/40 underline-offset-4 hover:decoration-mint"
                                        >
                                            Site content, Section headings
                                        </Link>
                                        .
                                        {plan.prices
                                            ? ' The stored prices are kept for when the plan gets a figure again.'
                                            : null}
                                    </p>
                                ) : (
                                    <CurrencyGrid
                                        name="prices"
                                        legend={
                                            draft.price_mode === 'monthly'
                                                ? 'Monthly price per device'
                                                : 'Price per device'
                                        }
                                        description={
                                            <>
                                                Whole amounts, excluding VAT, in{' '}
                                                {codeList}.
                                                {storedHidden.length
                                                    ? ` Amounts in ${storedHidden.join(', ')} are kept while those currencies are hidden.`
                                                    : null}
                                            </>
                                        }
                                        unit={
                                            draft.price_mode === 'monthly'
                                                ? '/ mo'
                                                : undefined
                                        }
                                        currencies={currencies}
                                        defaultValue={draft.prices}
                                        onValueChange={(prices) =>
                                            set('prices', prices)
                                        }
                                        errors={errors}
                                        required
                                    />
                                )}
                                <BilingualField
                                    label="Price caption"
                                    name="price_caption"
                                    required
                                    maxLength={120}
                                    value={draft.price_caption}
                                    onValueChange={setText('price_caption')}
                                    errors={errors}
                                    hint="Under the figure: what the price buys."
                                    placeholder={{
                                        en: 'one-off, per device',
                                        ar: 'دفعة واحدة، للجهاز الواحد',
                                    }}
                                    inputProps={{ autoComplete: 'off' }}
                                />
                            </Section>

                            <Section
                                index="03"
                                title="The line under the price"
                                description="A ruled line like the second line of a price ticket."
                            >
                                <ChoiceGroup
                                    name="detail_kind"
                                    legend="What it shows"
                                    choices={DETAIL_KINDS}
                                    value={draft.detail_kind}
                                    onChange={(value) =>
                                        set('detail_kind', value)
                                    }
                                    error={errors.detail_kind}
                                />
                                {hasLine ? (
                                    <>
                                        <BilingualField
                                            label="Label"
                                            name="detail_label"
                                            required
                                            maxLength={40}
                                            value={draft.detail_label}
                                            onValueChange={setText(
                                                'detail_label',
                                            )}
                                            errors={errors}
                                            placeholder={
                                                draft.detail_kind === 'prices'
                                                    ? {
                                                          en: 'Cloud app',
                                                          ar: 'التطبيق السحابي',
                                                      }
                                                    : {
                                                          en: 'Term',
                                                          ar: 'مدة العقد',
                                                      }
                                            }
                                            inputProps={{
                                                autoComplete: 'off',
                                            }}
                                        />
                                        {draft.detail_kind === 'value' ? (
                                            <Field
                                                label="Figure"
                                                error={errors.detail_value}
                                                required
                                                hint="Digits read the same on both pages."
                                                className="sm:max-w-[16rem]"
                                            >
                                                <TextInput
                                                    name="detail_value"
                                                    value={draft.detail_value}
                                                    onChange={(event) =>
                                                        set(
                                                            'detail_value',
                                                            event.target.value,
                                                        )
                                                    }
                                                    maxLength={20}
                                                    placeholder="24"
                                                    autoComplete="off"
                                                />
                                            </Field>
                                        ) : null}
                                        <BilingualField
                                            label="Caption"
                                            name="detail_caption"
                                            optional
                                            maxLength={60}
                                            value={draft.detail_caption}
                                            onValueChange={setText(
                                                'detail_caption',
                                            )}
                                            errors={errors}
                                            hint="After the figure."
                                            placeholder={
                                                draft.detail_kind === 'prices'
                                                    ? {
                                                          en: 'a month',
                                                          ar: 'شهريًا',
                                                      }
                                                    : {
                                                          en: 'months',
                                                          ar: 'شهرًا',
                                                      }
                                            }
                                            inputProps={{
                                                autoComplete: 'off',
                                            }}
                                        />
                                        {draft.detail_kind === 'prices' ? (
                                            <CurrencyGrid
                                                name="detail_prices"
                                                legend="Second price"
                                                description={`Whole amounts in ${codeList}.`}
                                                currencies={currencies}
                                                defaultValue={
                                                    draft.detail_prices
                                                }
                                                onValueChange={(prices) =>
                                                    set('detail_prices', prices)
                                                }
                                                errors={errors}
                                                required
                                            />
                                        ) : null}
                                    </>
                                ) : null}
                            </Section>

                            <Section
                                index="04"
                                title="What is included"
                                description="The ticked list under the button, in order. Each row carries both languages, so they move together."
                            >
                                <BilingualField
                                    label="List heading"
                                    name="features_heading"
                                    optional
                                    maxLength={80}
                                    value={draft.features_heading}
                                    onValueChange={setText('features_heading')}
                                    errors={errors}
                                    hint="A lead-in above the list, for a plan that builds on another."
                                    placeholder={{
                                        en: 'Everything in Buy, plus',
                                        ar: 'كل ما في خطة الشراء، إضافةً إلى',
                                    }}
                                    inputProps={{ autoComplete: 'off' }}
                                />
                                <fieldset className="min-w-0">
                                    <legend className="text-[13px] leading-snug font-medium text-bone">
                                        Features
                                    </legend>
                                    <div className="mt-2">
                                        <BilingualList
                                            name="features"
                                            label="Features in card order"
                                            itemLabel="Feature"
                                            rows={draft.features}
                                            onRowsChange={(rows) =>
                                                set('features', rows)
                                            }
                                            errors={errors}
                                            max={MAX_FEATURES}
                                            maxLength={MAX_FEATURE}
                                            markup="emphasis"
                                            required
                                            addLabel="Add a feature"
                                            placeholder={{
                                                en: 'e.g. *12-month* warranty',
                                                ar: 'مثل: ضمان *12 شهرًا*',
                                            }}
                                            note="Wrap words in *asterisks* to set them in bone, like the figures on the page."
                                        />
                                    </div>
                                </fieldset>
                            </Section>

                            <Section
                                index="05"
                                title="Featured plan"
                                description="One plan is drawn as the arched mirror in the middle of the section, with a badge in its crown."
                            >
                                <div className="grid gap-2">
                                    <Toggle
                                        name="is_featured"
                                        checked={draft.is_featured}
                                        onCheckedChange={(checked) =>
                                            set('is_featured', checked)
                                        }
                                        disabled={lockedFeatured}
                                        label="Feature this plan"
                                        description={
                                            lockedFeatured
                                                ? `${plan.name} is the featured plan. To move the arch, feature another plan.`
                                                : featuredPlan
                                                  ? `Saving with this on takes the arch from ${featuredPlan}.`
                                                  : 'No plan is featured at the moment.'
                                        }
                                    />
                                    {errors.is_featured ? (
                                        <FieldError className="pl-[3.75rem]">
                                            {errors.is_featured}
                                        </FieldError>
                                    ) : null}
                                </div>
                                <div
                                    className={cn(
                                        'grid gap-7 transition-opacity duration-300',
                                        !draft.is_featured && 'opacity-70',
                                    )}
                                >
                                    <BilingualField
                                        label="Badge"
                                        name="badge"
                                        optional
                                        maxLength={40}
                                        value={draft.badge}
                                        onValueChange={setText('badge')}
                                        errors={errors}
                                        hint="Only the featured plan shows it."
                                        placeholder={{
                                            en: 'Most chosen',
                                            ar: 'الأكثر اختيارًا',
                                        }}
                                        inputProps={{ autoComplete: 'off' }}
                                    />
                                    <BilingualField
                                        label="Badge note"
                                        name="badge_note"
                                        optional
                                        maxLength={80}
                                        value={draft.badge_note}
                                        onValueChange={setText('badge_note')}
                                        errors={errors}
                                        hint="A short line under the badge."
                                        placeholder={{
                                            en: 'by 6 in 10 new stores',
                                            ar: 'تختاره 6 من كل 10 متاجر جديدة',
                                        }}
                                        inputProps={{ autoComplete: 'off' }}
                                    />
                                </div>
                            </Section>

                            <SaveBar
                                dirty={dirty}
                                processing={processing}
                                hasErrors={hasErrors}
                                savedAt={plan.updated_at}
                                onDiscard={() => {
                                    setDraft(draftOf(plan, codes));
                                    setVersion((value) => value + 1);
                                }}
                            />
                        </div>

                        <aside className="min-w-0 lg:sticky lg:top-6 lg:col-span-5">
                            <Panel
                                kicker="Live preview"
                                title="As the pricing section draws it"
                                description={
                                    hiddenCurrencies.length
                                        ? `Hidden on the page: ${hiddenCurrencies.join(', ')}.`
                                        : undefined
                                }
                                actions={
                                    <PreviewLocaleToggle
                                        value={locale}
                                        onValueChange={setLocale}
                                    />
                                }
                            >
                                <div className="grid gap-6">
                                    <CurrencySwitch
                                        currencies={currencies}
                                        value={currency}
                                        onChange={setCurrency}
                                        label="Show in"
                                    />
                                    <PlanCard
                                        plan={cardOf(draft, locale)}
                                        currency={currency}
                                        customPrice={copy[locale].customPrice}
                                        locale={locale}
                                        className={
                                            draft.is_featured
                                                ? 'pt-1'
                                                : undefined
                                        }
                                    />
                                    {locale === 'ar' &&
                                    completeness.some(
                                        (field) =>
                                            !isBlank(field.en) &&
                                            isBlank(field.ar),
                                    ) ? (
                                        <p className="text-[12.5px] leading-relaxed text-smoke">
                                            Texts not translated yet show in
                                            English, as they would on the Arabic
                                            page.
                                        </p>
                                    ) : null}
                                    {copy[locale].note ? (
                                        <p className="text-[12.5px] leading-relaxed text-smoke">
                                            Beside the currency switch:{' '}
                                            <span
                                                {...localeProps(locale)}
                                                className={cn(
                                                    'text-mist',
                                                    locale === 'ar' &&
                                                        'mt-1 block text-[13.5px]',
                                                )}
                                            >
                                                {copy[locale].note}
                                            </span>
                                        </p>
                                    ) : null}
                                </div>
                            </Panel>
                        </aside>
                    </>
                )}
            </Form>
        </>
    );
}
