import { useForm } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    Check,
    Copy,
    LoaderCircle,
    Minus,
    Plus,
    X,
} from 'lucide-react';
import {
    createContext,
    useContext,
    useEffect,
    useEffectEvent,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import type {
    ChangeEvent,
    CSSProperties,
    FormEvent,
    MouseEvent,
    ReactNode,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { store } from '@/actions/App/Http/Controllers/OrderRequestController';
import { useClipboard } from '@/hooks/use-clipboard';
import { useI18n } from '@/hooks/use-i18n';
import type { Locale } from '@/i18n';
import { cn } from '@/lib/utils';
import type { OrderRequestFlash, PlanKey } from '@/types/landing';
import { Accent } from './accent';
import { useContent, useLanding } from './landing-data';
import { Glow, cta } from './primitives';

/*
 * The "Order a device" pop-up. Every order CTA on the page opens it through
 * useOrderDialog(); anchors keep href="#order" as their no-JS fallback.
 * Posts to OrderRequestController@store (StoreOrderRequest) and shows the
 * lead's reference from the `orderRequest` flash. Needs a
 * <LandingDataProvider> above <OrderDialogProvider> for its copy.
 * It posts the page's language (`locale`): the server answers in it and
 * stores it on the lead. Static strings: i18n/sections/order-dialog.ts.
 */

/** The CTA that opened the form; mirrors App\Enums\LeadSource. */
export type LeadSource =
    | 'hero'
    | 'navbar'
    | 'mobile-menu'
    | 'pricing-buy'
    | 'pricing-lease'
    | 'pricing-chain'
    | 'lookbook'
    | 'order-section'
    | 'footer';

/** How the visitor would like to own the device; mirrors App\Enums\LeadPlan. */
export type OrderPlan = PlanKey | 'unsure';

export type OrderDialogOptions = {
    /** Preselects a plan card (the pricing CTAs). */
    plan?: OrderPlan;
    /** Stored on the lead: which CTA was clicked. */
    source?: LeadSource;
    /** Prefills the work email (the order section's email field). */
    email?: string;
};

export type OrderDialogApi = {
    /** Opens a fresh form. Focus returns to the focused element on close. */
    open: (options?: OrderDialogOptions) => void;
    /**
     * Props for an anchor CTA: `<a {...link({ source: 'hero' })}>`. The href
     * stays the no-JS fallback; a plain click opens the dialog instead and
     * returns focus to that anchor on close.
     */
    link: (
        options?: OrderDialogOptions,
        href?: string,
    ) => {
        href: string;
        onClick: (event: MouseEvent<HTMLElement>) => void;
    };
};

const OrderDialogContext = createContext<OrderDialogApi | null>(null);

/** The order pop-up for every CTA on the page. Throws without a provider. */
export function useOrderDialog(): OrderDialogApi {
    const api = useContext(OrderDialogContext);

    if (!api) {
        throw new Error(
            'useOrderDialog() needs an <OrderDialogProvider> above it (inside the <LandingDataProvider>).',
        );
    }

    return api;
}

type Session = { key: number; options: OrderDialogOptions };

/** Provides useOrderDialog() and renders the dialog (once) while it is open. */
export function OrderDialogProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const opener = useRef<HTMLElement | null>(null);
    const count = useRef(0);

    const api = useMemo<OrderDialogApi>(() => {
        const start = (
            options: OrderDialogOptions,
            from: Element | null,
        ): void => {
            opener.current = from instanceof HTMLElement ? from : null;
            count.current += 1;
            setSession({ key: count.current, options });
        };

        return {
            open: (options = {}) => start(options, document.activeElement),
            link: (options = {}, href = '#order') => ({
                href,
                onClick: (event) => {
                    // Let new-tab and new-window clicks follow the href.
                    if (
                        event.defaultPrevented ||
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                    ) {
                        return;
                    }

                    event.preventDefault();
                    start(options, event.currentTarget);
                },
            }),
        };
    }, []);

    const onClosed = () => {
        const target = opener.current;
        opener.current = null;
        // Unmount the dialog synchronously: its effect cleanup lifts `inert`
        // from the page, which must happen before focus can go back (a
        // deferred cleanup raced a requestAnimationFrame here, and focus
        // was lost to <body> after a submit).
        flushSync(() => setSession(null));

        if (target?.isConnected) {
            target.focus({ preventScroll: true });
        }
    };

    return (
        <OrderDialogContext value={api}>
            {children}
            {session ? (
                <OrderDialog
                    key={session.key}
                    options={session.options}
                    onClosed={onClosed}
                />
            ) : null}
        </OrderDialogContext>
    );
}

// ---------------------------------------------------------------------------

type OrderForm = {
    name: string;
    company: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    devices: string;
    plan: OrderPlan | '';
    message: string;
    consent: boolean;
    /** Honeypot: humans never see it. */
    website: string;
    source: LeadSource | null;
    /** The page's language: the server's messages come back in it. */
    locale: Locale;
};

type FieldName = Exclude<keyof OrderForm, 'website' | 'source' | 'locale'>;
type TextField = 'name' | 'company' | 'email' | 'phone' | 'country' | 'city';

/** Visible fields in page order: the first invalid one gets focus. */
const FIELDS: FieldName[] = [
    'name',
    'company',
    'email',
    'phone',
    'country',
    'city',
    'devices',
    'plan',
    'message',
    'consent',
];

const MESSAGE_MAX = 2000;
const DEVICES_MAX = 999;
const CLOSE_MS = 460;

/** Used only if the payload has no plans (it always has buy, lease, chain). */
const PLAN_FALLBACK = [
    { value: 'buy', name: 'order-dialog.buy', blurb: 'order-dialog.buyBlurb' },
    {
        value: 'lease',
        name: 'order-dialog.lease',
        blurb: 'order-dialog.leaseBlurb',
    },
    {
        value: 'chain',
        name: 'order-dialog.chain',
        blurb: 'order-dialog.chainBlurb',
    },
] as const;

/** Splits a message around a placeholder filled with an element (a link). */
const SLOT = '\u2063';

function aroundSlot(message: string): [before: string, after: string] {
    const at = message.indexOf(SLOT);

    return at === -1
        ? [message, '']
        : [message.slice(0, at), message.slice(at + SLOT.length)];
}

/**
 * A message part with the space at its edge as a text run of its own, the
 * way these English lines were first typeset (Chrome shapes each text node
 * on its own, so merging them would shift the line by a fraction of a pixel).
 */
function edgeSpace(text: string, edge: 'start' | 'end'): ReactNode {
    if (edge === 'start' && text.startsWith(' ')) {
        return [' ', text.slice(1)];
    }

    if (edge === 'end' && text.endsWith(' ')) {
        return [text.slice(0, -1), ' '];
    }

    return text;
}

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]';

