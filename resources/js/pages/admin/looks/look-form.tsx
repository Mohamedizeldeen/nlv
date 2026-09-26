import { Form, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import LookCategoryController from '@/actions/App/Http/Controllers/Admin/LookCategoryController';
import LookController from '@/actions/App/Http/Controllers/Admin/LookController';
import { CompletenessBadge } from '@/components/admin/arabic-completeness';
import {
    bilingualValue,
    isBlank,
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
import { ImageInput } from '@/components/admin/image-input';
import { mediaAspect, mediaUrl } from '@/components/admin/media';
import { NumberInput } from '@/components/admin/number-input';
import { Panel } from '@/components/admin/panel';
import { PreviewLocaleToggle } from '@/components/admin/preview-locale-toggle';
import { SaveBar } from '@/components/admin/save-bar';
import { Select } from '@/components/admin/select';
import { Toggle } from '@/components/admin/toggle';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import type { FocusPoint } from '@/types/admin';
import { LOOK_FIELD_LABELS, PreviewFallbackNote } from './arabic-missing';
import { BeforeAfterPreview } from './before-after';
import type { LookFormProps, LookTextField } from './types';

/** An object URL for a picked file, revoked when it changes or unmounts. */
function useObjectUrl(file: File | null): string | null {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setUrl(null);

            return;
        }

        const next = URL.createObjectURL(file);
        setUrl(next);

        return () => URL.revokeObjectURL(next);
    }, [file]);

    return url;
}

/** Width / height of an image URL once it loads (null until then). */
function useImageAspect(url: string | null): number | null {
    const [aspect, setAspect] = useState<{
        url: string;
        value: number;
    } | null>(null);

    useEffect(() => {
        if (!url) {
            return;
        }

        const image = new Image();
        image.onload = () => {
            if (image.naturalWidth && image.naturalHeight) {
                setAspect({
                    url,
                    value: image.naturalWidth / image.naturalHeight,
                });
            }
        };
        image.src = url;

        return () => {
            image.onload = null;
        };
    }, [url]);

    return aspect && aspect.url === url ? aspect.value : null;
}

/**
 * Whether the form currently holds a hidden input named `name` (ImageInput
 * adds "remove_before_image" when the stored photo is removed, without an
 * event), watched with a MutationObserver.
 */
function useHiddenFlag(
    form: RefObject<HTMLFormElement | null>,
    name: string,
): boolean {
    const [present, setPresent] = useState(false);

    useEffect(() => {
        const node = form.current;

        if (!node) {
            return;
        }

        const check = () =>
            setPresent(
                node.querySelector(`input[type="hidden"][name="${name}"]`) !==
                    null,
            );
        const observer = new MutationObserver(check);
        observer.observe(node, { subtree: true, childList: true });
        check();

        return () => observer.disconnect();
    }, [form, name]);

    return present;
}

const RATIOS: [number, string][] = [
    [9 / 16, '9 : 16'],
    [2 / 3, '2 : 3'],
    [3 / 4, '3 : 4'],
    [4 / 5, '4 : 5'],
    [1, '1 : 1'],
    [5 / 4, '5 : 4'],
    [4 / 3, '4 : 3'],
    [3 / 2, '3 : 2'],
    [16 / 9, '16 : 9'],
];

function describeAspect(aspect: number): string {
    const named = RATIOS.find(([ratio]) => Math.abs(ratio - aspect) < 0.012);
    const orientation =
        aspect < 0.98 ? 'portrait' : aspect > 1.02 ? 'landscape' : 'square';

    return named
        ? `${named[1]} ${orientation}`
        : `${aspect.toFixed(2)} ${orientation}`;
}

type Texts = Record<LookTextField, BilingualValue>;

const TEXT_FIELDS: readonly LookTextField[] = ['title', 'city', 'alt'];

