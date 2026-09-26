import { Bold, Highlighter, Italic, Plus, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { hasUnpairedAsterisk } from './accent-text-input';
import { arabicControl, arabicName, LOCALE_META } from './bilingual';
import type { ContentLocale, ErrorBag, PerLocale } from './bilingual';
import { Button } from './button';
import { FieldError } from './field';
import { SortableList } from './sortable-list';
import { TextInput } from './text-input';

/** One row of a bilingual list: the same item in both languages. */
export type BilingualRow = { id: string; en: string; ar: string };

let nextRow = 0;

/** A new row with a key that survives reordering. */
export function bilingualRow(en = '', ar = ''): BilingualRow {
    nextRow += 1;

    return { id: `row-${nextRow}`, en, ar };
}

/**
 * Pairs two stored lists into rows, by position:
 * `bilingualRows(plan.features, plan.features_ar)`. The shorter list is
 * padded with empty strings.
 */
export function bilingualRows(
    en: readonly (string | null)[] | null | undefined,
    ar: readonly (string | null)[] | null | undefined,
): BilingualRow[] {
    const length = Math.max(en?.length ?? 0, ar?.length ?? 0);

    return Array.from({ length }, (_, index) =>
        bilingualRow(en?.[index] ?? '', ar?.[index] ?? ''),
    );
}

/** Rows back to one list per language (for previews). */
export function splitRows(rows: readonly BilingualRow[]): {
    en: string[];
    ar: string[];
} {
    return {
        en: rows.map((row) => row.en),
        ar: rows.map((row) => row.ar),
    };
}

/** Wraps the selection (or the word at the caret) in asterisks. */
function wrapSelection(node: HTMLInputElement, text: string): string | null {
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

        return null;
    }

    requestAnimationFrame(() => {
        node.focus();
        node.setSelectionRange(start + 1, end + 1);
    });

    return `${text.slice(0, start)}*${selected}*${text.slice(end)}`;
}

type Markup = 'emphasis' | 'accent' | 'none';

function MarkupIcon({
    markup,
    locale,
}: {
    markup: Markup;
    locale: ContentLocale;
}) {
    if (markup === 'emphasis') {
        return <Bold aria-hidden className="size-3.5" />;
    }

    return locale === 'ar' ? (
        <Highlighter aria-hidden className="size-3.5" />
    ) : (
        <Italic aria-hidden className="size-3.5" />
    );
}

function Cell({
    locale,
    field,
    name,
    value,
    onChange,
    label,
    id,
    error,
    placeholder,
    maxLength,
    markup,
    required,
    disabled,
}: {
    locale: ContentLocale;
    /** The list's English name: the completeness check finds rows by it. */
    field: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    label: string;
    id: string;
    error?: string;
    placeholder?: string;
    maxLength?: number;
    markup: Markup;
    required: boolean;
    disabled?: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const unpaired = markup !== 'none' && hasUnpairedAsterisk(value);
    const messageId = `${id}-message`;
    const arabic = locale === 'ar';
    const verb = markup === 'emphasis' ? 'Emphasise' : 'Accent';

    return (
        <div
            className="grid min-w-0 content-start gap-1.5"
            data-bilingual-ar={arabic ? field : undefined}
        >
            <TextInput
                ref={input}
                id={id}
                name={`${name}[]`}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-label={`${label} (${LOCALE_META[locale].name})`}
                aria-describedby={error || unpaired ? messageId : undefined}
                invalid={Boolean(error)}
                required={required}
                disabled={disabled}
                maxLength={maxLength}
                placeholder={placeholder}
                lang={arabic ? 'ar' : undefined}
                dir={arabic ? 'rtl' : undefined}
                inputClassName={cn(arabic && arabicControl)}
                leading={
                    <span
                        aria-hidden
                        className="w-5 text-[10px] leading-none font-medium tracking-[0.2em]"
                    >
                        {LOCALE_META[locale].marker}
                    </span>
                }
                trailing={
                    markup === 'none' ? undefined : (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                                const node = input.current;
                                const next = node
                                    ? wrapSelection(node, value)
                                    : null;

                                if (next !== null) {
                                    onChange(next);
                                }
                            }}
                            aria-label={`${verb} the selected words in ${label.toLowerCase()} (${LOCALE_META[locale].name})`}
                            title={`${verb} the selected words`}
                            className="-me-2 grid size-8 cursor-pointer place-items-center rounded-[10px] text-smoke transition-colors duration-300 ease-glass hover:bg-white/[0.08] hover:text-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none disabled:cursor-not-allowed"
                        >
                            <MarkupIcon markup={markup} locale={locale} />
                        </button>
                    )
                }
            />
            {error || unpaired ? (
                <FieldError id={messageId} className="text-[12.5px]">
                    {error ??
                        'One asterisk has no partner: wrap the words as *like this*.'}
                </FieldError>
            ) : null}
        </div>
    );
}

