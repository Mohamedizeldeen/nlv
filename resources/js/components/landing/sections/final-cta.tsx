import { Link } from '@inertiajs/react';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { useState } from 'react';
import type { ChangeEvent, CSSProperties, FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '../brand';
import { IMAGES } from '../images';
import { useLandingLinks } from '../links';
import { Photo } from '../photo';
import { Arabic, Container, Glow, Reveal, cta } from '../primitives';

// Placeholder content: replace before launch. -----------------------------

/** Lookbook captions for the three fanned cards, in IMAGES.finalCta.looks order. */
const LOOK_CAPTIONS = [
    { number: '14', piece: 'Ivory hijab, pearl drops', city: 'Doha' },
    { number: '22', piece: 'Silk carré, navy', city: 'Kuwait City' },
    { number: '31', piece: 'Round gold frames, 46 mm', city: 'Manama' },
] as const;

/** The stage background is a fabric swatch; the caption says which. */
const BACKDROP_CAPTION = 'Backdrop: silk charmeuse, dusk rose';

// -------------------------------------------------------------------------

/*
 * Fan geometry. Each card rests at (--r) and, when the stage is hovered or
 * the demo is booked, opens to (--fr, --fx, --fy). Positions are classes so
 * the phone and desktop fans can differ.
 */
const FAN = [
    {
        place: 'left-[3%] top-[16%] w-[35%] lg:top-[20%] lg:left-[-13%] lg:w-[47%] z-[1]',
        // This card's left edge slides under the glass panel, so its caption
        // starts past the tucked strip.
        caption: 'lg:left-[22%]',
        style: {
            '--r': '-8deg',
            '--fr': '-12deg',
            '--fx': '-2%',
            '--fy': '6%',
        },
    },
    {
        place: 'left-[33%] top-0 w-[35%] lg:top-[-7%] lg:left-[24%] lg:w-[47%] z-[3]',
        caption: '',
        style: { '--r': '-1deg', '--fr': '-2deg', '--fx': '0%', '--fy': '-5%' },
    },
    {
        place: 'left-[62%] top-[14%] w-[35%] lg:top-[28%] lg:left-[52%] lg:w-[47%] z-[2]',
        caption: '',
        style: { '--r': '6deg', '--fr': '10deg', '--fx': '9%', '--fy': '2%' },
    },
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;

function validate(value: string): string | null {
    const email = value.trim();

    if (!email) {
        return 'Enter your work email and we’ll send you a time.';
    }

    if (!EMAIL_PATTERN.test(email)) {
        return 'That address looks incomplete. Try name@yourstore.com.';
    }

    return null;
}

export default function FinalCta() {
    const [booked, setBooked] = useState<string | null>(null);
    const [refocus, setRefocus] = useState(false);

    return (
        <section id="demo" className="relative isolate py-24 md:py-36">
            <Container>
                <Reveal>
                    <div
                        data-open={booked !== null}
                        className="group/fan relative mt-12 lg:mt-0"
                    >
                        <Backdrop />

                        <div className="relative grid p-3 sm:p-4 lg:grid-cols-12 lg:gap-x-8 lg:p-5">
                            <div className="glass-rim relative z-20 rounded-[24px] p-6 glass-strong max-lg:-mt-16 sm:p-10 md:rounded-[28px] lg:col-span-7 lg:p-12 lg:pr-16 xl:p-14 xl:pr-20">
                                <div className="flex items-center gap-4">
                                    <p className="text-kicker font-medium text-bone uppercase">
                                        Book a demo
                                    </p>
                                    <span
                                        aria-hidden
                                        className="h-px flex-1 bg-white/15"
                                    />
                                    <Arabic className="text-lg leading-none text-champagne">
                                        ابدأ الآن
                                    </Arabic>
                                </div>

                                <h2 className="mt-8 font-display text-display-lg font-medium text-balance text-bone md:mt-10 [&_em]:font-normal [&_em]:text-champagne">
                                    Your next customer is already{' '}
                                    <em className="sm:whitespace-nowrap">
                                        in front of a screen.
                                    </em>
                                </h2>
                                <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-pretty text-mist">
                                    See {BRAND.name} on your own catalogue in a
                                    20-minute call. We’ll bring a kiosk to your
                                    store if you’re in the Gulf.
                                </p>

                                <div
                                    role="status"
                                    aria-live="polite"
                                    className="empty:hidden"
                                >
                                    {booked !== null ? (
                                        <Confirmation
                                            email={booked}
                                            onReset={() => {
                                                setBooked(null);
                                                setRefocus(true);
                                            }}
                                        />
                                    ) : null}
                                </div>
                                {booked === null ? (
                                    <DemoForm
                                        focusOnMount={refocus}
                                        onBooked={(email) => {
                                            setBooked(email);
                                            setRefocus(false);
                                        }}
                                    />
                                ) : null}

                                <PanelFooter />
                            </div>

                            <LooksFan className="max-lg:order-first lg:col-span-5" />
                        </div>
                    </div>
                </Reveal>
            </Container>
        </section>
    );
}

/** Rose satin, softened as if seen through frosted glass, with two lights. */
function Backdrop() {
    const backdrop = IMAGES.finalCta.backdrop;

    return (
        <div
            aria-hidden
            className="absolute inset-0 isolate overflow-hidden rounded-[28px] ring-1 ring-white/12 ring-inset md:rounded-[36px]"
        >
            <Photo
                id={backdrop.id}
                alt=""
                widths={[640, 960, 1280]}
                sizes="(min-width: 1320px) 1224px, 92vw"
                className="absolute inset-0 size-full scale-110 blur-md brightness-[0.72] saturate-[0.9]"
                style={{
                    objectPosition: `${backdrop.focus[0] * 100}% ${backdrop.focus[1] * 100}%`,
                }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,oklch(0.145_0.018_285/0.55),oklch(0.145_0.018_285/0.2)_55%,oklch(0.145_0.018_285/0.45))]" />
            <Glow
                color="amethyst"
                className="-top-48 -left-32 z-0 size-[36rem] opacity-55"
            />
            <Glow
                color="coral"
                className="-right-24 -bottom-56 z-0 size-[34rem] opacity-50"
            />
            <div className="absolute inset-0 grain opacity-[0.07] mix-blend-overlay" />
        </div>
    );
}

function DemoForm({
    focusOnMount,
    onBooked,
}: {
    focusOnMount: boolean;
    onBooked: (email: string) => void;
}) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [attempted, setAttempted] = useState(false);
    const [input, setInput] = useState<HTMLInputElement | null>(null);

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);

        // Only nag after the first submit, then clear as soon as it's valid.
        if (attempted) {
            setError(validate(event.target.value));
        }
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const problem = validate(email);
        setAttempted(true);
        setError(problem);

        if (problem) {
            input?.focus();

            return;
        }

        // TODO: connect to backend (POST the address to the demo-request endpoint).
        onBooked(email.trim());
    };

    return (
        <form noValidate onSubmit={onSubmit} className="mt-9">
            <label htmlFor="demo-email" className="sr-only">
                Work email
            </label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                    ref={(node) => {
                        setInput(node);

                        if (node && focusOnMount) {
                            node.focus();
                        }
                    }}
                    id="demo-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    placeholder="you@yourstore.com"
                    value={email}
                    onChange={onChange}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'demo-email-error' : undefined}
                    className={cn(
                        'h-14 w-full min-w-0 rounded-[20px] px-5 text-base text-bone glass-thin transition-shadow duration-300 ease-glass placeholder:text-smoke focus-visible:ring-2 focus-visible:outline-none sm:col-start-1 sm:row-start-1',
                        error
                            ? 'ring-1 ring-coral/80 focus-visible:ring-coral/80'
                            : 'focus-visible:ring-champagne/70',
                    )}
                />
                <p
                    id="demo-email-error"
                    className={cn(
                        'flex items-start gap-2 text-[14px] leading-snug text-bone sm:col-span-2 sm:row-start-2',
                        error ? 'max-sm:-mt-0.5 max-sm:mb-1' : 'sr-only',
                    )}
                >
                    {error ? (
                        <>
                            <span
                                aria-hidden
                                className="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-coral"
                            />
                            {error}
                        </>
                    ) : null}
                </p>
                <button
                    type="submit"
                    className={cn(
                        cta({ variant: 'gold', size: 'lg' }),
                        'group/submit sm:col-start-2 sm:row-start-1',
                    )}
                >
                    Book a demo
                    <ArrowRight
                        aria-hidden
                        className="size-4 transition-transform duration-[380ms] ease-glass group-hover/submit:translate-x-0.5"
                    />
                </button>
            </div>
        </form>
    );
}

