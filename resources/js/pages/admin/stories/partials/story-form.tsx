import { Form } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
    CompletenessBadge,
    useArabicCompleteness,
} from '@/components/admin/arabic-completeness';
import type { CompletenessField } from '@/components/admin/arabic-completeness';
import { bilingualValue, localized } from '@/components/admin/bilingual';
import type {
    BilingualValue,
    ContentLocale,
} from '@/components/admin/bilingual';
import {
    BilingualAccentInput,
    BilingualField,
} from '@/components/admin/bilingual-field';
import { Button } from '@/components/admin/button';
import { Modal } from '@/components/admin/dialog';
import { Field, FieldError } from '@/components/admin/field';
import { ImageInput } from '@/components/admin/image-input';
import { mediaUrl } from '@/components/admin/media';
import { Panel } from '@/components/admin/panel';
import { PreviewLocaleToggle } from '@/components/admin/preview-locale-toggle';
import { SaveBar } from '@/components/admin/save-bar';
import { TextInput } from '@/components/admin/text-input';
import { Toggle } from '@/components/admin/toggle';
import { useUnsavedGuard } from '@/components/admin/use-unsaved-guard';
import type { FocusPoint } from '@/types/admin';
import { STORY_FIELD_LABELS, TRANSLATABLE_STORY_FIELDS } from './fields';
import type { TranslatableStoryField } from './fields';
import { StoryPreview } from './story-preview';
import type { StoryPreviewValues } from './story-preview';
import type { StoryForm as StoryFormData, StoryLimits } from './types';
import { ZoomSlider } from './zoom-slider';

type FormTarget = {
    action: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
};

/** The texts that are the same in both languages. */
type PlainKey = 'coordinates' | 'metric_figure';

const PLAIN_KEYS: PlainKey[] = ['coordinates', 'metric_figure'];

type Values = Record<TranslatableStoryField, BilingualValue> &
    Record<PlainKey, string> & {
        focus: FocusPoint;
        zoom: number;
        published: boolean;
    };

function valuesOf(story: StoryFormData): Values {
    const texts = Object.fromEntries(
        TRANSLATABLE_STORY_FIELDS.map((key) => [
            key,
            bilingualValue(story, key),
        ]),
    ) as Record<TranslatableStoryField, BilingualValue>;
    const plain = Object.fromEntries(
        PLAIN_KEYS.map((key) => [key, story[key] ?? '']),
    ) as Record<PlainKey, string>;

    return {
        ...texts,
        ...plain,
        focus: story.portrait_focus,
        zoom: story.portrait_zoom,
        published: story.is_published,
    };
}

const same = (a: number, b: number) => Math.abs(a - b) < 0.005;

function isChanged(values: Values, initial: Values): boolean {
    return (
        TRANSLATABLE_STORY_FIELDS.some(
            (key) =>
                values[key].en.trim() !== initial[key].en.trim() ||
                values[key].ar.trim() !== initial[key].ar.trim(),
        ) ||
        PLAIN_KEYS.some((key) => values[key].trim() !== initial[key].trim()) ||
        !same(values.focus[0], initial.focus[0]) ||
        !same(values.focus[1], initial.focus[1]) ||
        !same(values.zoom, initial.zoom) ||
        values.published !== initial.published
    );
}

type StoryFormProps = {
    story: StoryFormData;
    limits: StoryLimits;
    /** Wayfinder `.form()` of the store or update route. */
    target: FormTarget;
    /** Where the story sits on the page, e.g. "N° 05 of 05". */
    positionNote: ReactNode;
    /** Extra panels under the form (the edit page's history). */
    children?: ReactNode;
};

/**
 * The story form shared by create and edit: who is speaking, the quote,
 * the figure, the portrait (focal point + zoom) and visibility, with a
 * live preview of the landing page's story card beside it (in a modal
 * below `xl`), the kit's save bar and a guard against leaving unsaved.
 * Discard remounts it, so every field goes back to its saved value.
 */
export function StoryForm(props: StoryFormProps) {
    const [generation, setGeneration] = useState(0);

    return (
        <StoryFormBody
            key={generation}
            {...props}
            onDiscard={() => setGeneration((value) => value + 1)}
        />
    );
}

