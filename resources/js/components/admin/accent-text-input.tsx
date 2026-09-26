import { Highlighter, Italic } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { arabicControl, arabicDisplay } from './bilingual';
import type { ContentLocale } from './bilingual';
import { useFieldControl } from './field';
import { TextInput } from './text-input';
import { Textarea } from './textarea';

export type AccentPart = { text: string; accent: boolean };

/**
 * Splits `*accent*` markup: "Every screen is a *fitting room.*" →
 * [{ text: 'Every screen is a ', accent: false }, { text: 'fitting room.', accent: true }].
 * An unpaired asterisk is kept as plain text.
 */
export function parseAccent(text: string): AccentPart[] {
    const parts: AccentPart[] = [];
    const pattern = /\*([^*]+)\*/g;
    let last = 0;

    for (const match of text.matchAll(pattern)) {
        if (match.index > last) {
            parts.push({ text: text.slice(last, match.index), accent: false });
        }

        parts.push({ text: match[1], accent: true });
        last = match.index + match[0].length;
    }

    if (last < text.length) {
        parts.push({ text: text.slice(last), accent: false });
    }

    return parts;
}

/** An asterisk left over after pairing (the markup won't render as meant). */
export function hasUnpairedAsterisk(text: string): boolean {
    return text.replace(/\*([^*]+)\*/g, '').includes('*');
}

/**
 * Renders `*accent*` markup. `accent`: Bodoni-style italic mint (titles,
 * quotes); `emphasis`: medium-weight bone (pricing feature lists). Arabic
 * has no italics: its accent is mint set a weight heavier.
 */
export function AccentText({
    text,
    tone = 'accent',
    locale = 'en',
    className,
}: {
    text: string;
    tone?: 'accent' | 'emphasis';
    locale?: ContentLocale;
    className?: string;
}) {
    return (
        <span className={className}>
            {parseAccent(text).map((part, index) =>
                part.accent ? (
                    tone === 'accent' ? (
                        <em
                            key={index}
                            className={
                                locale === 'ar'
                                    ? 'font-semibold text-mint not-italic'
                                    : 'font-normal text-mint italic'
                            }
                        >
                            {part.text}
                        </em>
                    ) : (
                        <strong key={index} className="font-medium text-bone">
                            {part.text}
                        </strong>
                    )
                ) : (
                    <span key={index}>{part.text}</span>
                ),
            )}
        </span>
    );
}

const PREVIEW = {
    /** Section titles: Bodoni at display size. */
    title: 'font-display text-[1.75rem] leading-[1.1] font-medium tracking-[-0.015em] text-bone',
    /** Testimonial quotes: Bodoni, a size down. */
    quote: 'font-display text-[1.3rem] leading-[1.35] text-bone',
    /** Feature lines: Instrument Sans in mist, emphasis in bone. */
    body: 'text-[15px] leading-relaxed text-mist',
} as const;

/** The same looks in Arabic: the Arabic faces, taller lines, no tracking. */
const PREVIEW_AR: Record<keyof typeof PREVIEW, string> = {
    title: cn(
        arabicDisplay,
        'text-[1.75rem] leading-[1.3] font-medium text-bone',
    ),
    quote: cn(arabicDisplay, 'text-[1.3rem] leading-[1.6] text-bone'),
    body: cn(arabicControl, 'leading-[1.8] text-mist'),
};

type AccentTextInputProps = {
    name?: string;
    id?: string;
    defaultValue?: string;
    /** Controlled value (pair with onValueChange). */
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    maxLength?: number;
    /** Explicit invalid state (inside a <Field>, its `error` decides). */
    invalid?: boolean;
    /** A textarea instead of a single line (quotes, ledes). */
    multiline?: boolean;
    rows?: number;
    /** How the preview is typeset; pick the look of the landing element. */
    preview?: keyof typeof PREVIEW;
    /** `emphasis` renders marked words bold instead of italic mint. */
    tone?: 'accent' | 'emphasis';
    /** Replaces the default preview caption. */
    previewLabel?: ReactNode;
    /** Previewed (in mist) while the field is empty, e.g. a setting's default. */
    fallback?: string;
    /** The copy's language: `ar` writes right to left in the Arabic face. */
    locale?: ContentLocale;
    /** Names the control from other elements (e.g. a label and an "AR" marker). */
    'aria-labelledby'?: string;
    className?: string;
};

/**
 * A text field for copy with one highlighted phrase written as
 * `*accent*`, with a live preview typeset like the landing page, and a
 * button that wraps the selected words in asterisks.
 */