function focusables(scope: HTMLElement): HTMLElement[] {
    return [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) =>
            element.tabIndex >= 0 &&
            !element.closest('[inert]') &&
            element.getClientRects().length > 0,
    );
}

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Glass text field; `invalid` swaps the ring to coral. */
function controlClass(invalid: boolean) {
    return cn(
        'block w-full min-w-0 rounded-[16px] bg-white/[0.05] px-4 text-base text-bone shadow-[inset_0_1px_0_oklch(1_0_0/0.05)] ring-1 ring-white/[0.14] transition-[box-shadow,background-color] duration-300 ease-glass ring-inset placeholder:text-smoke/70 autofill:shadow-[inset_0_0_0_60px_oklch(0.24_0.02_195)] autofill:[-webkit-text-fill-color:var(--color-bone)] hover:ring-white/25 focus-visible:bg-white/[0.08] focus-visible:ring-2 focus-visible:outline-none sm:text-[15px]',
        invalid
            ? 'ring-coral/70 hover:ring-coral/80 focus-visible:ring-coral/80'
            : 'focus-visible:ring-mint/70',
    );
}

function Required() {
    return (
        <span aria-hidden className="ms-0.5 text-mint">
            *
        </span>
    );
}

function FieldError({ id, error }: { id: string; error?: string }) {
    if (!error) {
        return null;
    }

    return (
        <p id={id} className="mt-2 text-[13px] leading-snug text-coral">
            {error}
        </p>
    );
}

function Field({
    id,
    label,
    error,
    aside,
    className,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    aside?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={className}>
            <div className="flex items-baseline justify-between gap-3">
                <label
                    htmlFor={id}
                    className="text-[13px] font-medium tracking-[0.01em] text-mist"
                >
                    {label}
                    <Required />
                </label>
                {aside}
            </div>
            <div className="mt-2">{children}</div>
            <FieldError id={`${id}-error`} error={error} />
        </div>
    );
}

/** "01 — You and your store": the same index-and-rule voice as SectionHeader. */
function Legend({ index, children }: { index: string; children: ReactNode }) {
    return (
        <legend className="pe-4 text-kicker font-medium text-smoke uppercase">
            <span className="text-bone">{index}</span>
            <span aria-hidden className="mx-3 text-white/25">
                —
            </span>
            {children}
        </legend>
    );
}

