import { Form, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import LookCategoryController from '@/actions/App/Http/Controllers/Admin/LookCategoryController';
import LookController from '@/actions/App/Http/Controllers/Admin/LookController';
import { CompletenessBadge } from '@/components/admin/arabic-completeness';
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
import { Field } from '@/components/admin/field';
import { plural } from '@/components/admin/format';
import { MediaImage } from '@/components/admin/media';
import { Panel } from '@/components/admin/panel';
import { PreviewLocaleToggle } from '@/components/admin/preview-locale-toggle';
import { SaveBar } from '@/components/admin/save-bar';
import { TextInput } from '@/components/admin/text-input';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import {
    CATEGORY_FIELD_LABELS,
    PreviewFallbackNote,
} from '../looks/arabic-missing';
import { CategoryKicker } from '../looks/category-kicker';
import { lookbookChrome } from '../looks/lookbook-copy';
import type { CategoryTextField, LookCategoryFormProps } from '../looks/types';
import { FilterTabs, slugify, TrendNote } from './trend-note';

type Texts = Record<CategoryTextField, BilingualValue>;

const TEXT_FIELDS: readonly CategoryTextField[] = [
    'name',
    'note',
    'stat_figure',
    'stat_unit',
];

type BodyProps = LookCategoryFormProps & {
    onDiscard: () => void;
    /** The preview's language (kept by the wrapper across discards). */
    locale: ContentLocale;
    onLocaleChange: (locale: ContentLocale) => void;
};

/** A figure that reads the same in Arabic: digits and signs, no Latin letters. */
const LANGUAGE_NEUTRAL = /^[^A-Za-z]+$/;

const linkButton =
    'cursor-pointer rounded-[6px] text-mist underline decoration-white/25 underline-offset-4 hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

function CategoryFormBody({
    category,
    siblings,
    suffix,
    onDiscard,
    locale,
    onLocaleChange,
}: BodyProps) {
    const isNew = category.id === null;

    // Every field is controlled, so the form's dirtiness comes from this
    // state (a listener on the <form> would re-render the fields before
    // React reads the keystroke, and drop it).
    const [initialTexts] = useState<Texts>(() => ({
        name: bilingualValue(category, 'name'),
        note: bilingualValue(category, 'note'),
        stat_figure: bilingualValue(category, 'stat_figure'),
        stat_unit: bilingualValue(category, 'stat_unit'),
    }));
    const [texts, setTexts] = useState<Texts>(initialTexts);
    const setText = (field: CategoryTextField) => (value: BilingualValue) =>
        setTexts((current) => ({ ...current, [field]: value }));
    // A new category's slug follows its English name until it is typed
    // in; an existing one keeps its slug (links to the filter use it).
    const [slug, setSlug] = useState(category.slug);
    const [slugTouched, setSlugTouched] = useState(!isNew);
    const shownSlug = slugTouched ? slug : slugify(texts.name.en);
    const dirty =
        TEXT_FIELDS.some(
            (field) =>
                texts[field].en !== initialTexts[field].en ||
                texts[field].ar !== initialTexts[field].ar,
        ) || shownSlug !== category.slug;
    const guard = useUnsavedGuard(dirty, {
        subject: isNew ? 'this new category' : `the ${category.name} filter`,
    });

    // The preview, as the page in `locale` shows it (English where the
    // Arabic is still empty).
    const shown = (field: CategoryTextField) =>
        localized(texts[field], locale).trim();
    const label = shown('name') || 'New category';
    const untranslated = TEXT_FIELDS.filter(
        (field) => !isBlank(texts[field].en) && isBlank(texts[field].ar),
    ).map((field) => CATEGORY_FIELD_LABELS[field]);
    const figure = texts.stat_figure;
    const canCopyFigure =
        !isBlank(figure.en) &&
        isBlank(figure.ar) &&
        LANGUAGE_NEUTRAL.test(figure.en.trim());

    const tabs = [
        { key: 'all', label: lookbookChrome(locale).all },
        ...siblings
            .filter((sibling) => sibling.id !== category.id)
            .map((sibling) => ({
                key: String(sibling.id),
                label:
                    locale === 'ar' && !isBlank(sibling.name_ar)
                        ? (sibling.name_ar ?? sibling.name)
                        : sibling.name,
            })),
    ];
    const self = { key: 'self', label };
    const index = siblings.findIndex((sibling) => sibling.id === category.id);

    if (index === -1) {
        tabs.push(self);
    } else {
        tabs.splice(index + 1, 0, self);
    }

    const action = isNew
        ? LookCategoryController.store.form()
        : LookCategoryController.update.form(category.id ?? 0);

    return (
        <Form {...action} options={{ preserveScroll: true }} className="mt-8">
            {({ errors, processing, hasErrors }) => (
                <>
                    <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
                        <div className="grid gap-5 lg:col-span-7">
                            <Panel
                                title="The filter"
                                description="A tab above the lookbook grid. It shows on the page once it has a live look."
                                variant="strong"
                                bodyClassName="grid gap-7"
                                actions={
                                    <CompletenessBadge
                                        fields={[
                                            {
                                                name: 'name',
                                                label: 'Name',
                                                ...texts.name,
                                            },
                                            {
                                                name: 'note',
                                                label: 'Note',
                                                ...texts.note,
                                            },
                                            {
                                                name: 'stat_figure',
                                                label: 'Figure',
                                                ...texts.stat_figure,
                                            },
                                            {
                                                name: 'stat_unit',
                                                label: 'Unit',
                                                ...texts.stat_unit,
                                            },
                                        ]}
                                    />
                                }
                            >
                                <BilingualField
                                    label="Name"
                                    name="name"
                                    required
                                    maxLength={40}
                                    errors={errors}
                                    value={texts.name}
                                    onValueChange={setText('name')}
                                    placeholder={{
                                        en: 'Abayas',
                                        ar: 'العبايات',
                                    }}
                                    hint="The tab's label: one or two words, like “Abayas” or “Eyewear”."
                                    inputProps={{ autoComplete: 'off' }}
                                />
                                <Field
                                    label="Slug"
                                    required
                                    error={errors.slug}
                                    hint={
                                        isNew
                                            ? 'Made from the English name. Lowercase letters, numbers and hyphens; both pages use it to name the filter.'
                                            : 'Lowercase letters, numbers and hyphens. Changing it is safe, but links that name the old slug stop picking this filter.'
                                    }
                                    aside={
                                        isNew && slugTouched ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSlugTouched(false);
                                                }}
                                                className={linkButton}
                                            >
                                                Match the name
                                            </button>
                                        ) : null
                                    }
                                >
                                    <TextInput
                                        name="slug"
                                        value={shownSlug}
                                        maxLength={60}
                                        autoComplete="off"
                                        spellCheck={false}
                                        inputClassName="font-mono text-[14px]"
                                        onChange={(event) => {
                                            setSlug(
                                                event.target.value
                                                    .toLowerCase()
                                                    .replace(
                                                        /[^a-z0-9-]/g,
                                                        '-',
                                                    ),
                                            );
                                            setSlugTouched(true);
                                        }}
                                        onBlur={() =>
                                            slugTouched &&
                                            setSlug((value) => slugify(value))
                                        }
                                    />
                                </Field>
                            </Panel>

                            <Panel
                                title="This week’s note"
                                description="Opens the grid when a shopper picks this filter. Refresh it with the edit. Each part is optional, in both languages or neither."
                                variant="strong"
                                bodyClassName="grid gap-7"
                            >
                                <BilingualTextarea
                                    label="Note"
                                    name="note"
                                    optional
                                    maxLength={200}
                                    rows={2}
                                    errors={errors}
                                    value={texts.note}
                                    onValueChange={setText('note')}
                                    hint="One line about the week: what led, where, in which sizes."
                                />
                                <BilingualField
                                    label="Figure"
                                    name="stat_figure"
                                    optional
                                    maxLength={16}
                                    errors={errors}
                                    value={texts.stat_figure}
                                    onValueChange={setText('stat_figure')}
                                    placeholder={{ en: '54', ar: '54' }}
                                    hint="Set large: “54”, “38%”, “Sat”. Western digits in Arabic too."
                                    inputProps={{ autoComplete: 'off' }}
                                    localeAside={{
                                        ar: canCopyFigure ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setText('stat_figure')({
                                                        ...figure,
                                                        ar: figure.en.trim(),
                                                    })
                                                }
                                                className={linkButton}
                                            >
                                                Use “{figure.en.trim()}”
                                            </button>
                                        ) : null,
                                    }}
                                />
                                <BilingualField
                                    label="Unit"
                                    name="stat_unit"
                                    optional
                                    maxLength={40}
                                    errors={errors}
                                    value={texts.stat_unit}
                                    onValueChange={setText('stat_unit')}
                                    placeholder={{
                                        en: 'most tried size',
                                        ar: 'المقاس الأكثر تجربة',
                                    }}
                                    hint="Under the figure, in mint. It needs a figure."
                                    inputProps={{ autoComplete: 'off' }}
                                />
                            </Panel>

                            <SaveBar
                                dirty={dirty}
                                isNew={isNew}
                                processing={processing}
                                hasErrors={hasErrors}
                                onDiscard={onDiscard}
                                createLabel="Add category"
                            />
                        </div>

                        <aside className="grid gap-5 lg:sticky lg:top-8 lg:col-span-5">
                            <Panel
                                kicker="Live preview"
                                title="On the landing page"
                                actions={
                                    <PreviewLocaleToggle
                                        value={locale}
                                        onValueChange={onLocaleChange}
                                    />
                                }
                                bodyClassName="grid gap-6"
                            >
                                <div
                                    {...localeProps(locale)}
                                    data-preview-locale={locale}
                                    className="grid gap-6"
                                >
                                    <FilterTabs tabs={tabs} active="self" />
                                    <TrendNote
                                        kicker={
                                            <CategoryKicker
                                                name={label}
                                                suffix={suffix[locale]}
                                            />
                                        }
                                        figure={shown('stat_figure') || null}
                                        unit={shown('stat_unit') || null}
                                        line={shown('note') || null}
                                    />
                                </div>
                                <PreviewFallbackNote
                                    locale={locale}
                                    missing={untranslated}
                                    className="border-t border-white/10 pt-4"
                                />
                            </Panel>

                            {isNew ? null : (
                                <Panel
                                    kicker="In this category"
                                    title={plural(category.looks_count, 'look')}
                                    description={
                                        category.looks_count === 0
                                            ? 'No looks yet, so the filter is not on the page.'
                                            : category.live_count === 0
                                              ? 'None is live, so the filter is not on the page.'
                                              : `${category.live_count} live on the page.`
                                    }
                                    actions={
                                        <Link
                                            href={
                                                category.looks_count
                                                    ? LookController.index.url({
                                                          query: {
                                                              category:
                                                                  category.slug,
                                                          },
                                                      })
                                                    : LookController.create.url(
                                                          {
                                                              query: {
                                                                  category:
                                                                      category.slug,
                                                              },
                                                          },
                                                      )
                                            }
                                            className="group inline-flex items-center gap-1.5 rounded-[8px] text-[13px] text-mist transition-colors duration-300 ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                        >
                                            {category.looks_count
                                                ? 'See them'
                                                : 'Add a look'}
                                            <ArrowRight
                                                aria-hidden
                                                className="size-3.5 text-smoke transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:text-mint"
                                            />
                                        </Link>
                                    }
                                    padded={category.covers.length > 0}
                                >
                                    {category.covers.length ? (
                                        <div className="flex gap-2">
                                            {category.covers.map(
                                                (cover, position) => (
                                                    <MediaImage
                                                        key={position}
                                                        media={cover.media}
                                                        focus={cover.focus}
                                                        alt=""
                                                        width={120}
                                                        className="aspect-[4/5] w-1/3 rounded-[12px] ring-1 ring-white/10"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    ) : null}
                                </Panel>
                            )}
                        </aside>
                    </div>
                    {guard}
                </>
            )}
        </Form>
    );
}

/** The category form (create and edit); Discard remounts it, the preview keeps its language. */
export function CategoryForm(props: LookCategoryFormProps) {
    const [generation, setGeneration] = useState(0);
    const [locale, setLocale] = useState<ContentLocale>('en');

    return (
        <CategoryFormBody
            key={generation}
            {...props}
            onDiscard={() => setGeneration((value) => value + 1)}
            locale={locale}
            onLocaleChange={setLocale}
        />
    );
}