function Confirmation({
    email,
    onReset,
}: {
    email: string;
    onReset: () => void;
}) {
    return (
        <div
            ref={(node) => node?.focus()}
            tabIndex={-1}
            className="mt-9 flex items-start gap-4 rounded-[20px] bg-white/[0.05] p-5 ring-1 ring-champagne/30 focus:outline-none sm:p-6"
        >
            <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-champagne text-ink"
            >
                <Check className="size-4" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
                <p className="font-display text-[1.5rem] leading-tight font-medium text-bone">
                    Thank you.
                </p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-pretty text-mist">
                    We’ll reply within one business day, in Arabic or English.
                </p>
                <p className="mt-3 text-[13px] text-smoke">
                    Sent from{' '}
                    <span className="[overflow-wrap:anywhere] text-mist">
                        {email}
                    </span>
                    <span
                        aria-hidden
                        className="mx-2 text-white/20 max-sm:hidden"
                    >
                        ·
                    </span>
                    <br className="sm:hidden" />
                    <button
                        type="button"
                        onClick={onReset}
                        className="cursor-pointer text-mist underline decoration-white/25 underline-offset-4 transition-colors hover:text-bone hover:decoration-champagne focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none"
                    >
                        Use a different address
                    </button>
                </p>
            </div>
        </div>
    );
}