function OrderDialog({
    options,
    onClosed,
}: {
    options: OrderDialogOptions;
    onClosed: () => void;
}) {
    const { locale, t } = useI18n();
    const landing = useLanding();
    const title = useContent('order.dialog_title');
    const lede = useContent('order.dialog_lede');
    const consent = useContent('order.consent');
    const submitLabel = useContent('order.submit');
    const successTitle = useContent('order.success_title');
    const successBody = useContent('order.success_body');
    const contactEmail = useContent('contact.email');

    const base = useId();
    const fieldId = (name: string) => `${base}-${name}`;
    const titleId = fieldId('title');
    const ledeId = fieldId('lede');

    const form = useForm<OrderForm>({
        name: '',
        company: '',
        email: options.email?.trim() ?? '',
        phone: '',
        country: '',
        city: '',
        devices: '',
        plan: options.plan ?? '',
        message: '',
        consent: false,
        website: '',
        source: options.source ?? null,
        locale,
    });
    const errors: Partial<Record<string, string>> = form.errors;
    const invalidCount = FIELDS.filter((name) => errors[name]).length;

    const [state, setState] = useState<'open' | 'closed'>('closed');
    const [confirming, setConfirming] = useState(false);
    const [sent, setSent] = useState<OrderRequestFlash | null>(null);

    const root = useRef<HTMLDivElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const scroller = useRef<HTMLDivElement>(null);
    const confirmBox = useRef<HTMLDivElement>(null);
    const keepEditing = useRef<HTMLButtonElement>(null);
    const sentHeading = useRef<HTMLHeadingElement>(null);
    const beforeConfirm = useRef<HTMLElement | null>(null);
    const closing = useRef(false);

    const plans = landing.pricing.plans.length
        ? landing.pricing.plans.map((plan) => ({
              value: plan.key,
              name: plan.name,
              blurb: plan.blurb,
          }))
        : PLAN_FALLBACK.map((plan) => ({
              value: plan.value,
              name: t(plan.name),
              blurb: t(plan.blurb),
          }));
    const planOptions: { value: OrderPlan; name: string; blurb: string }[] = [
        ...plans,
        {
            value: 'unsure',
            name: t('order-dialog.unsure'),
            blurb: t('order-dialog.unsureBlurb'),
        },
    ];
    const privacy =
        landing.pages.find((page) => page.slug === 'privacy') ??
        landing.pages.find(
            (page) => page.group === 'legal' && /privacy/i.test(page.title),
        );

    const close = () => {
        if (closing.current) {
            return;
        }

        closing.current = true;
        setConfirming(false);
        setState('closed');
        window.setTimeout(onClosed, prefersReducedMotion() ? 0 : CLOSE_MS);
    };

    // Closing a form with something typed in it asks first.
    const requestClose = () => {
        if (sent === null && form.isDirty) {
            beforeConfirm.current =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;
            setConfirming(true);

            return;
        }

        close();
    };

    const cancelClose = () => {
        setConfirming(false);
        const target = beforeConfirm.current;
        beforeConfirm.current = null;
        requestAnimationFrame(() =>
            (target ?? panel.current)?.focus({ preventScroll: true }),
        );
    };

    const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();

            if (confirming) {
                cancelClose();
            } else {
                requestClose();
            }

            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        // Keep Tab inside the dialog (or inside the discard question).
        const scope = confirmBox.current ?? panel.current;

        if (!scope) {
            return;
        }

        const items = focusables(scope);
        const active = document.activeElement;

        if (items.length === 0) {
            event.preventDefault();
            scope.focus();

            return;
        }

        const first = items[0];
        const last = items[items.length - 1];

        if (
            !(active instanceof Node) ||
            active === scope ||
            !scope.contains(active)
        ) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    });

    // Desktop: straight into the first empty field. Touch: the dialog
    // itself, so the keyboard doesn't cover the form before it's read.
    const focusFirst = useEffectEvent(() => {
        const fine = window.matchMedia('(pointer: fine)').matches;
        const empty = fine
            ? (['name', 'company', 'email'] as const).find(
                  (name) => form.data[name] === '',
              )
            : undefined;
        const target = empty ? document.getElementById(fieldId(empty)) : null;

        (target ?? panel.current)?.focus({ preventScroll: true });
    });

    // While open: the rest of the page is inert and does not scroll, Tab
    // and Escape are handled here, and the panel animates in.
    useEffect(() => {
        const html = document.documentElement;
        const host = root.current;
        const others = [...document.body.children].filter(
            (element): element is HTMLElement =>
                element instanceof HTMLElement &&
                element !== host &&
                !element.inert &&
                element.tagName !== 'SCRIPT',
        );

        for (const element of others) {
            element.inert = true;
        }

        html.style.scrollbarGutter = 'stable';
        html.style.overflow = 'hidden';

        const handleKey = (event: KeyboardEvent) => onKeyDown(event);
        document.addEventListener('keydown', handleKey, true);

        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => setState('open'));
        });
        focusFirst();

        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('keydown', handleKey, true);

            for (const element of others) {
                element.inert = false;
            }

            html.style.overflow = '';
            html.style.scrollbarGutter = '';
        };
    }, []);

    useEffect(() => {
        if (confirming) {
            keepEditing.current?.focus();
        }
    }, [confirming]);

    useEffect(() => {
        if (sent) {
            scroller.current?.scrollTo({ top: 0 });
            sentHeading.current?.focus({ preventScroll: true });
        }
    }, [sent]);

    const setField = <K extends FieldName>(name: K, value: OrderForm[K]) => {
        form.setData((data) => ({ ...data, [name]: value }));

        if (errors[name]) {
            form.clearErrors(name);
        }
    };

    const text = (
        name: TextField,
        extra?: { dir?: 'ltr'; className?: string },
    ) => ({
        id: fieldId(name),
        name,
        value: form.data[name],
        required: true,
        dir: extra?.dir,
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
            setField(name, event.target.value),
        'aria-invalid': errors[name] ? true : undefined,
        'aria-describedby': errors[name] ? `${fieldId(name)}-error` : undefined,
        className: cn(
            'h-12',
            controlClass(Boolean(errors[name])),
            extra?.className,
        ),
    });

    const devices = Number.parseInt(form.data.devices, 10);
    const stepDevices = (delta: number) => {
        const next = Number.isNaN(devices)
            ? 1
            : Math.min(DEVICES_MAX, Math.max(1, devices + delta));
        setField('devices', String(next));
    };

    const focusError = (found: Record<string, string>) => {
        const name = FIELDS.find((field) => found[field]);

        if (!name) {
            scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });

            return;
        }

        const target =
            name === 'plan'
                ? panel.current?.querySelector<HTMLInputElement>(
                      `input[name="plan"]:checked, input[name="plan"]`,
                  )
                : document.getElementById(fieldId(name));
        target?.focus();
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (form.processing) {
            return;
        }

        form.submit(store(), {
            preserveScroll: true,
            preserveState: true,
            onFlash: (flash) => {
                const result = flash.orderRequest as
                    | OrderRequestFlash
                    | undefined;

                if (result) {
                    setSent({ reference: result.reference ?? null });
                }
            },
            onError: focusError,
        });
    };

    const planName =
        planOptions.find((option) => option.value === form.data.plan)?.name ??
        '';
    const place =
        form.data.city && form.data.country
            ? t('order-dialog.placeValue', {
                  city: form.data.city,
                  country: form.data.country,
              })
            : form.data.city || form.data.country;
    const [quoteBefore, quoteAfter] = aroundSlot(
        t('order-dialog.quote', { email: SLOT }),
    );
    const [privacyBefore, privacyAfter] = aroundSlot(
        t('order-dialog.privacyLink', { title: SLOT }),
    );
    // Email and phone read left to right, lined up with the Arabic labels.
    const latinInput = { dir: 'ltr', className: 'rtl:text-right' } as const;

    return createPortal(
        <div
            ref={root}
            data-state={state}
            className="landing group/dialog fixed inset-0 z-[80] flex flex-col justify-end font-sans text-bone antialiased sm:items-center sm:justify-center sm:p-6"
        >
            {/* The page, dimmed and softened; a click asks to close. */}
            <div
                aria-hidden
                onClick={requestClose}
                className="absolute inset-0 bg-[oklch(0.1_0.012_200/0.72)] backdrop-blur-[3px] transition-opacity duration-500 ease-glass group-data-[state=closed]/dialog:opacity-0"
            />

            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={sent ? undefined : ledeId}
                tabIndex={-1}
                className={cn(
                    'glass-rim relative flex h-[calc(100dvh-0.5rem)] w-full flex-col overflow-hidden rounded-t-[28px] glass-strong outline-none sm:h-auto sm:max-h-[min(880px,calc(100svh-3rem))] sm:max-w-[720px] sm:rounded-[32px]',
                    'transition-[translate,scale,opacity] duration-500 ease-glass',
                    'group-data-[state=closed]/dialog:translate-y-full sm:group-data-[state=closed]/dialog:translate-y-4 sm:group-data-[state=closed]/dialog:scale-[0.98] sm:group-data-[state=closed]/dialog:opacity-0',
                )}
            >
                <Glow
                    color="jade"
                    className="-top-52 -left-44 size-[30rem] opacity-30"
                />
                <Glow
                    color="lagoon"
                    className="-right-40 -bottom-56 size-[28rem] opacity-25"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 grain opacity-[0.05] mix-blend-overlay"
                />

                <div className="flex items-center gap-4 px-6 pt-5 pb-2 sm:px-10 sm:pt-7">
                    <p className="text-kicker font-medium text-bone uppercase">
                        {sent
                            ? t('order-dialog.kickerSent')
                            : t('order-dialog.kicker')}
                    </p>
                    <span aria-hidden className="h-px flex-1 bg-white/15" />
                    <button
                        type="button"
                        onClick={requestClose}
                        aria-label={t('order-dialog.close')}
                        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-mist glass-thin transition-[color,background-color] duration-300 ease-glass hover:bg-white/[0.16] hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                    >
                        <X aria-hidden className="size-4" />
                    </button>
                </div>

                {sent ? (
                    <>
                        <div
                            ref={scroller}
                            className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:oklch(1_0_0/0.18)_transparent] overflow-y-auto overscroll-contain px-6 pt-5 pb-10 sm:px-10 sm:pt-7"
                        >
                            <span
                                aria-hidden
                                className="grid size-11 place-items-center rounded-full bg-mint text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.6),0_12px_30px_-10px_oklch(0.84_0.12_160/0.6)]"
                            >
                                <Check className="size-5" strokeWidth={2.5} />
                            </span>
                            <h2
                                ref={sentHeading}
                                id={titleId}
                                tabIndex={-1}
                                className="mt-6 font-display text-[2.5rem] leading-[1.02] font-medium tracking-[-0.02em] text-balance text-bone outline-none sm:text-[3.25rem] rtl:leading-[1.3] [&_em]:font-normal [&_em]:text-mint"
                            >
                                <Accent text={successTitle} />
                            </h2>
                            <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-pretty text-mist">
                                {successBody}
                            </p>

                            <Receipt
                                reference={sent.reference}
                                rows={[
                                    {
                                        term: t('order-dialog.store'),
                                        value: form.data.company,
                                    },
                                    {
                                        term: t('order-dialog.place'),
                                        value: place,
                                    },
                                    {
                                        term: t('order-dialog.deviceCount'),
                                        value: form.data.devices,
                                    },
                                    {
                                        term: t('order-dialog.planChosen'),
                                        value: planName,
                                    },
                                ]}
                            />

                            {sent.reference && contactEmail ? (
                                <p className="mt-5 text-[14px] leading-relaxed text-smoke">
                                    {edgeSpace(quoteBefore, 'end')}
                                    <a
                                        href={`mailto:${contactEmail}`}
                                        className="text-bone underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-mint focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none rtl:bidi-ltr"
                                    >
                                        {contactEmail}
                                    </a>
                                    {quoteAfter}
                                </p>
                            ) : null}
                        </div>

                        <div className="border-t border-white/10 bg-[oklch(0.16_0.016_200/0.5)] px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:px-10 sm:py-5">
                            <button
                                type="button"
                                onClick={close}
                                className={cn(
                                    cta({ variant: 'primary', size: 'lg' }),
                                    'w-full sm:w-auto sm:min-w-40',
                                )}
                            >
                                {t('order-dialog.close')}
                            </button>
                        </div>
                    </>
                ) : (
                    <form
                        noValidate
                        onSubmit={onSubmit}
                        inert={confirming}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div
                            ref={scroller}
                            className="min-h-0 flex-1 scroll-pt-6 scroll-pb-10 [scrollbar-width:thin] [scrollbar-color:oklch(1_0_0/0.18)_transparent] overflow-y-auto overscroll-contain px-6 pt-5 pb-10 sm:px-10 sm:pt-7"
                        >
                            <h2
                                id={titleId}
                                className="font-display text-[2.5rem] leading-[1.02] font-medium tracking-[-0.02em] text-balance text-bone sm:text-[3.25rem] rtl:leading-[1.3] [&_em]:font-normal [&_em]:text-mint"
                            >
                                <Accent text={title} />
                            </h2>
                            <p
                                id={ledeId}
                                className="mt-4 max-w-[46ch] text-base leading-relaxed text-pretty text-mist"
                            >
                                {lede}
                            </p>

                            {errors.form ? (
                                <p
                                    role="alert"
                                    className="mt-7 rounded-[16px] bg-coral/[0.08] px-4 py-3.5 text-[14px] leading-snug text-bone ring-1 ring-coral/40 ring-inset"
                                >
                                    {errors.form}
                                </p>
                            ) : null}

                            <fieldset className="mt-9 min-w-0 border-t border-white/10 pt-2">
                                <Legend index="01">
                                    {t('order-dialog.partStore')}
                                </Legend>
                                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                                    <Field
                                        id={fieldId('name')}
                                        label={t('order-dialog.name')}
                                        error={errors.name}
                                    >
                                        <input
                                            type="text"
                                            autoComplete="name"
                                            maxLength={120}
                                            {...text('name')}
                                        />
                                    </Field>
                                    <Field
                                        id={fieldId('company')}
                                        label={t('order-dialog.company')}
                                        error={errors.company}
                                    >
                                        <input
                                            type="text"
                                            autoComplete="organization"
                                            maxLength={160}
                                            {...text('company')}
                                        />
                                    </Field>
                                    <Field
                                        id={fieldId('email')}
                                        label={t('order-dialog.email')}
                                        error={errors.email}
                                    >
                                        <input
                                            type="email"
                                            inputMode="email"
                                            autoComplete="email"
                                            maxLength={190}
                                            placeholder={t(
                                                'order-dialog.emailPlaceholder',
                                            )}
                                            {...text('email', latinInput)}
                                        />
                                    </Field>
                                    <Field
                                        id={fieldId('phone')}
                                        label={t('order-dialog.phone')}
                                        error={errors.phone}
                                    >
                                        <input
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            maxLength={40}
                                            placeholder={t(
                                                'order-dialog.phonePlaceholder',
                                            )}
                                            {...text('phone', latinInput)}
                                        />
                                    </Field>
                                    <Field
                                        id={fieldId('country')}
                                        label={t('order-dialog.country')}
                                        error={errors.country}
                                    >
                                        <input
                                            type="text"
                                            autoComplete="country-name"
                                            maxLength={80}
                                            {...text('country')}
                                        />
                                    </Field>
                                    <Field
                                        id={fieldId('city')}
                                        label={t('order-dialog.city')}
                                        error={errors.city}
                                    >
                                        <input
                                            type="text"
                                            autoComplete="address-level2"
                                            maxLength={80}
                                            {...text('city')}
                                        />
                                    </Field>
                                </div>
                            </fieldset>

                            <fieldset className="mt-11 min-w-0 border-t border-white/10 pt-2">
                                <Legend index="02">
                                    {t('order-dialog.partOrder')}
                                </Legend>

                                <div className="mt-5">
                                    <div className="flex items-center justify-between gap-5">
                                        <div className="min-w-0">
                                            <label
                                                htmlFor={fieldId('devices')}
                                                className="text-[13px] font-medium tracking-[0.01em] text-mist"
                                            >
                                                {t('order-dialog.devices')}
                                                <Required />
                                            </label>
                                            <p
                                                id={fieldId('devices-hint')}
                                                className="mt-1 text-[13px] leading-snug text-pretty text-smoke"
                                            >
                                                {t('order-dialog.devicesHint')}
                                            </p>
                                        </div>
                                        <div
                                            className={cn(
                                                'flex h-12 shrink-0 items-center rounded-[16px] bg-white/[0.05] shadow-[inset_0_1px_0_oklch(1_0_0/0.05)] ring-1 ring-inset',
                                                errors.devices
                                                    ? 'ring-coral/70 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-coral/80'
                                                    : 'ring-white/[0.14] has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-mint/70',
                                            )}
                                        >
                                            <StepButton
                                                label={t(
                                                    'order-dialog.devicesFewer',
                                                )}
                                                disabled={
                                                    Number.isNaN(devices) ||
                                                    devices <= 1
                                                }
                                                onClick={() => stepDevices(-1)}
                                            >
                                                <Minus
                                                    aria-hidden
                                                    className="size-4"
                                                />
                                            </StepButton>
                                            <input
                                                id={fieldId('devices')}
                                                name="devices"
                                                dir="ltr"
                                                type="number"
                                                inputMode="numeric"
                                                min={1}
                                                max={DEVICES_MAX}
                                                step={1}
                                                required
                                                value={form.data.devices}
                                                onChange={(event) =>
                                                    setField(
                                                        'devices',
                                                        event.target.value,
                                                    )
                                                }
                                                aria-invalid={
                                                    errors.devices
                                                        ? true
                                                        : undefined
                                                }
                                                aria-describedby={
                                                    errors.devices
                                                        ? `${fieldId('devices-hint')} ${fieldId('devices')}-error`
                                                        : fieldId(
                                                              'devices-hint',
                                                          )
                                                }
                                                className="h-full w-14 [appearance:textfield] bg-transparent text-center text-base font-medium text-bone tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                            <StepButton
                                                label={t(
                                                    'order-dialog.devicesMore',
                                                )}
                                                disabled={
                                                    !Number.isNaN(devices) &&
                                                    devices >= DEVICES_MAX
                                                }
                                                onClick={() => stepDevices(1)}
                                            >
                                                <Plus
                                                    aria-hidden
                                                    className="size-4"
                                                />
                                            </StepButton>
                                        </div>
                                    </div>
                                    <FieldError
                                        id={`${fieldId('devices')}-error`}
                                        error={errors.devices}
                                    />
                                </div>

                                <fieldset className="mt-7 min-w-0">
                                    <legend className="text-[13px] font-medium tracking-[0.01em] text-mist">
                                        {t('order-dialog.plan')}
                                        <Required />
                                    </legend>
                                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                                        {planOptions.map((option) => (
                                            <label
                                                key={option.value}
                                                className={cn(
                                                    'group/plan relative flex cursor-pointer items-start gap-3.5 rounded-[18px] bg-white/[0.04] p-4 ring-1 transition-[background-color,box-shadow] duration-300 ease-glass ring-inset hover:bg-white/[0.07] has-[:checked]:bg-mint/[0.08] has-[:checked]:ring-mint/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-mint/80',
                                                    errors.plan
                                                        ? 'ring-coral/60'
                                                        : 'ring-white/[0.12]',
                                                )}
                                            >
                                                <input
                                                    type="radio"
                                                    name="plan"
                                                    value={option.value}
                                                    checked={
                                                        form.data.plan ===
                                                        option.value
                                                    }
                                                    onChange={() =>
                                                        setField(
                                                            'plan',
                                                            option.value,
                                                        )
                                                    }
                                                    required
                                                    aria-invalid={
                                                        errors.plan
                                                            ? true
                                                            : undefined
                                                    }
                                                    aria-describedby={
                                                        errors.plan
                                                            ? `${fieldId('plan')}-error`
                                                            : undefined
                                                    }
                                                    className="peer sr-only"
                                                />
                                                <span
                                                    aria-hidden
                                                    className="mt-px grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-white/30 transition-[background-color,box-shadow] duration-300 ease-glass ring-inset peer-checked:bg-mint peer-checked:ring-mint"
                                                >
                                                    <Check
                                                        strokeWidth={3}
                                                        className="size-3 text-ink opacity-0 transition-opacity duration-300 group-has-[:checked]/plan:opacity-100"
                                                    />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-[15px] leading-tight font-medium text-bone">
                                                        {option.name}
                                                    </span>
                                                    <span className="mt-1.5 block text-[13px] leading-snug text-pretty text-mist">
                                                        {option.blurb}
                                                    </span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <FieldError
                                        id={`${fieldId('plan')}-error`}
                                        error={errors.plan}
                                    />
                                </fieldset>

                                <Field
                                    id={fieldId('message')}
                                    label={t('order-dialog.message')}
                                    error={errors.message}
                                    className="mt-7"
                                    aside={
                                        <span
                                            aria-hidden
                                            className="text-[12px] text-smoke tabular-nums bidi-ltr"
                                        >
                                            {form.data.message.length} /{' '}
                                            {MESSAGE_MAX}
                                        </span>
                                    }
                                >
                                    <textarea
                                        id={fieldId('message')}
                                        name="message"
                                        rows={4}
                                        required
                                        minLength={10}
                                        maxLength={MESSAGE_MAX}
                                        value={form.data.message}
                                        onChange={(event) =>
                                            setField(
                                                'message',
                                                event.target.value,
                                            )
                                        }
                                        placeholder={t(
                                            'order-dialog.messagePlaceholder',
                                        )}
                                        aria-invalid={
                                            errors.message ? true : undefined
                                        }
                                        aria-describedby={
                                            errors.message
                                                ? `${fieldId('message')}-error`
                                                : undefined
                                        }
                                        className={cn(
                                            'min-h-32 resize-y py-3 leading-relaxed',
                                            controlClass(
                                                Boolean(errors.message),
                                            ),
                                        )}
                                    />
                                </Field>

                                <div className="mt-7">
                                    <div className="flex items-start gap-3.5">
                                        <span className="relative mt-0.5 grid size-5 shrink-0">
                                            <input
                                                id={fieldId('consent')}
                                                name="consent"
                                                type="checkbox"
                                                required
                                                checked={form.data.consent}
                                                onChange={(event) =>
                                                    setField(
                                                        'consent',
                                                        event.target.checked,
                                                    )
                                                }
                                                aria-invalid={
                                                    errors.consent
                                                        ? true
                                                        : undefined
                                                }
                                                aria-describedby={
                                                    errors.consent
                                                        ? `${fieldId('consent')}-error`
                                                        : undefined
                                                }
                                                className={cn(
                                                    'peer size-5 cursor-pointer appearance-none rounded-[6px] bg-white/[0.05] ring-1 transition-[background-color,box-shadow] duration-300 ease-glass ring-inset checked:bg-mint checked:ring-mint focus-visible:ring-2 focus-visible:ring-mint/80 focus-visible:outline-none',
                                                    errors.consent
                                                        ? 'ring-coral/70'
                                                        : 'ring-white/30',
                                                )}
                                            />
                                            <Check
                                                aria-hidden
                                                strokeWidth={3}
                                                className="pointer-events-none absolute inset-0 m-auto size-3.5 text-ink opacity-0 transition-opacity duration-300 peer-checked:opacity-100"
                                            />
                                        </span>
                                        <div className="min-w-0 text-[14px] leading-relaxed text-pretty text-mist">
                                            <label
                                                htmlFor={fieldId('consent')}
                                                className="cursor-pointer"
                                            >
                                                {consent}
                                                <Required />
                                            </label>
                                            {privacy ? (
                                                <a
                                                    href={privacy.url}
                                                    target="_blank"
                                                    rel="noopener"
                                                    className="mt-1 block w-fit text-[13px] text-smoke underline decoration-white/20 underline-offset-4 transition-colors hover:text-bone hover:decoration-mint focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                                >
                                                    {privacyBefore}
                                                    {privacy.title}
                                                    {edgeSpace(
                                                        privacyAfter,
                                                        'start',
                                                    )}
                                                    <ArrowUpRight
                                                        aria-hidden
                                                        className="ms-1 inline size-3.5 align-[-2px] rtl:-scale-x-100"
                                                    />
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                    <FieldError
                                        id={`${fieldId('consent')}-error`}
                                        error={errors.consent}
                                    />
                                </div>
                            </fieldset>

                            {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
                            <div
                                aria-hidden
                                className="absolute -start-[10000px] size-px overflow-hidden"
                            >
                                <label htmlFor={fieldId('website')}>
                                    {t('order-dialog.honeypot')}
                                </label>
                                <input
                                    id={fieldId('website')}
                                    name="website"
                                    type="text"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={form.data.website}
                                    onChange={(event) =>
                                        form.setData(
                                            'website',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="border-t border-white/10 bg-[oklch(0.16_0.016_200/0.5)] px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-5">
                            <div className="flex items-center justify-between gap-x-6 gap-y-3 max-sm:flex-col max-sm:items-stretch">
                                <p
                                    aria-live="polite"
                                    className={cn(
                                        'text-[13px] leading-snug',
                                        invalidCount
                                            ? 'text-coral max-sm:text-center'
                                            : 'text-smoke max-sm:hidden',
                                    )}
                                >
                                    {invalidCount === 0
                                        ? t('order-dialog.allRequired')
                                        : invalidCount === 1
                                          ? t('order-dialog.checkOne')
                                          : t('order-dialog.checkMany', {
                                                count: invalidCount,
                                            })}
                                </p>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    aria-disabled={form.processing}
                                    className={cn(
                                        cta({ variant: 'primary', size: 'lg' }),
                                        'group/submit cursor-pointer max-sm:w-full',
                                    )}
                                >
                                    {form.processing ? (
                                        <>
                                            <LoaderCircle
                                                aria-hidden
                                                className="size-4 animate-spin"
                                            />
                                            {t('order-dialog.sending')}
                                        </>
                                    ) : (
                                        <>
                                            {submitLabel}
                                            <ArrowRight
                                                aria-hidden
                                                className="size-4 transition-transform duration-[380ms] ease-glass group-hover/submit:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/submit:-translate-x-0.5"
                                            />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {confirming ? (
                    <div className="absolute inset-0 z-20 flex items-end justify-center bg-[oklch(0.1_0.012_200/0.55)] p-4 backdrop-blur-[2px] sm:items-center sm:p-8">
                        <div
                            ref={confirmBox}
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby={fieldId('discard-title')}
                            aria-describedby={fieldId('discard-body')}
                            className="glass-rim relative w-full max-w-[26rem] rounded-[24px] p-6 glass-strong sm:p-7"
                        >
                            <p
                                id={fieldId('discard-title')}
                                className="font-display text-[1.75rem] leading-tight font-medium text-bone"
                            >
                                {t('order-dialog.discardTitle')}
                            </p>
                            <p
                                id={fieldId('discard-body')}
                                className="mt-2 text-[15px] leading-relaxed text-pretty text-mist"
                            >
                                {t('order-dialog.discardBody')}
                            </p>
                            <div className="mt-6 flex gap-3 max-sm:flex-col">
                                <button
                                    ref={keepEditing}
                                    type="button"
                                    onClick={cancelClose}
                                    className={cn(
                                        cta({ variant: 'primary', size: 'md' }),
                                        'cursor-pointer sm:flex-1',
                                    )}
                                >
                                    {t('order-dialog.keepEditing')}
                                </button>
                                <button
                                    type="button"
                                    onClick={close}
                                    className={cn(
                                        cta({ variant: 'glass', size: 'md' }),
                                        'cursor-pointer sm:flex-1',
                                    )}
                                >
                                    {t('order-dialog.discard')}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>,
        document.body,
    );
}

function StepButton({
    label,
    disabled,
    onClick,
    children,
}: {
    label: string;
    disabled: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    // The input takes arrow keys; these are pointer conveniences.
    return (
        <button
            type="button"
            tabIndex={-1}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="grid size-12 cursor-pointer place-items-center rounded-[16px] text-mist transition-colors duration-300 ease-glass hover:text-bone disabled:cursor-default disabled:opacity-35"
        >
            {children}
        </button>
    );
}

/** Where the ticket is perforated (the height of its reference block). */
const PERFORATION = '7.25rem';

const ticketMask: CSSProperties = {
    mask: `radial-gradient(circle 11px at 0 ${PERFORATION}, transparent 10.5px, #000 11px), radial-gradient(circle 11px at 100% ${PERFORATION}, transparent 10.5px, #000 11px)`,
    maskComposite: 'intersect',
    WebkitMaskComposite: 'source-in',
};

/** The reference, set like a ticket stub, over what was sent. */
function Receipt({
    reference,
    rows,
}: {
    reference: string | null;
    rows: { term: string; value: string }[];
}) {
    const { t } = useI18n();
    const [copied, copy] = useClipboard();
    const filled = rows.filter((row) => row.value !== '');

    return (
        <div
            className="relative mt-8 rounded-[22px] bg-white/[0.06] shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] ring-1 ring-white/[0.14] ring-inset"
            style={reference ? ticketMask : undefined}
        >
            {reference ? (
                <>
                    <div className="flex h-[7.25rem] items-center justify-between gap-4 px-6 sm:px-7">
                        <div className="min-w-0">
                            <p className="text-kicker font-medium text-smoke uppercase">
                                {t('order-dialog.reference')}
                            </p>
                            <p
                                dir="ltr"
                                className="mt-2.5 font-display text-[1.875rem] leading-none font-medium tracking-[0.01em] whitespace-nowrap text-bone tabular-nums sm:text-[2.5rem] rtl:text-right"
                            >
                                {reference}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void copy(reference)}
                            aria-label={
                                copied === reference
                                    ? t('order-dialog.copiedLabel')
                                    : t('order-dialog.copyLabel')
                            }
                            className={cn(
                                cta({ variant: 'glass', size: 'sm' }),
                                'cursor-pointer max-sm:size-10 max-sm:px-0',
                            )}
                        >
                            {copied === reference ? (
                                <Check aria-hidden className="size-4" />
                            ) : (
                                <Copy aria-hidden className="size-4" />
                            )}
                            <span aria-hidden className="max-sm:hidden">
                                {copied === reference
                                    ? t('order-dialog.copied')
                                    : t('order-dialog.copy')}
                            </span>
                        </button>
                    </div>
                    <div
                        aria-hidden
                        className="absolute inset-x-6 border-t border-dashed border-white/20"
                        style={{ top: PERFORATION }}
                    />
                </>
            ) : null}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto_auto] sm:gap-x-8 sm:px-7">
                {filled.map((row) => (
                    <div key={row.term} className="min-w-0">
                        <dt className="text-kicker font-medium text-smoke uppercase">
                            {row.term}
                        </dt>
                        <dd className="mt-1.5 text-[15px] leading-snug [overflow-wrap:anywhere] text-bone">
                            {row.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