/** The same focal point, to the two decimals the form sends. */
const sameFocus = (a: FocusPoint, b: FocusPoint) =>
    Math.round(a[0] * 100) === Math.round(b[0] * 100) &&
    Math.round(a[1] * 100) === Math.round(b[1] * 100);

type BodyProps = LookFormProps & {
    onDiscard: () => void;
    /** The preview's language (kept by the wrapper across saves). */
    locale: ContentLocale;
    onLocaleChange: (locale: ContentLocale) => void;
};

function LookFormBody({
    look,
    categories,
    position,
    onDiscard,
    locale,
    onLocaleChange,
}: BodyProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const isNew = look.id === null;

    // Every value is held here (the texts are controlled by the bilingual
    // fields), so the form's dirtiness comes from this state rather than
    // from the <form>: a listener on the form would re-render the fields
    // before React reads the keystroke, and drop it.
    const [initialTexts] = useState<Texts>(() => ({
        title: bilingualValue(look, 'title'),
        city: bilingualValue(look, 'city'),
        alt: bilingualValue(look, 'alt'),
    }));
    const [texts, setTexts] = useState<Texts>(initialTexts);
    const setText = (field: LookTextField) => (value: BilingualValue) =>
        setTexts((current) => ({ ...current, [field]: value }));
    const untranslated = TEXT_FIELDS.filter(
        (field) => !isBlank(texts[field].en) && isBlank(texts[field].ar),
    ).map((field) => LOOK_FIELD_LABELS[field]);
    const initialCategory =
        look.look_category_id === null ? '' : String(look.look_category_id);
    const [categoryId, setCategoryId] = useState(initialCategory);
    const [published, setPublished] = useState(look.is_published);
    const [seconds, setSeconds] = useState<number | null>(look.render_seconds);
    const [focus, setFocus] = useState<FocusPoint>(look.focus);
    const [afterFile, setAfterFile] = useState<File | null>(null);
    const [beforeFile, setBeforeFile] = useState<File | null>(null);
    const beforeRemoved = useHiddenFlag(formRef, 'remove_before_image');

    const dirty =
        TEXT_FIELDS.some(
            (field) =>
                texts[field].en !== initialTexts[field].en ||
                texts[field].ar !== initialTexts[field].ar,
        ) ||
        categoryId !== initialCategory ||
        published !== look.is_published ||
        seconds !== look.render_seconds ||
        !sameFocus(focus, look.focus) ||
        afterFile !== null ||
        beforeFile !== null ||
        beforeRemoved;
    const guard = useUnsavedGuard(dirty, {
        subject: isNew ? 'this new look' : `“${look.title}”`,
    });

    const afterPicked = useObjectUrl(afterFile);
    const beforePicked = useObjectUrl(beforeFile);
    const afterUrl =
        afterPicked ?? (look.after ? mediaUrl(look.after, 1200) : null);
    const beforeUrl =
        beforePicked ??
        (look.before && !beforeRemoved ? mediaUrl(look.before, 1200) : null);
    const pickedAspect = useImageAspect(afterPicked);
    const aspect = afterPicked
        ? (pickedAspect ?? look.aspect)
        : ((look.after ? mediaAspect(look.after) : null) ?? look.aspect);

    const action = isNew
        ? LookController.store.form()
        : LookController.update.form(look.id ?? 0);
    const noCategories = categories.length === 0;

    return (
        <Form {...action} options={{ preserveScroll: true }} className="mt-8">
            {({ errors, processing, hasErrors }) => (
                // The remove flag watches the <form> itself.
                <div
                    ref={(node) => {
                        formRef.current = node?.closest('form') ?? null;
                    }}
                    className="contents"
                >
                    <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
                        <Panel
                            title="Photos"
                            description="The try-on result is what shoppers see; the before is revealed under it."
                            variant="strong"
                            className="lg:col-span-7"
                            bodyClassName="grid gap-8"
                            actions={
                                <CompletenessBadge
                                    fields={[
                                        {
                                            name: 'title',
                                            label: 'Title',
                                            ...texts.title,
                                        },
                                        {
                                            name: 'city',
                                            label: 'City',
                                            ...texts.city,
                                        },
                                        {
                                            name: 'alt',
                                            label: 'Alt text',
                                            ...texts.alt,
                                        },
                                    ]}
                                />
                            }
                        >
                            <Field
                                label="Try-on result"
                                required={isNew}
                                error={
                                    errors.after_image ??
                                    errors.focus_x ??
                                    errors.focus_y
                                }
                                hint="Click the photo to set the focal point: it stays in frame wherever the photo is cropped. The card on the page keeps the photo's own shape."
                            >
                                <ImageInput
                                    name="after_image"
                                    value={look.after}
                                    alt={look.alt}
                                    focus={look.focus}
                                    focusNames={['focus_x', 'focus_y']}
                                    onFocusChange={setFocus}
                                    onFileChange={setAfterFile}
                                    crops={[
                                        { label: 'Grid 4:5', aspect: 4 / 5 },
                                        { label: 'Square', aspect: 1 },
                                    ]}
                                    subject="the try-on result"
                                />
                            </Field>

                            <div className="border-t border-white/10 pt-7">
                                <Field
                                    label="Before"
                                    optional
                                    error={errors.before_image}
                                    hint="The shopper's own photo, taken at the device before the try-on. Without it, the page shows a grayscale scan of the result."
                                >
                                    <ImageInput
                                        name="before_image"
                                        value={look.before}
                                        alt=""
                                        removeName="remove_before_image"
                                        onFileChange={setBeforeFile}
                                        subject="the shopper's own photo"
                                    />
                                </Field>
                            </div>
                        </Panel>

                        {/* Beside the photos, caption and save bar; between them on phones. */}
                        <aside className="grid gap-5 lg:sticky lg:top-8 lg:col-span-5 lg:row-span-3">
                            <Panel
                                kicker="Live preview"
                                title="On the landing page"
                                description="Drag across the photo to move the line between before and after."
                                actions={
                                    <PreviewLocaleToggle
                                        value={locale}
                                        onValueChange={onLocaleChange}
                                    />
                                }
                            >
                                <BeforeAfterPreview
                                    after={afterUrl}
                                    before={beforeUrl}
                                    aspect={aspect}
                                    focus={focus}
                                    alt={localized(texts.alt, locale)}
                                    locale={locale}
                                    caption={{
                                        number: String(position).padStart(
                                            2,
                                            '0',
                                        ),
                                        city: localized(texts.city, locale),
                                        seconds,
                                        title: localized(texts.title, locale),
                                    }}
                                    className="mx-auto w-full max-w-[26rem] lg:max-w-(--preview-max)"
                                    style={{
                                        // Beside the form the whole panel stays in view,
                                        // so tall photos get a narrower card.
                                        '--preview-max': `min(26rem, calc((100svh - 25rem) * ${aspect}))`,
                                    }}
                                />
                                <PreviewFallbackNote
                                    locale={locale}
                                    missing={untranslated}
                                    className="mx-auto mt-4 max-w-[26rem]"
                                />
                                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4 text-[12.5px]">
                                    <div>
                                        <dt className="text-[10px] font-medium tracking-[0.2em] text-smoke uppercase">
                                            Shape
                                        </dt>
                                        <dd className="mt-0.5 text-mist">
                                            {afterUrl
                                                ? describeAspect(aspect)
                                                : '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] font-medium tracking-[0.2em] text-smoke uppercase">
                                            Before
                                        </dt>
                                        <dd className="mt-0.5 text-mist">
                                            {beforeUrl
                                                ? "Shopper's photo"
                                                : 'Scan of the result'}
                                        </dd>
                                    </div>
                                </dl>
                            </Panel>
                        </aside>

                        <Panel
                            title="Caption and details"
                            description="Printed on the card in each language, and read aloud to shoppers using a screen reader."
                            variant="strong"
                            className="lg:col-span-7"
                            bodyClassName="grid gap-7"
                        >
                            <BilingualField
                                label="Title"
                                name="title"
                                required
                                maxLength={80}
                                errors={errors}
                                value={texts.title}
                                onValueChange={setText('title')}
                                placeholder={{
                                    en: 'Quilted abaya, navy',
                                    ar: 'عباية مبطّنة، كحلية',
                                }}
                                hint="The piece and its colour, as on a label."
                                inputProps={{ autoComplete: 'off' }}
                            />

                            <BilingualField
                                label="City"
                                name="city"
                                required
                                maxLength={60}
                                errors={errors}
                                value={texts.city}
                                onValueChange={setText('city')}
                                placeholder={{ en: 'Riyadh', ar: 'الرياض' }}
                                hint="Where it was tried on."
                                inputProps={{ autoComplete: 'off' }}
                            />

                            <BilingualTextarea
                                label="Alt text"
                                name="alt"
                                required
                                maxLength={200}
                                rows={2}
                                errors={errors}
                                value={texts.alt}
                                onValueChange={setText('alt')}
                                hint="Describe the person and the outfit for people who can't see the photo: “A woman in a navy quilted abaya, seated beneath woven baskets”."
                            />

                            <div className="grid gap-6 border-t border-white/10 pt-7 sm:grid-cols-2">
                                <Field
                                    label="Category"
                                    required
                                    error={errors.look_category_id}
                                    hint={
                                        noCategories ? (
                                            <>
                                                There are no categories yet.{' '}
                                                <Link
                                                    href={LookCategoryController.create.url()}
                                                    className="text-mint underline decoration-mint/40 underline-offset-4"
                                                >
                                                    Add one first
                                                </Link>
                                                .
                                            </>
                                        ) : (
                                            'The lookbook filter it appears under.'
                                        )
                                    }
                                >
                                    <Select
                                        name="look_category_id"
                                        placeholder="Choose a category"
                                        defaultValue={initialCategory}
                                        onChange={(event) =>
                                            setCategoryId(event.target.value)
                                        }
                                        options={categories.map((category) => ({
                                            value: String(category.id),
                                            label: category.name,
                                        }))}
                                    />
                                </Field>
                                <Field
                                    label="Render time"
                                    required
                                    error={errors.render_seconds}
                                    hint="Seconds from pick to result, one decimal."
                                >
                                    <NumberInput
                                        name="render_seconds"
                                        defaultValue={look.render_seconds}
                                        step={0.1}
                                        min={0.1}
                                        max={9.9}
                                        unit="s"
                                        onValueChange={setSeconds}
                                    />
                                </Field>
                            </div>

                            <Toggle
                                name="is_published"
                                defaultChecked={look.is_published}
                                onCheckedChange={setPublished}
                                label="Live on the page"
                                description="Off keeps the look here, hidden from the lookbook on both pages."
                            />
                        </Panel>

                        <SaveBar
                            dirty={dirty}
                            isNew={isNew}
                            processing={processing}
                            hasErrors={hasErrors}
                            savedAt={look.updated_at}
                            onDiscard={onDiscard}
                            createLabel="Add look"
                            className="lg:col-span-7"
                        />
                    </div>
                    {guard}
                </div>
            )}
        </Form>
    );
}

/**
 * The look form (create and edit). Remounts after every save and on
 * Discard, so the saved values become the new starting point; the
 * preview keeps its language.
 */
export function LookForm(props: LookFormProps) {
    const [generation, setGeneration] = useState(0);
    const [locale, setLocale] = useState<ContentLocale>('en');

    return (
        <LookFormBody
            key={`${props.look.updated_at ?? 'new'}-${generation}`}
            {...props}
            onDiscard={() => setGeneration((value) => value + 1)}
            locale={locale}
            onLocaleChange={setLocale}
        />
    );
}
