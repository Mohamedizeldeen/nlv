import { http } from '@inertiajs/react';
import { ArrowUpRight, Eye, PenLine } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, UIEvent } from 'react';
import { flushSync } from 'react-dom';
import { cn } from '@/lib/utils';
import {
    arabicControl,
    arabicName,
    CONTENT_LOCALES,
    LOCALE_META,
    perLocale,
    REVEAL_EVENT,
} from './bilingual';
import type {
    BilingualValue,
    ContentLocale,
    ErrorBag,
    PerLocale,
} from './bilingual';
import { useBilingualState } from './bilingual-field';
import { FieldControlScope, FieldError } from './field';
import { TabPanel, Tabs } from './tabs';
import { Textarea } from './textarea';

/** The Markdown cheat sheet under the editor. */
const SYNTAX = [
    ['## Heading', 'heading'],
    ['**bold**', 'bold'],
    ['*italic*', 'italic'],
    ['[text](https://…)', 'link'],
    ['- item', 'list'],
    ['> note', 'note'],
] as const;

const PLACEHOLDER: Record<ContentLocale, string> = {
    en: '## A heading\n\nA paragraph of text, with a [link](https://example.com).',
    ar: '## عنوان\n\nفقرة من النص، مع [رابط](https://example.com).',
};

type PreviewState = 'ready' | 'rendering' | 'failed';