type BilingualListProps = {
    /** The English list, e.g. `features` (submitted as `features[]`). */
    name: string;
    /** The Arabic list (default `${name}_ar`, submitted as `features_ar[]`). */
    nameAr?: string;
    /** Accessible name of the list, e.g. "Features in card order". */
    label: string;
    /** What one row is called: "Feature" → "Feature 2", "Remove feature 2". */
    itemLabel?: string;
    /** Controlled rows (pair with onRowsChange). */
    rows?: BilingualRow[];
    defaultRows?: BilingualRow[];
    onRowsChange?: (rows: BilingualRow[]) => void;
    /** Inertia's errors: `name`, `name.N`, `nameAr`, `nameAr.N`. */
    errors?: ErrorBag;
    /** Rows that can't be removed below this count (default 1). */
    min?: number;
    max?: number;
    maxLength?: number;
    /** `emphasis` (bold, pricing features) or `accent` adds the wrap button and the asterisk check. */
    markup?: Markup;
    /** Every row needs its text, in English and (unless `requiredAr`) Arabic. */
    required?: boolean;
    requiredAr?: boolean;
    placeholder?: PerLocale<string>;
    /** The add button's text (default "Add a row"). */
    addLabel?: string;
    /** Beside the add button, after the "3 of 8" count. */
    note?: ReactNode;
    /** Drag handles and ↑ / ↓ reordering (default on). */
    sortable?: boolean;
    disabled?: boolean;
    className?: string;
};

/**
 * A list edited in both languages at once, row by row, so the English
 * and Arabic items stay paired when rows move: plan features, for one.
 * Each row submits `name[]` and `nameAr[]` in the same position. English
 * sits left of Arabic on wide screens, above it on phones.
 */
export function BilingualList({
    name,
    nameAr = arabicName(name),
    label,
    itemLabel = 'Row',
    rows,
    defaultRows,
    onRowsChange,
    errors = {},
    min = 1,
    max,
    maxLength,
    markup = 'none',
    required = false,
    requiredAr = required,
    placeholder,
    addLabel = 'Add a row',
    note,
    sortable = true,
    disabled = false,
    className,
}: BilingualListProps) {
    const [inner, setInner] = useState<BilingualRow[]>(
        () => defaultRows ?? [bilingualRow()],
    );
    const current = rows ?? inner;
    const base = useId();

    const change = (next: BilingualRow[]) => {
        setInner(next);
        onRowsChange?.(next);
    };

    const update = (id: string, locale: ContentLocale, text: string) =>
        change(
            current.map((row) =>
                row.id === id ? { ...row, [locale]: text } : row,
            ),
        );

    const full = max !== undefined && current.length >= max;
    const listError = errors[name] ?? errors[nameAr];

    const renderRow = (row: BilingualRow, index: number, handle: ReactNode) => {
        const rowLabel = `${itemLabel} ${index + 1}`;

        return (
            <div className="flex items-start gap-1.5 py-1.5 sm:gap-2">
                {sortable ? (
                    <span className="flex h-11 shrink-0 items-center">
                        {handle}
                    </span>
                ) : null}
                <span
                    aria-hidden
                    className="flex h-11 w-5 shrink-0 items-center text-[11px] text-smoke tabular-nums max-sm:hidden"
                >
                    {String(index + 1).padStart(2, '0')}
                </span>
                <div className="grid min-w-0 flex-1 gap-2 lg:@min-[44rem]:grid-cols-2">
                    {(['en', 'ar'] as const).map((locale) => (
                        <Cell
                            key={locale}
                            locale={locale}
                            field={name}
                            name={locale === 'en' ? name : nameAr}
                            value={row[locale]}
                            onChange={(text) => update(row.id, locale, text)}
                            label={rowLabel}
                            id={`${base}-${index}-${locale}`}
                            error={
                                errors[
                                    `${locale === 'en' ? name : nameAr}.${index}`
                                ]
                            }
                            placeholder={placeholder?.[locale]}
                            maxLength={maxLength}
                            markup={markup}
                            required={locale === 'en' ? required : requiredAr}
                            disabled={disabled}
                        />
                    ))}
                </div>
                <span className="flex h-11 shrink-0 items-center">
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                            change(current.filter((item) => item.id !== row.id))
                        }
                        disabled={disabled || current.length <= min}
                        aria-label={`Remove ${rowLabel.toLowerCase()}`}
                        className="size-9 px-0"
                    >
                        <X aria-hidden />
                    </Button>
                </span>
            </div>
        );
    };

    return (
        <div className={cn('@container grid min-w-0 gap-2', className)}>
            {sortable ? (
                <SortableList
                    label={label}
                    items={current}
                    getKey={(row) => row.id}
                    getLabel={(row) =>
                        row.en.trim() ||
                        row.ar.trim() ||
                        `Empty ${itemLabel.toLowerCase()}`
                    }
                    onReorder={change}
                    disabled={disabled}
                    itemClassName="rounded-[14px]"
                    renderItem={(row, { index, handle }) =>
                        renderRow(row, index, handle)
                    }
                />
            ) : (
                <ol aria-label={label} className="grid gap-2">
                    {current.map((row, index) => (
                        <li key={row.id} className="min-w-0">
                            {renderRow(row, index, null)}
                        </li>
                    ))}
                </ol>
            )}
            {listError ? <FieldError>{listError}</FieldError> : null}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Button
                    variant="glass"
                    onClick={() => change([...current, bilingualRow()])}
                    disabled={disabled || full}
                >
                    <Plus aria-hidden /> {addLabel}
                </Button>
                <p className="text-[12.5px] text-pretty text-smoke tabular-nums">
                    {max !== undefined
                        ? `${current.length} of ${max}.`
                        : `${current.length} ${current.length === 1 ? 'row' : 'rows'}.`}
                    {note ? <> {note}</> : null}
                </p>
            </div>
        </div>
    );
}
