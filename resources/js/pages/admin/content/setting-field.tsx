import { PenLine, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { AccentTextInput } from '@/components/admin/accent-text-input';
import { LOCALE_META } from '@/components/admin/bilingual';
import type {
    BilingualValue,
    ContentLocale,
    ErrorBag,
    PerLocale,
} from '@/components/admin/bilingual';
import {
    BilingualAccentInput,
    BilingualField,
    BilingualTextarea,
} from '@/components/admin/bilingual-field';
import { Field } from '@/components/admin/field';
import { NumberInput } from '@/components/admin/number-input';
import { TextInput } from '@/components/admin/text-input';
import { Textarea } from '@/components/admin/textarea';
import type { SettingField } from './types';

/** Types that are copy (worth starting from the default text). */
const COPY_TYPES = new Set(['text', 'textarea', 'accent']);

/** Longest value per type (Settings::rules on the server). */
const MAX_LENGTH: Record<string, number> = {
    textarea: 2000,
    phone: 40,
};

/** The input id of a setting ("contact.email" → "setting-contact-email"). */
export function settingId(key: string): string {
    return `setting-${key.replace(/[^a-z0-9]+/gi, '-')}`;
}

/** The name of a translatable setting's Arabic input: "hero.title_ar". */
export function arabicKey(key: string): string {
    return `${key}_ar`;
}

/**
 * Whether a field gets the whole row: copy in two languages (English and
 * Arabic side by side) and long single fields; the rest take half of it.
 */
export function isWide(field: SettingField): boolean {
    const fallback = field.default === null ? '' : String(field.default);

    return (
        field.translatable ||
        field.type === 'textarea' ||
        field.type === 'accent' ||
        (field.type === 'text' && fallback.length > 34)
    );
}

function shorten(text: string, length = 90): string {
    return text.length > length
        ? `${text.slice(0, length - 1).trimEnd()}…`
        : text;
}

const text = (value: string | number | null): string =>
    value === null ? '' : String(value);

/**
 * The field's help without the sentence about asterisks on accent copy
 * (the accent input explains the markup under its own preview).
 */
function helpFor(field: SettingField): string {
    if (!field.help) {
        return '';
    }

    if (field.type !== 'accent') {
        return field.help;
    }

    return field.help
        .split(/(?<=\.)\s+/)
        .filter((sentence) => !sentence.includes('asterisks'))
        .join(' ');
}

const asideButton =
    'inline-flex cursor-pointer items-center gap-1 rounded-[6px] text-[12px] leading-none text-smoke transition-colors duration-300 ease-glass hover:text-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none [&_svg]:size-3';

/**
 * "Reset to default" while a value is typed; "Edit the default" (copy
 * only) while it is empty, to start from the default's words.
 */
function DefaultAction({
    value,
    fallback,
    copy,
    name,
    onChange,
    focus,
}: {
    value: string;
    fallback: string;
    copy: boolean;
    /** Names the field in the buttons' accessible names. */
    name: string;
    onChange: (value: string) => void;
    focus: () => void;
}): ReactNode {
    if (value.trim() !== '') {
        return (
            <button
                type="button"
                className={asideButton}
                onClick={() => {
                    onChange('');
                    focus();
                }}
                aria-label={`Reset ${name} to ${fallback ? 'the default' : 'empty'}`}
            >
                <RotateCcw aria-hidden />
                {fallback ? 'Reset to default' : 'Clear'}
            </button>
        );
    }

    if (fallback && copy) {
        return (
            <button
                type="button"
                className={asideButton}
                onClick={() => {
                    onChange(fallback);
                    focus();
                }}
                aria-label={`Start ${name} from the default text`}
            >
                <PenLine aria-hidden />
                Edit the default
            </button>
        );
    }

    return fallback ? 'Default' : null;
}

/** "Default: “…”." under a value that replaces its default. */
function DefaultNote({
    fallback,
    locale,
}: {
    fallback: string;
    locale: ContentLocale;
}) {
    return (
        <>
            Default:{' '}
            <span className="text-mist">
                “
                <bdi
                    lang={locale}
                    dir={LOCALE_META[locale].dir}
                    className={locale === 'ar' ? 'text-[13.5px]' : undefined}
                >
                    {shorten(fallback)}
                </bdi>
                ”
            </span>
            .
        </>
    );
}

const focusById = (id: string) =>
    requestAnimationFrame(() => document.getElementById(id)?.focus());

/**
 * A setting that is the same on both pages (an address, a link, a
 * figure): the control for its type, the default as the placeholder, and
 * a "Reset to default" (or "Start from the default") action beside the
 * label.
 */
export function SettingInput({
    field,
    label,
    value,
    onChange,
    error,
    className,
}: {
    field: SettingField;
    /** Overrides the schema label (e.g. without its section prefix). */
    label?: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    className?: string;
}) {
    const id = settingId(field.key);
    const fallback = text(field.default);
    const custom = value.trim() !== '';
    const placeholder = fallback || 'Not set';
    const help = helpFor(field);

    const hint = (
        <>
            {help ? <>{help} </> : null}
            {fallback ? (
                custom ? (
                    <DefaultNote fallback={fallback} locale="en" />
                ) : (
                    'Leave empty to use the default.'
                )
            ) : null}
        </>
    );

    const control = (() => {
        switch (field.type) {
            case 'accent':
                return (
                    <AccentTextInput
                        name={field.key}
                        value={value}
                        onValueChange={onChange}
                        placeholder={placeholder}
                        fallback={fallback}
                        maxLength={255}
                    />
                );
            case 'textarea':
                return (
                    <Textarea
                        name={field.key}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        maxLength={2000}
                    />
                );
            case 'number':
                return (
                    <NumberInput
                        name={field.key}
                        value={value === '' ? null : Number(value)}
                        onValueChange={(next) =>
                            onChange(next === null ? '' : String(next))
                        }
                        min={0}
                        placeholder={placeholder}
                    />
                );
            default:
                return (
                    <TextInput
                        name={field.key}
                        type={
                            field.type === 'email'
                                ? 'email'
                                : field.type === 'url'
                                  ? 'url'
                                  : field.type === 'phone'
                                    ? 'tel'
                                    : 'text'
                        }
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        placeholder={placeholder}
                        maxLength={MAX_LENGTH[field.type] ?? 255}
                        autoComplete="off"
                        spellCheck={COPY_TYPES.has(field.type)}
                    />
                );
        }
    })();

    return (
        <Field
            id={id}
            label={label ?? field.label}
            hint={hint}
            error={error}
            aside={
                <DefaultAction
                    value={value}
                    fallback={fallback}
                    copy={COPY_TYPES.has(field.type)}
                    name={label ?? field.label}
                    onChange={onChange}
                    focus={() => focusById(id)}
                />
            }
            className={className}
        >
            {control}
        </Field>
    );
}

/**
 * Copy in English and Arabic (the Arabic input is "<key>_ar"): side by
 * side on wide screens, each language with its own default as the
 * placeholder, its own preview (accent copy) and its own "Reset to
 * default", so one language can go back to its default while the other
 * keeps its words.
 */
export function BilingualSettingInput({
    field,
    label,
    value,
    onChange,
    errors,
    className,
}: {
    field: SettingField;
    /** Overrides the schema label (e.g. without its section prefix). */
    label?: string;
    value: BilingualValue;
    onChange: (value: BilingualValue) => void;
    errors: ErrorBag;
    className?: string;
}) {
    const id = settingId(field.key);
    const name = label ?? field.label;
    const defaults: BilingualValue = {
        en: text(field.default),
        ar: text(field.default_ar),
    };
    const help = helpFor(field);
    const hasDefault = defaults.en !== '' || defaults.ar !== '';

    const setLocale = (locale: ContentLocale) => (next: string) =>
        onChange({ ...value, [locale]: next });

    const byLocale = <T,>(
        make: (locale: ContentLocale) => T,
    ): PerLocale<T> => ({ en: make('en'), ar: make('ar') });

    const shared = {
        id,
        label: name,
        name: field.key,
        nameAr: arabicKey(field.key),
        value,
        onValueChange: onChange,
        errors,
        placeholder: byLocale(
            (locale) => defaults[locale] || (locale === 'en' ? 'Not set' : ''),
        ),
        hint:
            [
                help,
                hasDefault ? 'Leave a language empty to use its default.' : '',
            ]
                .filter(Boolean)
                .join(' ') || undefined,
        localeHint: byLocale((locale) =>
            defaults[locale] && value[locale].trim() !== '' ? (
                <DefaultNote fallback={defaults[locale]} locale={locale} />
            ) : null,
        ),
        localeAside: byLocale((locale) => (
            <DefaultAction
                value={value[locale]}
                fallback={defaults[locale]}
                copy
                name={`the ${LOCALE_META[locale].name} ${name.toLowerCase()}`}
                onChange={setLocale(locale)}
                focus={() => focusById(`${id}-${locale}`)}
            />
        )),
        className,
    };

    switch (field.type) {
        case 'accent':
            return (
                <BilingualAccentInput
                    {...shared}
                    maxLength={255}
                    fallback={defaults}
                />
            );
        case 'textarea':
            return (
                <BilingualTextarea
                    {...shared}
                    maxLength={2000}
                    showCount={false}
                    rows={3}
                />
            );
        default:
            return (
                <BilingualField
                    {...shared}
                    maxLength={255}
                    inputProps={{ autoComplete: 'off' }}
                />
            );
    }
}
