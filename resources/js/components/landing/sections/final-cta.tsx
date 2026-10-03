import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import type { ChangeEvent, CSSProperties, FormEvent } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import { Accent } from '../accent';
import { IMAGES } from '../images';
import { useContent } from '../landing-data';
import { TalkLine, useOrderDialog, useTalkNumbers } from '../order-dialog';
import { Photo } from '../photo';
import { Container, Glow, Reveal, cta } from '../primitives';

/*
 * The order section. Its copy comes from the admin (order.* settings); the
 * email field and button open the order pop-up with the address filled in.
 * Under them: the contact email, the demo link and, when set, the phone and
 * WhatsApp numbers (contact.* settings).
 */

// Placeholder content: replace before launch. -----------------------------

/**
 * Lookbook captions for the three fanned cards, in IMAGES.finalCta.looks
 * order. Their words (city, piece, alt text) and the backdrop's caption are
 * in i18n/sections/final-cta.ts, in both languages.
 */
const LOOK_CAPTIONS = [
    {
        number: '14',
        city: 'final-cta.look14City',
        piece: 'final-cta.look14Piece',
        alt: 'final-cta.look14Alt',
    },
    {
        number: '22',
        city: 'final-cta.look22City',
        piece: 'final-cta.look22Piece',
        alt: 'final-cta.look22Alt',
    },
    {
        number: '31',
        city: 'final-cta.look31City',
        piece: 'final-cta.look31Piece',
        alt: 'final-cta.look31Alt',
    },
] as const;

// -------------------------------------------------------------------------

/*
 * Fan geometry. Each card rests at (--r) and, when the stage is hovered,
 * opens to (--fr, --fx, --fy). Positions are classes so the phone and
 * desktop fans can differ. They are logical (start = left in English), and
 * the Arabic page mirrors the angles and the sideways drift (--flip), so the
 * first card still slides under the glass panel, which is then on its right.
 */
const FAN = [
    {
        place: 'start-[3%] top-[16%] w-[35%] lg:top-[20%] lg:start-[-13%] lg:w-[47%] z-[1]',
        // This card's inner edge slides under the glass panel, so its
        // caption starts past the tucked strip.
        caption: 'lg:start-[22%]',
        style: {
            '--r': '-8deg',
            '--fr': '-12deg',
            '--fx': '-2%',
            '--fy': '6%',
        },
    },
    {
        place: 'start-[33%] top-0 w-[35%] lg:top-[-7%] lg:start-[24%] lg:w-[47%] z-[3]',
        caption: '',
        style: { '--r': '-1deg', '--fr': '-2deg', '--fx': '0%', '--fy': '-5%' },
    },
    {
        place: 'start-[62%] top-[14%] w-[35%] lg:top-[28%] lg:start-[52%] lg:w-[47%] z-[2]',
        caption: '',
        style: { '--r': '6deg', '--fr': '10deg', '--fx': '9%', '--fy': '2%' },
    },
] as const;

/** Stands in for a number while a message is split around it. */
const SLOT = '\u2063';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;

/** An empty field is fine: the pop-up asks for the address itself. */
function isIncomplete(value: string): boolean {
    const email = value.trim();

    return email !== '' && !EMAIL_PATTERN.test(email);
}

export default function FinalCta() {
    const kicker = useContent('order.kicker');
    const title = useContent('order.title');
    const lede = useContent('order.lede');

    return (
        <section id="order" className="relative isolate py-24 md:py-36">
            <Container>
                <Reveal>
                    <div className="group/fan relative mt-12 lg:mt-0">
                        <Backdrop />

                        <div className="relative grid p-3 sm:p-4 lg:grid-cols-12 lg:gap-x-8 lg:p-5">
                            <div className="glass-rim relative z-20 rounded-[24px] p-6 glass-strong max-lg:-mt-16 sm:p-10 md:rounded-[28px] lg:col-span-7 lg:p-12 lg:pe-16 xl:p-14 xl:pe-20">
                                <div className="flex items-center gap-4">
                                    <p className="text-kicker font-medium text-bone uppercase">
                                        {kicker}
                                    </p>
                                    <span
                                        aria-hidden
                                        className="h-px flex-1 bg-white/15"
                                    />
                                </div>

                                <h2 className="mt-8 font-display text-display-lg font-medium text-balance text-bone md:mt-10 [&_em]:font-normal [&_em]:text-mint">
                                    <Accent
                                        text={title}
                                        className="sm:whitespace-nowrap"
                                    />
                                </h2>
                                <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-pretty text-mist">
                                    {lede}
                                </p>

                                <OrderForm />

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

/** Teal satin, softened as if seen through frosted glass, with two lights. */
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
                // Blurred and dimmed, so a phone can take a file half as wide.
                sizes="(min-width: 1320px) 1224px, (min-width: 768px) 92vw, 46vw"
                className="absolute inset-0 size-full scale-110 blur-md brightness-[0.72] saturate-[0.9]"
                style={{
                    objectPosition: `${backdrop.focus[0] * 100}% ${backdrop.focus[1] * 100}%`,
                }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,oklch(0.145_0.018_200/0.55),oklch(0.145_0.018_200/0.2)_55%,oklch(0.145_0.018_200/0.45))]" />
            <Glow
                color="jade"
                className="-top-48 -left-32 z-0 size-[36rem] opacity-55"
            />
            <Glow
                color="lagoon"
                className="-right-24 -bottom-56 z-0 size-[34rem] opacity-50"
            />
            <div className="absolute inset-0 grain opacity-[0.07] mix-blend-overlay" />
        </div>
    );
}