export function AccentTextInput({
    defaultValue = '',
    value,
    onValueChange,
    multiline = false,
    rows = 3,
    preview = 'title',
    tone = 'accent',
    previewLabel,
    fallback,
    locale = 'en',
    id,
    className,
    ...props
}: AccentTextInputProps) {
    const [inner, setInner] = useState(defaultValue);
    const text = value ?? inner;
    const control = useFieldControl({ id });
    const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
    const helpId = `${control.id}-markup`;
    const unpaired = hasUnpairedAsterisk(text);
    const arabic = locale === 'ar';
    const shown = text.trim() ? text : (fallback ?? '');
    const showingFallback = !text.trim() && shown.trim() !== '';

    const set = (next: string) => {
        setInner(next);
        onValueChange?.(next);
    };

    const onChange = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => set(event.target.value);

    // Wrap the selection (or the word at the caret) in asterisks.
    const accentSelection = () => {
        const node = input.current;

        if (!node) {
            return;
        }

        let start = node.selectionStart ?? text.length;
        let end = node.selectionEnd ?? start;

        if (start === end) {
            while (start > 0 && /\S/.test(text[start - 1])) {
                start -= 1;
            }

            while (end < text.length && /\S/.test(text[end])) {
                end += 1;
            }
        }

        const selected = text.slice(start, end);

        if (!selected.trim()) {
            node.focus();

            return;
        }

        const next = `${text.slice(0, start)}*${selected}*${text.slice(end)}`;
        set(next);

        requestAnimationFrame(() => {
            node.focus();
            node.setSelectionRange(start + 1, end + 1);
        });
    };

    const shared = {
        ...props,
        id: control.id,
        value: text,
        onChange,
        lang: arabic ? 'ar' : undefined,
        dir: arabic ? 'rtl' : undefined,
        'aria-describedby': helpId,
    };

    return (
        <div className={cn('grid min-w-0 gap-2', className)}>
            <div className="relative">
                {multiline ? (
                    <Textarea
                        ref={input}
                        {...shared}
                        rows={rows}
                        showCount={props.maxLength !== undefined}
                        className={cn(
                            'pe-12',
                            arabic && [arabicControl, 'leading-[1.8]'],
                        )}
                    />
                ) : (
                    <TextInput
                        ref={input}
                        {...shared}
                        inputClassName={cn('pe-12', arabic && arabicControl)}
                    />
                )}
                <button
                    type="button"
                    onClick={accentSelection}
                    title={
                        tone === 'accent'
                            ? 'Accent the selected words'
                            : 'Emphasise the selected words'
                    }
                    aria-label={
                        tone === 'accent'
                            ? 'Accent the selected words'
                            : 'Emphasise the selected words'
                    }
                    className={cn(
                        'absolute top-1.5 grid size-8 cursor-pointer place-items-center rounded-[10px] text-smoke transition-colors duration-300 ease-glass hover:bg-white/[0.08] hover:text-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none',
                        arabic ? 'left-1.5' : 'right-1.5',
                    )}
                >
                    {arabic ? (
                        // Arabic has no italics: its accent is a mint highlight.
                        <Highlighter aria-hidden className="size-4" />
                    ) : (
                        <Italic aria-hidden className="size-4" />
                    )}
                </button>
            </div>

            <div className="rounded-[14px] border border-dashed border-white/[0.12] px-4 py-3">
                <p
                    aria-hidden
                    className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase"
                >
                    {previewLabel ?? 'Preview'}
                    {showingFallback ? ' · the default' : null}
                </p>
                {shown.trim() ? (
                    <p
                        aria-hidden
                        lang={arabic ? 'ar' : undefined}
                        dir={arabic ? 'rtl' : undefined}
                        className={cn(
                            'mt-2 text-pretty',
                            (arabic ? PREVIEW_AR : PREVIEW)[preview],
                            showingFallback && 'text-mist',
                        )}
                    >
                        <AccentText text={shown} tone={tone} locale={locale} />
                    </p>
                ) : (
                    <p
                        aria-hidden
                        className="mt-2 text-[13px] text-smoke italic"
                    >
                        Nothing to preview yet.
                    </p>
                )}
                <p
                    id={helpId}
                    className={cn(
                        'mt-2 text-[12px] leading-relaxed',
                        unpaired ? 'text-coral' : 'text-smoke',
                    )}
                >
                    {unpaired
                        ? 'One asterisk has no partner: wrap the phrase as *like this*.'
                        : tone === 'accent'
                          ? 'Wrap the highlighted phrase in *asterisks*.'
                          : 'Wrap words to emphasise in *asterisks*.'}
                </p>
            </div>
        </div>
    );
}