function PanelFooter() {
    const { start } = useLandingLinks();

    return (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-[14px]">
            <p className="text-smoke">
                Prefer email?{' '}
                <a
                    href={`mailto:${BRAND.email}`}
                    className="text-bone underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-champagne focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none"
                >
                    {BRAND.email}
                </a>
            </p>
            <Link
                href={start}
                className="group inline-flex items-center gap-1.5 text-mist transition-colors hover:text-bone focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-champagne/70 focus-visible:outline-none"
            >
                Or start the 14-day trial
                <ArrowUpRight
                    aria-hidden
                    className="size-4 transition-transform duration-[380ms] ease-glass group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
            </Link>
        </div>
    );
}

/** Three looks, dealt like cards; the first slides under the glass panel. */
function LooksFan({ className }: { className?: string }) {
    const looks = IMAGES.finalCta.looks;

    return (
        <div
            className={cn(
                'relative z-10 h-[200px] max-lg:-mt-12 sm:h-[280px] lg:h-auto',
                className,
            )}
        >
            {looks.map((image, index) => {
                const caption = LOOK_CAPTIONS[index];
                const fan = FAN[index];

                return (
                    <figure
                        key={image.id}
                        style={fan.style as CSSProperties}
                        className={cn(
                            'absolute [rotate:var(--r)] transition-[rotate,translate] duration-700 ease-glass',
                            'group-hover/fan:[translate:var(--fx)_var(--fy)] group-hover/fan:[rotate:var(--fr)] group-data-[open=true]/fan:[translate:var(--fx)_var(--fy)] group-data-[open=true]/fan:[rotate:var(--fr)]',
                            fan.place,
                        )}
                    >
                        <div className="relative overflow-hidden rounded-[14px] shadow-[0_40px_60px_-30px_oklch(0_0_0/0.9),0_0_0_1px_oklch(1_0_0/0.14)] sm:rounded-[20px]">
                            <Photo
                                id={image.id}
                                alt={image.alt}
                                ratio={1.25}
                                focus={image.focus}
                                widths={[240, 360, 480]}
                                sizes="(min-width: 1024px) 240px, 34vw"
                                className="aspect-[4/5] w-full"
                            />
                            <div
                                aria-hidden
                                className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink/80 to-transparent"
                            />
                            <figcaption
                                className={cn(
                                    'absolute inset-x-1.5 bottom-1.5 rounded-[10px] px-2 py-1.5 glass-thin sm:inset-x-2.5 sm:bottom-2.5 sm:rounded-[12px] sm:px-3 sm:py-2',
                                    fan.caption,
                                )}
                            >
                                <span className="block truncate text-[9px] font-medium tracking-[0.2em] text-mist uppercase sm:text-[10px]">
                                    Look {caption.number}
                                    <span className="max-sm:hidden lg:max-xl:hidden">
                                        {' '}
                                        · {caption.city}
                                    </span>
                                </span>
                                <span className="mt-0.5 block truncate text-[12px] text-bone max-sm:hidden lg:max-xl:hidden">
                                    {caption.piece}
                                </span>
                            </figcaption>
                        </div>
                    </figure>
                );
            })}

            <p className="absolute right-2 bottom-1 hidden text-[11px] tracking-[0.02em] text-bone/75 italic lg:block">
                {BACKDROP_CAPTION}
            </p>
        </div>
    );
}