/** The email field and button: they open the order pop-up, email filled in. */
function OrderForm() {
    const { t } = useI18n();
    const order = useOrderDialog();
    const label = useContent('order.cta');
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const validate = (value: string) =>
        isIncomplete(value) ? t('final-cta.emailInvalid') : null;
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

        order.open({ source: 'order-section', email: email.trim() });
    };

    return (
        <form noValidate onSubmit={onSubmit} className="mt-9">
            <label htmlFor="order-email" className="sr-only">
                {t('final-cta.emailLabel')}
            </label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                    ref={setInput}
                    id="order-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    // Addresses read left to right; on the Arabic page the
                    // field still lines up on the right.
                    dir="ltr"
                    placeholder={t('final-cta.emailPlaceholder')}
                    value={email}
                    onChange={onChange}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'order-email-error' : undefined}
                    className={cn(
                        'h-14 w-full min-w-0 rounded-[20px] px-5 text-base text-bone glass-thin transition-shadow duration-300 ease-glass placeholder:text-smoke focus-visible:ring-2 focus-visible:outline-none sm:col-start-1 sm:row-start-1 rtl:text-right',
                        error
                            ? 'ring-1 ring-coral/80 focus-visible:ring-coral/80'
                            : 'focus-visible:ring-mint/70',
                    )}
                />
                <p
                    id="order-email-error"
                    className={cn(
                        'flex items-start gap-2 text-[14px] leading-snug text-bone sm:col-span-2 sm:row-start-2',
                        error ? 'max-sm:-mt-0.5 max-sm:mb-1' : 'sr-only',
                    )}
                >
                    {error}
                </p>
                <button
                    type="submit"
                    className={cn(
                        cta({ variant: 'primary', size: 'lg' }),
                        'group/submit sm:col-start-2 sm:row-start-1',
                    )}
                >
                    {label}
                    <ArrowRight
                        aria-hidden
                        className="size-4 transition-transform duration-[380ms] ease-glass group-hover/submit:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/submit:-translate-x-0.5"
                    />
                </button>
            </div>
        </form>
    );
}

/**
 * Email and demo links (while a contact email is set), then "Prefer to
 * talk?" with the phone and WhatsApp numbers (while either is set).
 */
function PanelFooter() {
    const email = useContent('contact.email');
    const { phone, whatsapp } = useTalkNumbers();

    if (!email && !phone && !whatsapp) {
        return null;
    }

    return (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-[14px]">
            {email ? <EmailLinks email={email} /> : null}
            {/* A row of its own, under the two links. */}
            <TalkLine className="basis-full" />
        </div>
    );
}

function EmailLinks({ email }: { email: string }) {
    const emailPrompt = useContent('order.email_prompt');
    const demoPrompt = useContent('order.demo_prompt');
    const demoLink = useContent('order.demo_link');
    const demoSubject = useContent('order.demo_subject');

    return (
        <>
            <p className="text-smoke">
                {emailPrompt}{' '}
                <a
                    href={`mailto:${email}`}
                    className="text-bone underline decoration-white/25 underline-offset-4 transition-colors bidi-ltr hover:decoration-mint focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                >
                    {email}
                </a>
            </p>
            <a
                href={`mailto:${email}?subject=${encodeURIComponent(demoSubject)}`}
                className="group text-mist transition-colors hover:text-bone focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
            >
                {demoPrompt}{' '}
                {/* Breaks between the two sentences, arrow kept on the last word. */}
                <span className="whitespace-nowrap">
                    {demoLink}
                    <ArrowUpRight
                        aria-hidden
                        className="ms-1.5 inline size-4 align-[-3px] transition-transform duration-[380ms] ease-glass group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                    />
                </span>
            </a>
        </>
    );
}

/** Three looks, dealt like cards; the first slides under the glass panel. */
function LooksFan({ className }: { className?: string }) {
    const { t } = useI18n();
    const looks = IMAGES.finalCta.looks;
    // "Look 14": the number is its own text run, as the caption was typeset.
    const [lookBefore, lookAfter] = t('final-cta.lookCaption', {
        number: SLOT,
    }).split(SLOT);

    return (
        <div
            className={cn(
                'relative z-10 h-[200px] max-lg:-mt-12 sm:h-[280px] lg:h-auto rtl:[--flip:-1]',
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
                            'absolute [rotate:calc(var(--r)*var(--flip,1))] transition-[rotate,translate] duration-700 ease-glass',
                            'group-hover/fan:[translate:calc(var(--fx)*var(--flip,1))_var(--fy)] group-hover/fan:[rotate:calc(var(--fr)*var(--flip,1))]',
                            fan.place,
                        )}
                    >
                        <div className="relative overflow-hidden rounded-[14px] shadow-[0_40px_60px_-30px_oklch(0_0_0/0.9),0_0_0_1px_oklch(1_0_0/0.14)] sm:rounded-[20px]">
                            <Photo
                                id={image.id}
                                alt={t(caption.alt)}
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
                                <span className="block truncate text-[9px] font-medium tracking-[0.2em] text-mist uppercase sm:text-[10px] rtl:text-[11px] sm:rtl:text-[11px]">
                                    {lookBefore}
                                    {caption.number}
                                    {lookAfter}
                                    <span className="max-sm:hidden lg:max-xl:hidden">
                                        {' '}
                                        · {t(caption.city)}
                                    </span>
                                </span>
                                <span className="mt-0.5 block truncate text-[12px] text-bone max-sm:hidden lg:max-xl:hidden">
                                    {t(caption.piece)}
                                </span>
                            </figcaption>
                        </div>
                    </figure>
                );
            })}

            <p className="absolute end-2 bottom-1 hidden text-[11px] tracking-[0.02em] text-bone/75 italic lg:block">
                {t('final-cta.backdropCaption')}
            </p>
        </div>
    );
}
