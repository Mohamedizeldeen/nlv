import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AccentTextInput } from './accent-text-input';
import {
    arabicControl,
    arabicName,
    CONTENT_LOCALES,
    isBlank,
    LOCALE_META,
    perLocale,
} from './bilingual';
import type {
    BilingualValue,
    ContentLocale,
    ErrorBag,
    PerLocale,
} from './bilingual';
import { FieldControlScope, FieldError } from './field';
import { TextInput } from './text-input';
import type { TextInputProps } from './text-input';
import { Textarea } from './textarea';

/** What a bilingual field hands the control of one language. */
export type BilingualControl = {
    locale: ContentLocale;
    /** The submitted name: `title` or `title_ar`. */
    name: string;
    value: string;
    setValue: (value: string) => void;
    /** Pass as `aria-labelledby`: the field's label plus the EN / AR marker. */
    labelledBy: string;
    placeholder?: string;
    disabled?: boolean;
};

export type BilingualBaseProps = {
    label: ReactNode;
    /** The English column, e.g. `title`. */
    name: string;
    /** The Arabic column (default `${name}_ar`). */
    nameAr?: string;
    /** Controlled value (pair with onValueChange). */
    value?: BilingualValue;
    defaultValue?: Partial<BilingualValue>;
    /** Called with both languages and the one that changed. */
    onValueChange?: (value: BilingualValue, changed: ContentLocale) => void;
    /** Inertia's error bag: reads `errors[name]` and `errors[nameAr]`. */
    errors?: ErrorBag;
    /** Explicit messages per language (win over `errors`). */
    error?: PerLocale<string>;
    /** Required in English, and (unless `requiredAr` says otherwise) in Arabic. */
    required?: boolean;
    requiredAr?: boolean;
    /** Prints "Optional" beside the label. */
    optional?: boolean;
    /** Help under both languages. */
    hint?: ReactNode;
    /** Help under one language, e.g. a setting's default. */
    localeHint?: PerLocale<ReactNode>;
    /** At the label's right edge. */
    aside?: ReactNode;
    /** At the right edge of a language's marker row, e.g. "Reset to default". */
    localeAside?: PerLocale<ReactNode>;
    /** One placeholder, or one per language. */
    placeholder?: string | PerLocale<string>;
    disabled?: boolean;
    /** Base for the control ids (`${id}-en`, `${id}-ar`). */
    id?: string;
    className?: string;
};

/** Holds a bilingual value, controlled or not. */
export function useBilingualState({
    value,
    defaultValue,
    onValueChange,
}: Pick<BilingualBaseProps, 'value' | 'defaultValue' | 'onValueChange'>) {
    const [inner, setInner] = useState<BilingualValue>(() => ({
        en: defaultValue?.en ?? '',
        ar: defaultValue?.ar ?? '',
    }));
    const current = value ?? inner;

    const set = (locale: ContentLocale, text: string) => {
        const next = { ...current, [locale]: text };
        setInner(next);
        onValueChange?.(next, locale);
    };

    return [current, set] as const;
}

const markerClass =
    'text-[10px] leading-none font-medium tracking-[0.24em] text-smoke uppercase';

/**
 * The frame every bilingual control shares: one label, then English and
 * Arabic side by side (English left) on wide screens and stacked on
 * phones, each under a small EN / AR marker with its own error. Use it
 * directly for a custom control: `children(control)` renders the control
 * of one language; spread `control.labelledBy` as `aria-labelledby`.
 */
