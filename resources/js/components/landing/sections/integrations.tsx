import {
    ArrowRight,
    Check,
    Copy,
    GripVertical,
    Plus,
    Search,
    ShoppingBag,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '../brand';
import { BrowserFrame } from '../devices';
import { IMAGES } from '../images';
import { Photo } from '../photo';
import {
    Arabic,
    Container,
    Glow,
    Reveal,
    SectionHeader,
    cta,
} from '../primitives';
import { LiveDot } from '../tryon-ui';

// Placeholder content: replace before launch. -----------------------------

/** Lower-case brand slug used in data attributes, env vars and paths. */
const SLUG = BRAND.name.toLowerCase();

/** The fictional Shopify store shown in the theme editor mockup. */
const STORE = {
    name: 'Maison Rimal',
    admin: 'maison-rimal.myshopify.com/admin/themes',
    collection: 'Evening · Dresses',
    product: 'Tulle dress, cream',
    price: 'SAR 2,450',
    material: 'Silk tulle, embroidered with wheat in gold thread.',
    sizes: ['36', '38', '40', '42'],
    size: '38',
    /** "Before lunch": the time the button went live. */
    liveSince: '11:48',
};

const SKU = 'ABY-0192';

const POINTS: { token: string; title: string; detail: string }[] = [
    {
        token: 'render.completed',
        title: 'Webhooks for every render',
        detail: 'One signed POST per try-on, with the size advice attached. Retried for 24 hours.',
    },
    {
        token: 'retention: "session"',
        title: 'Processed in-region, deleted after each session',
        detail: 'Shopper photos stay in the Gulf and are gone when the fitting room closes.',
    },
    {
        token: 'locale: "ar" | "en"',
        title: 'Arabic and English, RTL-aware',
        detail: 'One attribute sets the language, and the whole widget mirrors right to left.',
    },
];

const PLATFORMS: { name: string; beta?: boolean }[] = [
    { name: 'Shopify' },
    { name: 'Salla', beta: true },
    { name: 'Zid', beta: true },
    { name: 'WooCommerce' },
    { name: 'Custom API' },
];

/** Widget events for the Script tag tab: a try-on, just before lunch. */
const CONSOLE: { time: string; event: string; detail: string }[] = [
    {
        time: '11:48:02',
        event: 'ready',
        detail: 'widget.js · 14 kB · locale ar',
    },
    { time: '11:48:09', event: 'open', detail: `sku ${SKU}` },
    { time: '11:48:11', event: 'render', detail: '1.8 s · size 54 · 96% fit' },
    { time: '11:48:16', event: 'add-to-bag', detail: `${SKU} · 54` },
];

const WEBHOOK = {
    path: `/hooks/${SLUG}`,
    event: 'render.completed',
    id: 'rnd_8f2k1',
    ms: '1,840 ms',
};

// -------------------------------------------------------------------------

type TabId = 'shopify' | 'script' | 'api';

const TABS: { id: TabId; label: string; url: string }[] = [
    { id: 'shopify', label: 'Shopify app', url: STORE.admin },
    {
        id: 'script',
        label: 'Script tag',
        url: `docs.${BRAND.domain}/web/script-tag`,
    },
    { id: 'api', label: 'REST API', url: `docs.${BRAND.domain}/api/renders` },
];

/* Hand-set syntax colouring: each line is a list of [kind, text] tokens. */
type Kind =
    | 'comment'
    | 'tag'
    | 'attr'
    | 'string'
    | 'punct'
    | 'plain'
    | 'command'
    | 'number'
    | 'arabic';
type Token = readonly [Kind, string];
type CodeLine = readonly Token[];

const TOKEN_CLASS: Record<Kind, string> = {
    comment: 'text-smoke italic',
    tag: 'text-lagoon',
    attr: 'text-rose',
    string: 'text-champagne',
    punct: 'text-mist/55',
    plain: 'text-mist',
    command: 'text-bone',
    number: 'text-lagoon',
    arabic: 'text-bone',
};

const SCRIPT_LINES: CodeLine[] = [
    [['comment', '<!-- Before </body> -->']],
    [
        ['punct', '<'],
        ['tag', 'script'],
        ['plain', ' '],
        ['attr', 'src'],
        ['punct', '='],
        ['string', `"https://cdn.${BRAND.domain}/v1/widget.js"`],
        ['plain', ' '],
        ['attr', 'defer'],
        ['punct', '></'],
        ['tag', 'script'],
        ['punct', '>'],
    ],
    [],
    [['comment', '<!-- On the product page, where the button belongs -->']],
    [
        ['punct', '<'],
        ['tag', 'button'],
        ['plain', ' '],
        ['attr', `data-${SLUG}-sku`],
        ['punct', '='],
        ['string', `"${SKU}"`],
        ['plain', ' '],
        ['attr', `data-${SLUG}-locale`],
        ['punct', '='],
        ['string', '"ar"'],
        ['punct', '>'],
        ['arabic', 'جرّبها'],
        ['punct', '</'],
        ['tag', 'button'],
        ['punct', '>'],
    ],
];

const REQUEST_LINES: CodeLine[] = [
    [
        ['command', 'curl'],
        ['plain', ` https://api.${BRAND.domain}/v1/renders`],
        ['punct', ' \\'],
    ],
    [
        ['plain', '  '],
        ['attr', '-H'],
        ['plain', ' '],
        ['string', `"Authorization: Bearer $${SLUG.toUpperCase()}_KEY"`],
        ['punct', ' \\'],
    ],
    [
        ['plain', '  '],
        ['attr', '-F'],
        ['plain', ' person='],
        ['string', '@shopper.jpg'],
        ['punct', ' \\'],
    ],
    [
        ['plain', '  '],
        ['attr', '-F'],
        ['plain', ' sku='],
        ['string', SKU],
    ],
];

const RESPONSE_LINES: CodeLine[] = [
    [['punct', '{']],
    [
        ['plain', '  '],
        ['attr', '"id"'],
        ['punct', ': '],
        ['string', `"${WEBHOOK.id}"`],
        ['punct', ','],
    ],
    [
        ['plain', '  '],
        ['attr', '"status"'],
        ['punct', ': '],
        ['string', '"done"'],
        ['punct', ','],
    ],
    [
        ['plain', '  '],
        ['attr', '"image_url"'],
        ['punct', ': '],
        ['string', `"https://cdn.${BRAND.domain}/r/${WEBHOOK.id}.jpg"`],
        ['punct', ','],
    ],
    [
        ['plain', '  '],
        ['attr', '"size"'],
        ['punct', ': { '],
        ['attr', '"recommended"'],
        ['punct', ': '],
        ['string', '"54"'],
        ['punct', ', '],
        ['attr', '"confidence"'],
        ['punct', ': '],
        ['number', '0.96'],
        ['punct', ' },'],
    ],
    [
        ['plain', '  '],
        ['attr', '"ms"'],
        ['punct', ': '],
        ['number', '1840'],
    ],
    [['punct', '}']],
];

const plainText = (lines: readonly CodeLine[]) =>
    lines.map((line) => line.map(([, text]) => text).join('')).join('\n');

/** What the Copy button puts on the clipboard for each code tab. */
const COPY_TEXT: Record<Exclude<TabId, 'shopify'>, string> = {
    script: plainText(SCRIPT_LINES),
    api: plainText(REQUEST_LINES),
};

export default function Integrations() {
    return (
        <section id="integrations" className="relative isolate py-24 md:py-36">
            <Glow
                color="lagoon"
                className="top-[38%] -right-48 size-[40rem] opacity-35"
            />
            <Glow
                color="amethyst"
                className="bottom-0 left-[-18rem] size-[34rem] opacity-30"
            />
            <Container>
                <SectionHeader
                    index="07"
                    label="Developers"
                    labelAr="التكامل"
                    title={
                        <>
                            Live on Shopify <em>before lunch.</em>
                        </>
                    }
                    lede={
                        <p>
                            Install the app and switch on the{' '}
                            <span className="whitespace-nowrap">
                                Try-on button
                            </span>{' '}
                            in your theme editor. Building your own storefront?
                            One script tag, or the REST API.
                        </p>
                    }
                />

                <div className="mt-14 grid gap-y-14 md:mt-20 lg:grid-cols-12 lg:gap-x-8">
                    <Reveal className="lg:col-span-4 lg:pr-4">
                        <SpecSheet />
                    </Reveal>
                    <Reveal
                        delay={120}
                        className="min-w-0 lg:col-span-8 lg:-mr-6 xl:-mr-12"
                    >
                        <Console />
                    </Reveal>
                </div>
            </Container>
        </section>
    );
}

/** The narrow left column: three points, the platforms and a way to talk. */
function SpecSheet() {
    return (
        <div>
            <ul className="border-t border-white/10">
                {POINTS.map((point) => (
                    <li
                        key={point.title}
                        className="border-b border-white/10 py-5"
                    >
                        <p className="font-mono text-[12px] text-champagne/85">
                            {point.token}
                        </p>
                        <h3 className="mt-2 text-[17px] leading-snug font-medium text-pretty text-bone">
                            {point.title}
                        </h3>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-pretty text-mist">
                            {point.detail}
                        </p>
                    </li>
                ))}
            </ul>

            <p className="mt-9 text-kicker font-medium text-smoke uppercase">
                Works with
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                    <li
                        key={platform.name}
                        className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-white/[0.035] px-3.5 text-[13px] text-bone ring-1 ring-white/12 ring-inset"
                    >
                        {platform.name}
                        {platform.beta ? (
                            <span className="text-[10px] font-medium tracking-[0.16em] text-champagne uppercase">
                                Beta
                            </span>
                        ) : null}
                    </li>
                ))}
            </ul>

            <a
                href="#demo"
                className={cn(
                    cta({ variant: 'ghost', size: 'sm' }),
                    'group mt-8 -ml-0.5 h-auto px-0.5 py-1 text-[15px]',
                )}
            >
                Talk to an engineer
                <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform duration-[380ms] ease-glass group-hover:translate-x-1"
                />
            </a>
        </div>
    );
}