/** "412 words · 2 min read" (Arabic words are counted the same way). */
export function wordCount(markdown: string): string {
    const words = markdown
        .replace(/[#>*_`[\]()-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;

    if (words === 0) {
        return 'Empty';
    }

    const minutes = Math.max(1, Math.round(words / 230));

    return `${words.toLocaleString('en-US')} ${words === 1 ? 'word' : 'words'} · ${minutes} min read`;
}

/**
 * Renders one language's Markdown on the server (POST `{ body, locale }`
 * → `{ html }`), a moment after typing stops and only while that
 * language is shown. Keeps the last good render while a new one is on
 * its way. Without an initial render it asks for one straight away.
 */
function useMarkdownPreview(
    url: string,
    body: string,
    locale: ContentLocale,
    initial: { body: string; html: string | undefined },
    active: boolean,
) {
    const [html, setHtml] = useState(initial.html ?? '');
    const [state, setState] = useState<PreviewState>('ready');
    const rendered = useRef<string | null>(
        initial.html === undefined ? null : initial.body,
    );

    useEffect(() => {
        if (!active || body === rendered.current) {
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(
            () => {
                if (!body.trim()) {
                    rendered.current = body;
                    setHtml('');
                    setState('ready');

                    return;
                }

                setState('rendering');

                http.getClient()
                    .request({
                        method: 'post',
                        url,
                        data: { body, locale },
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    })
                    .then((response) => {
                        const data = JSON.parse(response.data) as {
                            html?: unknown;
                        };

                        rendered.current = body;
                        setHtml(typeof data.html === 'string' ? data.html : '');
                        setState('ready');
                    })
                    .catch(() => {
                        if (!controller.signal.aborted) {
                            setState('failed');
                        }
                    });
            },
            rendered.current === null ? 0 : 350,
        );

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [active, body, locale, url]);

    return { html, state };
}

type BilingualMarkdownFieldProps = {
    label: ReactNode;
    /** The English column, e.g. `body`. */
    name: string;
    /** The Arabic column (default `${name}_ar`). */
    nameAr?: string;
    value?: BilingualValue;
    defaultValue?: Partial<BilingualValue>;
    onValueChange?: (value: BilingualValue, changed: ContentLocale) => void;
    /** Inertia's error bag: reads `errors[name]` and `errors[nameAr]`. */
    errors?: ErrorBag;
    error?: PerLocale<string>;
    required?: boolean;
    requiredAr?: boolean;
    /** Renders Markdown for the preview: POST `{ body, locale }` → `{ html }`. */
    previewUrl: string;
    /** The server's render of the bodies the form was loaded with. */
    initialHtml?: PerLocale<string>;
    /** Under the editor (default: a Markdown cheat sheet). */
    hint?: ReactNode;
    placeholder?: PerLocale<string>;
    /** The published page per language ("Saved version", new tab). */
    viewHref?: PerLocale<string | null>;
    /** Classes for the editor and preview panes (default: 64vh tall on desktop). */
    paneClassName?: string;
    id?: string;
    className?: string;
};

/**
 * Long Markdown copy in English and Arabic: language tabs (English |
 * العربية) over one editor and a shared preview typeset with the public
 * page's `.landing-prose` (right to left for Arabic). Both textareas stay
 * in the form, so both languages submit whichever tab is showing. A new
 * error opens its language. Phones switch between Write and Preview.
 */
export function BilingualMarkdownField({
    label,
    name,
    nameAr = arabicName(name),
    value,
    defaultValue,
    onValueChange,
    errors,
    error,
    required = false,
    requiredAr = required,
    previewUrl,
    initialHtml,
    hint,
    placeholder,
    viewHref,
    paneClassName = 'lg:h-[min(64vh,40rem)]',
    id,
    className,
}: BilingualMarkdownFieldProps) {
    const [current, set] = useBilingualState({
        value,
        defaultValue,
        onValueChange,
    });
    const [loaded] = useState(current);
    const [locale, setLocale] = useState<ContentLocale>('en');
    const [view, setView] = useState<'write' | 'preview'>('write');
    const generated = useId();
    const base = id ?? `markdown-${generated}`;
    const labelId = `${base}-label`;
    const hintId = `${base}-hint`;
    const root = useRef<HTMLDivElement>(null);
    const preview = useRef<HTMLDivElement>(null);
    const names = { en: name, ar: nameAr };
    const messages = {
        en: perLocale(error, 'en') ?? errors?.[name],
        ar: perLocale(error, 'ar') ?? errors?.[nameAr],
    };

    // A new error: show the language it belongs to (English first).
    const [seen, setSeen] = useState(messages);

    if (messages.en !== seen.en || messages.ar !== seen.ar) {
        setSeen(messages);
        const opened = (['en', 'ar'] as const).find(
            (key) => messages[key] && messages[key] !== seen[key],
        );

        if (opened) {
            setLocale(opened);
            setView('write');
        }
    }

    // The completeness badge asks for the Arabic editor before focusing it.
    useEffect(() => {
        const node = root.current;

        if (!node) {
            return;
        }

        const reveal = () =>
            flushSync(() => {
                setLocale('ar');
                setView('write');
            });

        node.addEventListener(REVEAL_EVENT, reveal);

        return () => node.removeEventListener(REVEAL_EVENT, reveal);
    }, []);

    const previewEn = useMarkdownPreview(
        previewUrl,
        current.en,
        'en',
        { body: loaded.en, html: initialHtml?.en },
        locale === 'en',
    );
    const previewAr = useMarkdownPreview(
        previewUrl,
        current.ar,
        'ar',
        { body: loaded.ar, html: initialHtml?.ar },
        locale === 'ar',
    );
    const { html, state } = locale === 'ar' ? previewAr : previewEn;
    const savedHref = viewHref?.[locale];

    // Keep the preview roughly level with the editor while scrolling.
    const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
        const source = event.currentTarget;
        const target = preview.current;
        const range = source.scrollHeight - source.clientHeight;

        if (!target || range <= 0) {
            return;
        }

        target.scrollTop =
            (source.scrollTop / range) *
            (target.scrollHeight - target.clientHeight);
    };

    return (
        <div ref={root} className={cn('grid min-w-0 gap-2.5', className)}>
            <div className="flex items-baseline justify-between gap-3">
                <label
                    id={labelId}
                    htmlFor={`${base}-${locale}`}
                    className="text-[13px] leading-snug font-medium text-bone"
                >
                    {label}
                </label>
            </div>

            <div className="flex items-end justify-between gap-3 border-b border-white/10">
                <Tabs
                    className="-mb-px min-w-0 border-b-0"
                    label="Language"
                    idPrefix={base}
                    value={locale}
                    onValueChange={(next) => setLocale(next as ContentLocale)}
                    items={[
                        {
                            value: 'en',
                            label: LOCALE_META.en.native,
                            invalid: Boolean(messages.en),
                        },
                        {
                            value: 'ar',
                            label: (
                                <span lang="ar" className={arabicControl}>
                                    {LOCALE_META.ar.native}
                                </span>
                            ),
                            invalid: Boolean(messages.ar),
                        },
                    ]}
                />
                <button
                    type="button"
                    aria-pressed={view === 'preview'}
                    onClick={() =>
                        setView(view === 'write' ? 'preview' : 'write')
                    }
                    className="mb-1.5 inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] text-smoke transition-colors duration-300 ease-glass hover:bg-white/[0.06] hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none lg:hidden [&_svg]:size-3.5"
                >
                    {view === 'write' ? (
                        <>
                            <Eye aria-hidden /> Preview
                        </>
                    ) : (
                        <>
                            <PenLine aria-hidden /> Write
                        </>
                    )}
                </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div
                    className={cn(
                        'min-w-0',
                        view !== 'write' && 'max-lg:hidden',
                    )}
                >
                    {CONTENT_LOCALES.map((key) => {
                        const arabic = key === 'ar';
                        const controlId = `${base}-${key}`;
                        const errorId = messages[key]
                            ? `${controlId}-error`
                            : undefined;

                        return (
                            <TabPanel
                                key={key}
                                value={key}
                                idPrefix={base}
                                // Hidden, not unmounted: both languages submit.
                                hidden={key !== locale}
                                focusable={false}
                                className="grid gap-2"
                            >
                                <div className="flex min-h-5 items-baseline justify-between gap-3">
                                    <p
                                        aria-hidden
                                        className="text-[10px] leading-none font-medium tracking-[0.24em] text-smoke uppercase"
                                    >
                                        Markdown · {LOCALE_META[key].name}
                                    </p>
                                    <span className="text-[12px] leading-none text-smoke tabular-nums">
                                        {wordCount(current[key])}
                                    </span>
                                </div>
                                <div
                                    data-bilingual-ar={
                                        arabic ? name : undefined
                                    }
                                >
                                    <FieldControlScope
                                        id={controlId}
                                        describedBy={
                                            [errorId, hintId]
                                                .filter(Boolean)
                                                .join(' ') || undefined
                                        }
                                        invalid={Boolean(messages[key])}
                                    >
                                        <Textarea
                                            name={names[key]}
                                            value={current[key]}
                                            onChange={(event) =>
                                                set(key, event.target.value)
                                            }
                                            onScroll={syncScroll}
                                            // Not `required`: a hidden tab's textarea can't show the browser's bubble.
                                            aria-required={
                                                (arabic
                                                    ? requiredAr
                                                    : required) || undefined
                                            }
                                            aria-labelledby={`${labelId} ${controlId}-tab-name`}
                                            spellCheck
                                            mono={!arabic}
                                            lang={arabic ? 'ar' : undefined}
                                            dir={arabic ? 'rtl' : undefined}
                                            placeholder={
                                                placeholder?.[key] ??
                                                PLACEHOLDER[key]
                                            }
                                            className={cn(
                                                'min-h-[18rem] lg:[field-sizing:fixed] lg:max-h-none lg:min-h-0 lg:resize-none',
                                                arabic && [
                                                    arabicControl,
                                                    'leading-[1.8]',
                                                ],
                                                paneClassName,
                                            )}
                                        />
                                    </FieldControlScope>
                                </div>
                                <span
                                    id={`${controlId}-tab-name`}
                                    className="sr-only"
                                >
                                    ({LOCALE_META[key].name})
                                </span>
                                {messages[key] ? (
                                    <FieldError id={errorId}>
                                        {messages[key]}
                                    </FieldError>
                                ) : null}
                            </TabPanel>
                        );
                    })}
                </div>

                <div
                    className={cn(
                        'grid min-w-0 content-start gap-2',
                        view !== 'preview' && 'max-lg:hidden',
                    )}
                >
                    <div className="flex min-h-5 items-baseline justify-between gap-3">
                        <p
                            aria-live="polite"
                            className={cn(
                                state === 'failed'
                                    ? 'text-[12px] leading-snug text-coral'
                                    : 'text-[10px] leading-none font-medium tracking-[0.24em] whitespace-nowrap text-smoke uppercase',
                            )}
                        >
                            {state === 'failed'
                                ? 'The preview could not be updated. It will try again as you type.'
                                : state === 'rendering'
                                  ? 'Updating the preview…'
                                  : `Preview · ${LOCALE_META[locale].name}`}
                        </p>
                        {savedHref ? (
                            <a
                                href={savedHref}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex shrink-0 items-center gap-1 rounded-[6px] text-[12px] leading-none text-smoke transition-colors duration-300 ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                            >
                                Saved version
                                <ArrowUpRight
                                    aria-hidden
                                    className="size-3.5"
                                />
                                <span className="sr-only">
                                    (opens in a new tab)
                                </span>
                            </a>
                        ) : null}
                    </div>
                    <div
                        ref={preview}
                        className={cn(
                            'overflow-y-auto overscroll-contain rounded-[14px] border border-white/[0.08] bg-ink/30 px-5 py-6 transition-opacity duration-300 sm:px-7',
                            'max-lg:max-h-[70vh] max-lg:min-h-[16rem]',
                            paneClassName,
                            state === 'rendering' && 'opacity-70',
                        )}
                    >
                        {html ? (
                            <article
                                // The public page's own typesetting (landing.css).
                                className="landing-prose"
                                lang={locale}
                                dir={LOCALE_META[locale].dir}
                                // Rendered by the server with raw HTML stripped and unsafe links dropped.
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        ) : (
                            <p className="font-display text-[1.2rem] text-smoke italic">
                                {locale === 'ar'
                                    ? 'No Arabic yet: until it is written, the Arabic page shows the English text.'
                                    : 'Start writing: the page appears here as visitors will read it.'}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <p
                id={hintId}
                className="text-[12.5px] leading-relaxed text-pretty text-smoke"
            >
                {hint ?? (
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                        {SYNTAX.map(([syntax, what]) => (
                            <span key={what}>
                                <code className="font-mono text-[12px] text-mist">
                                    {syntax}
                                </code>{' '}
                                <span className="sr-only">for {what}</span>
                            </span>
                        ))}
                    </span>
                )}
            </p>
        </div>
    );
}