function StoryFormBody({
    story,
    limits,
    target,
    positionNote,
    children,
    onDiscard,
}: StoryFormProps & { onDiscard: () => void }) {
    const [initial] = useState(() => valuesOf(story));
    const [values, setValues] = useState(initial);
    const [picked, setPicked] = useState<{ file: File; url: string } | null>(
        null,
    );
    const [previewOpen, setPreviewOpen] = useState(false);
    const [locale, setLocale] = useState<ContentLocale>('en');
    const creating = story.id === null;
    const dirty = picked !== null || isChanged(values, initial);
    const guard = useUnsavedGuard(dirty, {
        subject: creating
            ? 'this new story'
            : `${story.name.split(' ')[0] || 'this'}'s story`,
    });

    // Free the preview's object URL when the file changes or the form goes away.
    const pickedUrl = picked?.url;

    useEffect(
        () => () => {
            if (pickedUrl) {
                URL.revokeObjectURL(pickedUrl);
            }
        },
        [pickedUrl],
    );

    const set = <K extends keyof Values>(key: K, value: Values[K]) =>
        setValues((current) => ({ ...current, [key]: value }));

    /** Props of a bilingual field bound to `key` (`key` + `key_ar`). */
    const bilingual = (key: TranslatableStoryField) => ({
        name: key,
        value: values[key],
        onValueChange: (value: BilingualValue) => set(key, value),
    });

    const plain = (key: PlainKey) => ({
        name: key,
        value: values[key],
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
            set(key, event.target.value),
    });

    const completenessFields: CompletenessField[] =
        TRANSLATABLE_STORY_FIELDS.map((key) => ({
            name: key,
            label: STORY_FIELD_LABELS[key],
            ...values[key],
        }));
    const arabic = useArabicCompleteness(completenessFields);

    const onFileChange = (file: File | null) =>
        setPicked(file ? { file, url: URL.createObjectURL(file) } : null);

    /** A text as the card shows it in the preview's language. */
    const shown = (key: TranslatableStoryField) =>
        localized(values[key], locale);

    const preview: StoryPreviewValues = {
        name: shown('name'),
        role: shown('role'),
        store: shown('store'),
        city: shown('city'),
        coordinates: values.coordinates,
        quote: shown('quote'),
        figure: values.metric_figure,
        label: shown('metric_label'),
        note: shown('metric_note'),
        short: shown('metric_short'),
        image: picked
            ? picked.url
            : story.portrait
              ? mediaUrl(story.portrait, 1200)
              : null,
        focus: values.focus,
        zoom: values.zoom,
    };

    // On the Arabic card, the texts still in English (as /ar shows them).
    const untranslated =
        locale === 'ar' ? arabic.missing.map((field) => field.label) : [];

    const previewNote =
        untranslated.length > 0 ? (
            <p className="mt-5 border-t border-white/10 pt-4 text-[12.5px] leading-relaxed text-pretty text-smoke">
                <span className="text-[oklch(0.8_0.09_195)]">
                    Not translated yet:
                </span>{' '}
                {untranslated.join(', ')}. The Arabic page shows the English
                there until you add it.
            </p>
        ) : null;

    return (
        <>
            {guard}
            <Form
                action={target.action}
                method={target.method}
                options={{ preserveScroll: true }}
                disableWhileProcessing
                className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_25rem] 2xl:grid-cols-[minmax(0,1fr)_27rem]"
            >
                {({ errors, processing, hasErrors }) => (
                    <>
                        <div className="grid min-w-0 gap-5">
                            <Panel
                                kicker="01"
                                title="Who is speaking"
                                description="Printed under the quote, and in the story list."
                                variant="strong"
                                actions={
                                    <CompletenessBadge completeness={arabic} />
                                }
                            >
                                <div className="grid gap-6">
                                    <BilingualField
                                        {...bilingual('name')}
                                        label="Name"
                                        required
                                        maxLength={80}
                                        errors={errors}
                                        inputProps={{ autoComplete: 'off' }}
                                        placeholder={{
                                            en: 'Noura Al-Harbi',
                                            ar: 'نورة الحربي',
                                        }}
                                    />
                                    <BilingualField
                                        {...bilingual('role')}
                                        label="Role"
                                        required
                                        maxLength={80}
                                        errors={errors}
                                        placeholder={{
                                            en: 'Founder',
                                            ar: 'مؤسِّسة',
                                        }}
                                    />
                                    <BilingualField
                                        {...bilingual('store')}
                                        label="Store"
                                        required
                                        maxLength={80}
                                        errors={errors}
                                        placeholder={{
                                            en: 'Rimal Abayas',
                                            ar: 'رمال للعبايات',
                                        }}
                                    />
                                    <BilingualField
                                        {...bilingual('city')}
                                        label="City"
                                        required
                                        maxLength={60}
                                        errors={errors}
                                        placeholder={{
                                            en: 'Riyadh',
                                            ar: 'الرياض',
                                        }}
                                    />
                                    <Field
                                        label="Coordinates"
                                        optional
                                        error={errors.coordinates}
                                        hint="Printed under the city on the portrait, like a lookbook caption. The Arabic page writes N, S, E and W in Arabic."
                                    >
                                        <TextInput
                                            {...plain('coordinates')}
                                            maxLength={40}
                                            placeholder="24.71° N · 46.68° E"
                                            className="sm:max-w-[20rem]"
                                        />
                                    </Field>
                                </div>
                            </Panel>

                            <Panel
                                kicker="02"
                                title="The quote"
                                description="Their words, lightly edited. The one phrase in asterisks is set in mint, in both languages."
                                variant="strong"
                            >
                                <BilingualAccentInput
                                    {...bilingual('quote')}
                                    label="Quote"
                                    required
                                    multiline
                                    rows={4}
                                    preview="quote"
                                    previewLabel="As set on the card"
                                    maxLength={limits.quote}
                                    errors={errors}
                                    hint="Quotes over 140 characters are set a size smaller, so every story fills the same card."
                                    placeholder={{
                                        en: 'Now they try it on at the mirror first. Abaya sales *rose by a third* in one season.',
                                        ar: 'أما اليوم فيجرّبن القطعة أمام المرآة أولًا، وقد ارتفعت مبيعات العبايات *بمقدار الثلث* في موسم واحد.',
                                    }}
                                />
                            </Panel>

                            <Panel
                                kicker="03"
                                title="The figure"
                                description="One number from their first season, in the pill under the quote."
                                variant="strong"
                            >
                                <div className="grid gap-6">
                                    <Field
                                        label="Figure"
                                        error={errors.metric_figure}
                                        required
                                        hint="The same on both pages, in Western digits."
                                    >
                                        <TextInput
                                            {...plain('metric_figure')}
                                            maxLength={16}
                                            placeholder="+33%"
                                            className="sm:max-w-[12rem]"
                                            inputClassName="font-display text-[1.15rem] tabular-nums"
                                        />
                                    </Field>
                                    <BilingualField
                                        {...bilingual('metric_label')}
                                        label="Label"
                                        required
                                        maxLength={40}
                                        errors={errors}
                                        placeholder={{
                                            en: 'Abaya sales',
                                            ar: 'مبيعات العبايات',
                                        }}
                                    />
                                    <BilingualField
                                        {...bilingual('metric_note')}
                                        label="Note"
                                        optional
                                        maxLength={40}
                                        errors={errors}
                                        hint="Under the label. Leave both empty for no note."
                                        placeholder={{
                                            en: 'in one season',
                                            ar: 'في موسم واحد',
                                        }}
                                    />
                                    <BilingualField
                                        {...bilingual('metric_short')}
                                        label="Short label"
                                        optional
                                        maxLength={24}
                                        errors={errors}
                                        hint="Beside the avatar in the story list. Empty: the label is used."
                                        placeholder={{
                                            en:
                                                values.metric_label.en.trim() ||
                                                'sales',
                                            ar:
                                                values.metric_label.ar.trim() ||
                                                'المبيعات',
                                        }}
                                    />
                                </div>
                            </Panel>

                            <Panel
                                kicker="04"
                                title="Portrait"
                                description="A portrait-format photo. Click it to set the point every crop keeps in frame."
                                variant="strong"
                            >
                                <div className="grid gap-6">
                                    <Field
                                        label="Photo"
                                        error={errors.portrait}
                                        required={creating}
                                        hint="Portrait format works best. Saved as WebP, without the photo's location data."
                                    >
                                        <ImageInput
                                            name="portrait"
                                            value={story.portrait}
                                            alt={
                                                story.name
                                                    ? `Portrait of ${story.name}`
                                                    : ''
                                            }
                                            focus={values.focus}
                                            focusNames={[
                                                'portrait_focus_x',
                                                'portrait_focus_y',
                                            ]}
                                            onFocusChange={(focus) =>
                                                set('focus', focus)
                                            }
                                            onFileChange={onFileChange}
                                            subject="the owner's portrait"
                                        />
                                    </Field>
                                    {errors.portrait_focus_x ||
                                    errors.portrait_focus_y ? (
                                        <FieldError>
                                            {errors.portrait_focus_x ??
                                                errors.portrait_focus_y}
                                        </FieldError>
                                    ) : null}
                                    <Field
                                        label="Zoom"
                                        aside={
                                            <span
                                                aria-hidden
                                                className="font-display text-[1.25rem] leading-none text-bone"
                                            >
                                                {values.zoom.toFixed(2)}
                                                <span className="text-mint">
                                                    ×
                                                </span>
                                            </span>
                                        }
                                        error={errors.portrait_zoom}
                                        hint="How far the card crops in towards the focal point. The list's avatar zooms twice as far."
                                    >
                                        <ZoomSlider
                                            name="portrait_zoom"
                                            value={values.zoom}
                                            onValueChange={(zoom) =>
                                                set('zoom', zoom)
                                            }
                                            min={limits.zoomMin}
                                            max={limits.zoomMax}
                                        />
                                    </Field>
                                </div>
                            </Panel>

                            <Panel
                                kicker="05"
                                title="On the landing page"
                                variant="strong"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
                                    <Toggle
                                        name="is_published"
                                        defaultChecked={story.is_published}
                                        onCheckedChange={(published) =>
                                            set('published', published)
                                        }
                                        label="Show this story"
                                        description="Hidden stories stay here, out of the Stories section."
                                    />
                                    <p className="text-[13px] leading-relaxed text-smoke">
                                        {positionNote}
                                    </p>
                                </div>
                                {errors.is_published ? (
                                    <FieldError className="mt-3">
                                        {errors.is_published}
                                    </FieldError>
                                ) : null}
                            </Panel>

                            {children}

                            <SaveBar
                                dirty={dirty}
                                isNew={creating}
                                processing={processing}
                                hasErrors={hasErrors}
                                savedAt={story.updated_at}
                                onDiscard={onDiscard}
                                createLabel="Add story"
                            >
                                <Button
                                    variant="glass"
                                    onClick={() => setPreviewOpen(true)}
                                    className="xl:hidden"
                                >
                                    <Eye aria-hidden /> Preview
                                </Button>
                            </SaveBar>
                        </div>

                        <aside className="max-xl:hidden xl:sticky xl:top-6 xl:max-h-[calc(100svh-3rem)] xl:[scrollbar-width:thin] xl:overflow-y-auto xl:overscroll-contain xl:rounded-[24px]">
                            <Panel
                                kicker="Live preview"
                                title="In the Stories section"
                                actions={
                                    <>
                                        {values.published ? null : (
                                            <span className="text-[10px] font-medium tracking-[0.2em] text-smoke uppercase">
                                                Hidden
                                            </span>
                                        )}
                                        <PreviewLocaleToggle
                                            value={locale}
                                            onValueChange={setLocale}
                                            label="Card language"
                                        />
                                    </>
                                }
                            >
                                <StoryPreview
                                    values={preview}
                                    locale={locale}
                                />
                                {previewNote}
                            </Panel>
                        </aside>
                    </>
                )}
            </Form>

            <Modal
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                title={
                    <>
                        Live <em>preview.</em>
                    </>
                }
                description={
                    values.published
                        ? 'The story as the landing page shows it.'
                        : 'The story as the landing page would show it (it is hidden now).'
                }
            >
                <div className="mb-5 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase">
                        Card language
                    </p>
                    <PreviewLocaleToggle
                        value={locale}
                        onValueChange={setLocale}
                        label="Card language"
                    />
                </div>
                <StoryPreview values={preview} locale={locale} />
                <div className="pb-2">{previewNote}</div>
            </Modal>
        </>
    );
}