/** The browser with its three integration tabs. */
function Console() {
    const [tab, setTab] = useState<TabId>('shopify');
    const [enabled, setEnabled] = useState(true);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const active = TABS.find((item) => item.id === tab) ?? TABS[0];

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const index = TABS.findIndex((item) => item.id === tab);
        const last = TABS.length - 1;
        const moves: Record<string, number> = {
            ArrowRight: index === last ? 0 : index + 1,
            ArrowLeft: index === 0 ? last : index - 1,
            Home: 0,
            End: last,
        };
        const next = moves[event.key];

        if (next === undefined) {
            return;
        }

        event.preventDefault();
        tabRefs.current[next]?.focus();
        setTab(TABS[next].id);
    };

    return (
        <div className="relative">
            <BrowserFrame
                url={active.url}
                className="w-full"
                screenClassName="bg-[oklch(0.13_0.016_285/0.78)]"
            >
                <div className="flex h-12 items-stretch justify-between gap-3 border-b border-white/10 pr-2 pl-1 sm:pr-3 sm:pl-2">
                    <div
                        role="tablist"
                        aria-label="Ways to integrate"
                        className="flex min-w-0 items-stretch"
                    >
                        {TABS.map((item, index) => {
                            const selected = item.id === tab;

                            return (
                                <button
                                    key={item.id}
                                    ref={(node) => {
                                        tabRefs.current[index] = node;
                                    }}
                                    type="button"
                                    role="tab"
                                    id={`integrations-tab-${item.id}`}
                                    aria-selected={selected}
                                    aria-controls={`integrations-panel-${item.id}`}
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => setTab(item.id)}
                                    onKeyDown={onKeyDown}
                                    className={cn(
                                        'relative cursor-pointer px-2 text-[13px] font-medium whitespace-nowrap transition-colors duration-300 ease-glass focus-visible:outline-none sm:px-3.5',
                                        'after:absolute after:inset-x-2 after:bottom-[-1px] after:h-px after:origin-left after:bg-champagne after:transition-transform after:duration-500 after:ease-glass sm:after:inset-x-3.5',
                                        'before:pointer-events-none before:absolute before:inset-x-0.5 before:inset-y-2 before:rounded-[10px] before:ring-champagne/70 focus-visible:before:ring-2',
                                        selected
                                            ? 'text-bone after:scale-x-100'
                                            : 'text-smoke after:scale-x-0 hover:text-mist',
                                    )}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex shrink-0 items-center">
                        {tab === 'shopify' ? (
                            <PublishState enabled={enabled} />
                        ) : (
                            <CopyButton tab={tab} />
                        )}
                    </div>
                </div>

                <div className="relative lg:h-[496px]">
                    <TabPanel id="shopify" active={tab}>
                        <ThemeEditor enabled={enabled} onToggle={setEnabled} />
                    </TabPanel>
                    <TabPanel id="script" active={tab}>
                        <ScriptTag />
                    </TabPanel>
                    <TabPanel id="api" active={tab}>
                        <RestApi />
                    </TabPanel>
                </div>
            </BrowserFrame>

            <WebhookReceipt />
        </div>
    );
}

function TabPanel({
    id,
    active,
    children,
}: {
    id: TabId;
    active: TabId;
    children: ReactNode;
}) {
    return (
        <div
            role="tabpanel"
            id={`integrations-panel-${id}`}
            aria-labelledby={`integrations-tab-${id}`}
            tabIndex={0}
            hidden={id !== active}
            className="h-full focus-visible:ring-2 focus-visible:ring-champagne/60 focus-visible:outline-none focus-visible:ring-inset"
        >
            {children}
        </div>
    );
}

/** Toolbar status for the Shopify tab: the wink at "before lunch". */
function PublishState({ enabled }: { enabled: boolean }) {
    return (
        <p className="flex items-center gap-2 text-[12px] text-mist tabular-nums">
            {enabled ? (
                <LiveDot />
            ) : (
                <span aria-hidden className="size-2 rounded-full bg-smoke/60" />
            )}
            {enabled ? (
                <span>
                    <span className="max-sm:sr-only">Live since </span>
                    {STORE.liveSince}
                </span>
            ) : (
                <span>Hidden</span>
            )}
        </p>
    );
}

function CopyButton({ tab }: { tab: Exclude<TabId, 'shopify'> }) {
    const [copied, setCopied] = useState<TabId | null>(null);
    const [failed, setFailed] = useState(false);
    const done = copied === tab;

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = window.setTimeout(() => setCopied(null), 2000);

        return () => window.clearTimeout(timer);
    }, [copied]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(COPY_TEXT[tab]);
            setFailed(false);
            setCopied(tab);
        } catch {
            // Clipboard blocked (permissions, insecure context): select the
            // code instead so it can be copied by hand.
            const code = document.querySelector(
                `#integrations-panel-${tab} [data-copy-source]`,
            );
            const selection = window.getSelection();

            if (code && selection) {
                const range = document.createRange();
                range.selectNodeContents(code);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            setFailed(true);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={copy}
                className={cn(
                    cta({ variant: 'glass', size: 'sm' }),
                    'h-9 gap-1.5 rounded-[11px] px-3 text-[12px] after:absolute after:-inset-1 hover:translate-y-0 max-sm:w-9 max-sm:px-0',
                    done && 'text-champagne',
                )}
            >
                {done ? (
                    <Check aria-hidden className="size-3.5" />
                ) : (
                    <Copy aria-hidden className="size-3.5" />
                )}
                <span className="max-sm:sr-only">
                    {done ? 'Copied' : failed ? 'Selected' : 'Copy'}
                </span>
            </button>
            <span className="sr-only" aria-live="polite">
                {done
                    ? 'Code copied to the clipboard.'
                    : failed
                      ? 'Code selected. Press Control or Command and C to copy.'
                      : ''}
            </span>
        </>
    );
}

/** Numbered, hand-coloured code. Line numbers never reach the clipboard. */
function CodeBlock({
    lines,
    label,
    copySource = false,
}: {
    lines: readonly CodeLine[];
    label: string;
    copySource?: boolean;
}) {
    return (
        <div
            role="region"
            aria-label={label}
            tabIndex={0}
            className="min-w-0 [scrollbar-width:thin] overflow-x-auto overscroll-x-contain rounded-[10px] focus-visible:ring-2 focus-visible:ring-champagne/60 focus-visible:outline-none"
        >
            <pre className="w-max min-w-full py-1 font-mono text-[13px] leading-[1.8]">
                <code
                    data-copy-source={copySource ? '' : undefined}
                    className="grid"
                >
                    {lines.map((line, index) => (
                        <span
                            key={index}
                            className="grid grid-cols-[2.25rem_auto] pr-6"
                        >
                            <span
                                aria-hidden
                                className="pr-4 text-right text-smoke/60 tabular-nums select-none"
                            >
                                {index + 1}
                            </span>
                            <span className="whitespace-pre">
                                {line.length === 0
                                    ? ' '
                                    : line.map(([kind, text], at) =>
                                          kind === 'arabic' ? (
                                              <Arabic
                                                  key={at}
                                                  className="text-[16px] text-bone"
                                              >
                                                  {text}
                                              </Arabic>
                                          ) : (
                                              <span
                                                  key={at}
                                                  className={TOKEN_CLASS[kind]}
                                              >
                                                  {text}
                                              </span>
                                          ),
                                      )}
                            </span>
                        </span>
                    ))}
                </code>
            </pre>
        </div>
    );
}

function FileLabel({ children, meta }: { children: ReactNode; meta?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4 px-4 pt-4 pb-2 sm:px-5">
            <p className="font-mono text-[12px] text-smoke">{children}</p>
            {meta ? (
                <p className="text-[11px] text-smoke tabular-nums">{meta}</p>
            ) : null}
        </div>
    );
}

function ScriptTag() {
    return (
        <div className="flex h-full flex-col">
            <FileLabel meta="14 kB · loads after the page">
                product.html
            </FileLabel>
            <div className="px-2 sm:px-3">
                <CodeBlock
                    lines={SCRIPT_LINES}
                    label="Script tag snippet"
                    copySource
                />
            </div>

            <div className="mt-4 flex-1 border-t border-white/10 bg-black/15 px-4 pt-5 pb-6 sm:px-5">
                {/* What those two tags draw, in each locale. */}
                <p className="text-kicker font-medium text-smoke uppercase">
                    Renders as
                </p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                    <RenderedButton locale="ar" />
                    <RenderedButton locale="en" />
                </div>

                {/* What the widget reports back to the page. */}
                <p className="mt-6 text-kicker font-medium text-smoke uppercase">
                    Console
                </p>
                <div className="mt-2 [scrollbar-width:thin] overflow-x-auto overscroll-x-contain">
                    <ol className="w-max min-w-full font-mono text-[12px] leading-[1.9]">
                        {CONSOLE.map((entry) => (
                            <li
                                key={entry.event}
                                className="grid grid-cols-[4.75rem_9.5rem_auto] whitespace-nowrap"
                            >
                                <span className="text-smoke/70 tabular-nums">
                                    {entry.time}
                                </span>
                                <span className="text-lagoon">
                                    {SLUG}:{entry.event}
                                </span>
                                <span className="text-mist">
                                    {entry.detail}
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
}

/** The widget's button as drawn for one locale, labelled with its code. */
function RenderedButton({ locale }: { locale: 'ar' | 'en' }) {
    return (
        <div className="flex items-center gap-2.5 rounded-[14px] bg-white/[0.04] py-1.5 pr-1.5 pl-3 ring-1 ring-white/10">
            <span className="font-mono text-[11px] text-smoke">{locale}</span>
            {locale === 'ar' ? (
                <Arabic className="inline-flex h-9 items-center rounded-[10px] bg-champagne px-4 text-[17px] text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.6)]">
                    جرّبها
                </Arabic>
            ) : (
                <span className="inline-flex h-9 items-center rounded-[10px] bg-champagne px-4 text-[13px] font-medium text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.6)]">
                    Try it on
                </span>
            )}
        </div>
    );
}

function RestApi() {
    return (
        <div className="flex h-full flex-col">
            <FileLabel meta="POST · multipart">terminal</FileLabel>
            <div className="px-2 sm:px-3">
                <CodeBlock
                    lines={REQUEST_LINES}
                    label="Render request"
                    copySource
                />
            </div>
            <div className="mt-4 flex-1 border-t border-white/10 bg-black/15">
                <div className="flex items-center gap-2 px-4 pt-4 pb-2 text-[12px] sm:px-5">
                    <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-lagoon"
                    />
                    <span className="font-mono text-bone">200 OK</span>
                    <span className="text-smoke tabular-nums">
                        · {WEBHOOK.ms}
                    </span>
                </div>
                <div className="px-2 pb-4 sm:px-3">
                    <CodeBlock lines={RESPONSE_LINES} label="Render response" />
                </div>
            </div>
        </div>
    );
}

const BLOCKS = ['Product information', 'Price', 'Variant picker'] as const;

/** A generic theme editor: block list on the left, live preview on the right. */
function ThemeEditor({
    enabled,
    onToggle,
}: {
    enabled: boolean;
    onToggle: (next: boolean) => void;
}) {
    return (
        <div className="grid h-full sm:grid-cols-[36%_1fr]">
            <div className="flex flex-col border-b border-white/10 bg-black/15 p-3 sm:border-r sm:border-b-0 sm:p-4">
                <div className="px-1.5 pb-3">
                    <p className="text-kicker font-medium text-smoke uppercase">
                        Product page
                    </p>
                    <p className="mt-1 text-[12px] text-mist">
                        Template · Default product
                    </p>
                </div>

                <ul className="flex flex-col gap-1 text-[13px]">
                    {BLOCKS.map((block, index) => (
                        <li
                            key={block}
                            className={cn(
                                'flex h-9 items-center gap-2 rounded-[10px] px-1.5 text-mist',
                                index < 2 && 'max-sm:hidden',
                            )}
                        >
                            <GripVertical
                                aria-hidden
                                className="size-3.5 shrink-0 text-smoke/70"
                            />
                            {block}
                        </li>
                    ))}
                    <li
                        className={cn(
                            'rounded-[12px] ring-1 transition-[background-color,box-shadow] duration-500 ease-glass',
                            enabled
                                ? 'bg-champagne/[0.08] ring-champagne/35'
                                : 'bg-white/[0.03] ring-white/10',
                        )}
                    >
                        <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            onClick={() => onToggle(!enabled)}
                            className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-[12px] px-1.5 text-left focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none"
                        >
                            <GripVertical
                                aria-hidden
                                className="size-3.5 shrink-0 text-smoke/70"
                            />
                            <span className="flex-1 font-medium text-bone">
                                {BRAND.name} button
                            </span>
                            <span
                                aria-hidden
                                className={cn(
                                    'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-500 ease-glass',
                                    enabled
                                        ? 'bg-champagne'
                                        : 'bg-white/15 ring-1 ring-white/15',
                                )}
                            >
                                <span
                                    className={cn(
                                        'absolute top-0.5 left-0.5 size-4 rounded-full shadow-[0_1px_3px_oklch(0_0_0/0.4)] transition-[translate,background-color] duration-500 ease-glass',
                                        enabled
                                            ? 'translate-x-4 bg-ink'
                                            : 'bg-mist',
                                    )}
                                />
                            </span>
                        </button>
                        <dl
                            className={cn(
                                'grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 px-2.5 pt-1 pb-3 text-[11px] transition-opacity duration-500 ease-glass max-sm:hidden',
                                !enabled && 'opacity-40',
                            )}
                        >
                            <dt className="text-smoke">Label</dt>
                            <dd className="flex items-center gap-1.5 text-mist">
                                Try it on
                                <span className="text-white/20">·</span>
                                <Arabic className="text-[13px] leading-none">
                                    جرّبها
                                </Arabic>
                            </dd>
                            <dt className="text-smoke">Size advice</dt>
                            <dd className="text-mist">On</dd>
                        </dl>
                    </li>
                    <li className="flex h-9 items-center gap-2 rounded-[10px] px-1.5 text-mist">
                        <GripVertical
                            aria-hidden
                            className="size-3.5 shrink-0 text-smoke/70"
                        />
                        Buy buttons
                    </li>
                </ul>

                <p className="mt-2 hidden h-9 items-center gap-2 px-1.5 text-[12px] text-smoke sm:flex">
                    <Plus aria-hidden className="size-3.5" />
                    Add block
                </p>
            </div>

            <StorePreview enabled={enabled} />
        </div>
    );
}

/** The storefront as the shopper will see it, updating with the switch. */
function StorePreview({ enabled }: { enabled: boolean }) {
    const product = IMAGES.integrations.product;

    return (
        <div className="p-3 sm:p-4">
            <div className="flex h-full flex-col overflow-hidden rounded-[16px] bg-[oklch(0.1_0.008_285)] ring-1 ring-white/10">
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.07] px-4">
                    <span className="font-display text-[11px] font-medium tracking-[0.32em] text-bone uppercase">
                        {STORE.name}
                    </span>
                    <span aria-hidden className="flex gap-3 text-mist">
                        <Search className="size-3.5" />
                        <ShoppingBag className="size-3.5" />
                    </span>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-[46%_1fr]">
                    <div className="relative min-h-[260px]">
                        <Photo
                            id={product.id}
                            alt={product.alt}
                            widths={[320, 480, 640]}
                            sizes="(min-width: 1024px) 240px, 40vw"
                            className="absolute inset-0 size-full"
                            style={{
                                objectPosition: `${product.focus[0] * 100}% ${product.focus[1] * 100}%`,
                            }}
                        />
                        <div
                            aria-hidden
                            className="absolute inset-y-0 right-0 w-10 bg-linear-to-r from-transparent to-[oklch(0.1_0.008_285)]"
                        />
                    </div>

                    <div className="flex min-w-0 flex-col justify-center py-4 pr-4 pl-2 sm:pl-3">
                        <p className="text-[9px] font-medium tracking-[0.22em] text-smoke uppercase">
                            {STORE.collection}
                        </p>
                        <p className="mt-2 font-display text-[19px] leading-tight font-medium text-bone">
                            {STORE.product}
                        </p>
                        <p className="mt-1 text-[12px] text-mist tabular-nums">
                            {STORE.price}
                        </p>
                        <p className="mt-3 hidden text-[11px] leading-relaxed text-smoke sm:block">
                            {STORE.material}
                        </p>

                        <div className="mt-4 flex gap-1">
                            {STORE.sizes.map((size) => (
                                <span
                                    key={size}
                                    className={cn(
                                        'grid h-7 min-w-7 place-items-center rounded-[8px] px-1 text-[11px] tabular-nums',
                                        size === STORE.size
                                            ? 'text-bone ring-1 ring-bone/70'
                                            : 'text-smoke ring-1 ring-white/10',
                                    )}
                                >
                                    {size}
                                </span>
                            ))}
                        </div>

                        {/* The block being switched on and off. */}
                        <div className="relative mt-4 h-9">
                            <div
                                aria-hidden={!enabled}
                                className={cn(
                                    'absolute inset-0 flex items-center justify-center gap-2 rounded-[10px] bg-champagne text-[12px] font-medium text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.6),0_8px_24px_-8px_oklch(0.86_0.075_82/0.6)] transition-[opacity,scale] duration-500 ease-glass',
                                    enabled
                                        ? 'scale-100 opacity-100'
                                        : 'scale-95 opacity-0',
                                )}
                            >
                                Try it on
                                <span className="h-3 w-px bg-ink/25" />
                                <Arabic className="text-[14px] leading-none">
                                    جرّبها
                                </Arabic>
                            </div>
                            <div
                                aria-hidden
                                className={cn(
                                    'absolute inset-0 grid place-items-center rounded-[10px] border border-dashed border-white/20 text-[11px] text-smoke transition-opacity duration-500 ease-glass',
                                    enabled ? 'opacity-0' : 'opacity-100',
                                )}
                            >
                                Block hidden
                            </div>
                        </div>
                        <span className="mt-2 grid h-9 place-items-center rounded-[10px] text-[12px] font-medium text-bone ring-1 ring-bone/45 ring-inset">
                            Add to bag
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** A delivery receipt hanging off the browser: the webhook, arriving. */
function WebhookReceipt() {
    return (
        <div
            aria-hidden
            className="absolute -bottom-12 -left-24 hidden w-[272px] rounded-[18px] p-3.5 glass-strong xl:block"
        >
            <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
                <span className="flex items-center gap-2">
                    <span className="rounded-[6px] bg-lagoon/20 px-1.5 py-0.5 text-lagoon">
                        POST
                    </span>
                    <span className="text-mist">{WEBHOOK.path}</span>
                </span>
                <span className="text-lagoon">200</span>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-white/10 pt-2.5 text-[12px]">
                <span className="font-mono text-champagne">
                    {WEBHOOK.event}
                </span>
                <span className="text-smoke tabular-nums">{WEBHOOK.ms}</span>
            </div>
        </div>
    );
}