export function BilingualFrame({
    label,
    name,
    nameAr = arabicName(name),
    value,
    errors,
    error,
    required = false,
    requiredAr = required,
    optional = false,
    hint,
    localeHint,
    aside,
    localeAside,
    placeholder,
    disabled,
    setValue,
    count,
    id,
    className,
    children,
}: Omit<BilingualBaseProps, 'defaultValue' | 'onValueChange' | 'value'> & {
    value: BilingualValue;
    setValue: (locale: ContentLocale, value: string) => void;
    /** Shows "12 / 80" in each marker row. */
    count?: number;
    children: (control: BilingualControl) => ReactNode;
}) {
    const generated = useId();
    const base = id ?? `bilingual-${generated}`;
    const labelId = `${base}-label`;
    const hintId = hint ? `${base}-hint` : undefined;
    const names = { en: name, ar: nameAr };
    const missing = !isBlank(value.en) && isBlank(value.ar);

    return (
        <div
            className={cn(
                'group/bilingual @container grid min-w-0 content-start gap-2.5',
                className,
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <label
                    id={labelId}
                    htmlFor={`${base}-en`}
                    className="text-[13px] leading-snug font-medium text-bone"
                >
                    {label}
                    {optional ? (
                        <span className="ml-2 text-[12px] font-normal text-smoke">
                            Optional
                        </span>
                    ) : null}
                </label>
                {aside ? (
                    <span className="text-[12px] text-smoke tabular-nums">
                        {aside}
                    </span>
                ) : null}
            </div>

            <div className="grid gap-3.5 lg:@min-[34rem]:grid-cols-2 lg:@min-[34rem]:gap-x-4">
                {CONTENT_LOCALES.map((locale) => {
                    const controlId = `${base}-${locale}`;
                    const markerId = `${controlId}-marker`;
                    const message =
                        perLocale(error, locale) ?? errors?.[names[locale]];
                    const errorId = message ? `${controlId}-error` : undefined;
                    const note = localeHint?.[locale];
                    const noteId = note ? `${controlId}-note` : undefined;
                    const text = value[locale];
                    const over =
                        count !== undefined && text.length >= count
                            ? 'text-coral'
                            : 'text-smoke';

                    return (
                        <div
                            key={locale}
                            className="grid min-w-0 content-start gap-2"
                            data-bilingual-ar={
                                locale === 'ar' ? name : undefined
                            }
                        >
                            <div className="flex min-h-4 items-center justify-between gap-3">
                                <span className="flex items-center gap-2.5">
                                    <span id={markerId} className={markerClass}>
                                        <span aria-hidden>
                                            {LOCALE_META[locale].marker}
                                        </span>
                                        <span className="sr-only">
                                            ({LOCALE_META[locale].name})
                                        </span>
                                    </span>
                                    {locale === 'ar' && missing ? (
                                        <span className="text-[11.5px] leading-none text-[oklch(0.8_0.09_195)]">
                                            Not translated yet
                                        </span>
                                    ) : null}
                                </span>
                                <span className="flex items-center gap-3 text-[12px] leading-none text-smoke">
                                    {localeAside?.[locale]}
                                    {count !== undefined ? (
                                        <span
                                            aria-hidden
                                            className={cn('tabular-nums', over)}
                                        >
                                            {text.length} / {count}
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                            <FieldControlScope
                                id={controlId}
                                describedBy={
                                    [errorId, noteId, hintId]
                                        .filter(Boolean)
                                        .join(' ') || undefined
                                }
                                invalid={Boolean(message)}
                                required={
                                    locale === 'en' ? required : requiredAr
                                }
                            >
                                {children({
                                    locale,
                                    name: names[locale],
                                    value: text,
                                    setValue: (next) => setValue(locale, next),
                                    labelledBy: `${labelId} ${markerId}`,
                                    placeholder: perLocale(placeholder, locale),
                                    disabled,
                                })}
                            </FieldControlScope>
                            {message ? (
                                <FieldError id={errorId}>{message}</FieldError>
                            ) : null}
                            {note ? (
                                <p
                                    id={noteId}
                                    className="text-[12.5px] leading-relaxed text-pretty text-smoke"
                                >
                                    {note}
                                </p>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            {hint ? (
                <p
                    id={hintId}
                    className="text-[12.5px] leading-relaxed text-pretty text-smoke"
                >
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

type InputProps = Omit<
    TextInputProps,
    | 'name'
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'placeholder'
    | 'required'
    | 'disabled'
    | 'maxLength'
    | 'id'
    | 'dir'
    | 'lang'
>;

/**
 * A one-line text field in English and Arabic: `title` and `title_ar`.
 * The Arabic input writes right to left in the Arabic face.
 *
 * <BilingualField label="City" name="city" required maxLength={60}
 *     defaultValue={bilingualValue(story, 'city')} errors={errors} />
 */
export function BilingualField({
    maxLength,
    showCount = false,
    inputProps,
    inputClassName,
    value,
    defaultValue,
    onValueChange,
    ...frame
}: BilingualBaseProps & {
    maxLength?: number;
    /** "12 / 80" beside each marker (needs maxLength). */
    showCount?: boolean;
    /** Passed to both inputs: type, autoComplete, spellCheck, leading, … */
    inputProps?: InputProps;
    /** Classes for both <input>s (e.g. a display face for figures). */
    inputClassName?: string;
}) {
    const [current, set] = useBilingualState({
        value,
        defaultValue,
        onValueChange,
    });

    return (
        <BilingualFrame
            {...frame}
            value={current}
            setValue={set}
            count={showCount ? maxLength : undefined}
        >
            {(control) => (
                <TextInput
                    {...inputProps}
                    name={control.name}
                    value={control.value}
                    onChange={(event) => control.setValue(event.target.value)}
                    placeholder={control.placeholder}
                    disabled={control.disabled}
                    maxLength={maxLength}
                    aria-labelledby={control.labelledBy}
                    lang={control.locale === 'ar' ? 'ar' : undefined}
                    dir={control.locale === 'ar' ? 'rtl' : undefined}
                    inputClassName={cn(
                        control.locale === 'ar' && arabicControl,
                        inputClassName,
                    )}
                />
            )}
        </BilingualFrame>
    );
}

/**
 * A multi-line field in English and Arabic (answers, blurbs, notes).
 * Both grow with their text; each counts against `maxLength`.
 */
export function BilingualTextarea({
    maxLength,
    showCount = true,
    rows = 4,
    mono = false,
    textareaClassName,
    value,
    defaultValue,
    onValueChange,
    ...frame
}: BilingualBaseProps & {
    maxLength?: number;
    /** A counter under each field (default on when maxLength is set). */
    showCount?: boolean;
    rows?: number;
    mono?: boolean;
    textareaClassName?: string;
}) {
    const [current, set] = useBilingualState({
        value,
        defaultValue,
        onValueChange,
    });

    return (
        <BilingualFrame {...frame} value={current} setValue={set}>
            {(control) => (
                <Textarea
                    name={control.name}
                    value={control.value}
                    onChange={(event) => control.setValue(event.target.value)}
                    placeholder={control.placeholder}
                    disabled={control.disabled}
                    maxLength={maxLength}
                    showCount={showCount}
                    rows={rows}
                    mono={mono}
                    aria-labelledby={control.labelledBy}
                    lang={control.locale === 'ar' ? 'ar' : undefined}
                    dir={control.locale === 'ar' ? 'rtl' : undefined}
                    className={cn(
                        control.locale === 'ar' &&
                            !mono && [arabicControl, 'leading-[1.8]'],
                        textareaClassName,
                    )}
                />
            )}
        </BilingualFrame>
    );
}

/**
 * Copy with one `*accent*` phrase, in English and Arabic, each with its
 * live preview: Bodoni italic mint in English; the Arabic display face,
 * right to left and never italic (mint, a weight heavier) in Arabic.
 */
export function BilingualAccentInput({
    maxLength,
    multiline = false,
    rows = 3,
    preview = 'title',
    tone = 'accent',
    previewLabel,
    fallback,
    value,
    defaultValue,
    onValueChange,
    ...frame
}: BilingualBaseProps & {
    maxLength?: number;
    multiline?: boolean;
    rows?: number;
    /** How the previews are set: the landing element's look. */
    preview?: 'title' | 'quote' | 'body';
    /** `emphasis` marks words bold instead of accenting them. */
    tone?: 'accent' | 'emphasis';
    previewLabel?: ReactNode;
    /** Previewed while a language is empty (e.g. a setting's default). */
    fallback?: PerLocale<string>;
}) {
    const [current, set] = useBilingualState({
        value,
        defaultValue,
        onValueChange,
    });

    return (
        <BilingualFrame {...frame} value={current} setValue={set}>
            {(control) => (
                <AccentTextInput
                    name={control.name}
                    value={control.value}
                    onValueChange={control.setValue}
                    placeholder={control.placeholder}
                    disabled={control.disabled}
                    maxLength={maxLength}
                    multiline={multiline}
                    rows={rows}
                    preview={preview}
                    tone={tone}
                    previewLabel={previewLabel}
                    fallback={fallback?.[control.locale]}
                    locale={control.locale}
                    aria-labelledby={control.labelledBy}
                />
            )}
        </BilingualFrame>
    );
}
