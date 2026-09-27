import { ImageUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { arabicDisplay, localeProps } from '@/components/admin/bilingual';
import type { ContentLocale } from '@/components/admin/bilingual';
import testimonialMessages from '@/i18n/sections/testimonials';
import { cn } from '@/lib/utils';
import type { FocusPoint } from '@/types/admin';
import { avatarZoom, FocalImage } from './focal-image';

/*
 * The landing page's story, drawn from the form's current values: the
 * featured card (portrait with its city caption, the glass quote with the
 * mint phrase, the name and the metric pill) and its row in the story
 * list with the small avatar. Same type, glass and crops as
 * components/landing/sections/testimonials.tsx, scaled to a side column.
 *
 * In Arabic the card is set as /ar sets it: right to left and mirrored,
 * the quote in the Arabic display face (Amiri) and never slanted, its
 * phrase in mint a weight heavier; figures keep their left-to-right order.
 * The quotation mark and the store/city separators are the landing's own
 * (i18n/sections/testimonials.ts), so both stay in step.
 */

export type StoryPreviewValues = {
    name: string;
    role: string;
    store: string;
    city: string;
    coordinates: string;
    quote: string;
    figure: string;
    label: string;
    note: string;
    /** The list's compact label; empty falls back to `label`. */
    short: string;
    /** The portrait's URL (stored image or the newly picked file). */
    image: string | null;
    focus: FocusPoint;
    zoom: number;
};

/**
 * The quote around its first *phrase*, as the server splits it
 * (App\Support\LandingContent::splitAccent).
 */
export function splitQuote(text: string): {
    before: string;
    accent: string;
    after: string;
} {
    const match = /^([\s\S]*?)\*([^*]+)\*([\s\S]*)$/.exec(text);

    return match
        ? {
              before: match[1],
              accent: match[2],
              after: match[3].replaceAll('*', ''),
          }
        : { before: text.replaceAll('*', ''), accent: '', after: '' };
}

const COMPASS_AR: Record<string, string> = {
    N: 'شمالًا',
    S: 'جنوبًا',
    E: 'شرقًا',
    W: 'غربًا',
};

/**
 * Coordinates as the Arabic page prints them: "24.71° N" → "24.71° شمالًا"
 * (App\Support\LandingContent::coordinates).
 */
export function arabicCoordinates(coordinates: string): string {
    return coordinates.replace(
        /°\s*([NSEW])(?!\p{L})/gu,
        (_, letter: string) => `° ${COMPASS_AR[letter]}`,
    );
}

/** Faint stand-ins for empty fields, so the card keeps its shape. */
const STAND_IN: Record<
    ContentLocale,
    {
        name: string;
        role: string;
        place: string;
        listPlace: string;
        figure: string;
        label: string;
        short: string;
        quote: [string, string, string];
    }
> = {
    en: {
        name: 'Name',
        role: 'Role',
        place: 'Store, city',
        listPlace: 'Store · City',
        figure: '+0%',
        label: 'What changed',
        short: 'Label',
        quote: ['Their words, with ', 'one phrase', ' in mint.'],
    },
    ar: {
        name: 'الاسم',
        role: 'المنصب',
        place: 'المتجر، المدينة',
        listPlace: 'المتجر · المدينة',
        figure: '+0%',
        label: 'ما الذي تغيّر',
        short: 'الوصف',
        quote: ['كلماتهم كما قالوها، و', 'عبارة واحدة', ' باللون النعناعي.'],
    },
};

/** "{store}, {city}" with whichever parts are filled. */
function fillPlace(format: string, store: string, city: string): string {
    if (!store || !city) {
        return store || city;
    }

    return format.replace('{store}', store).replace('{city}', city);
}

function Filled({ value, fallback }: { value: string; fallback: ReactNode }) {
    return value.trim() ? (
        <>{value}</>
    ) : (
        <span className="opacity-40">{fallback}</span>
    );
}

/** A signed figure (+33%, ×6) that keeps its order in Arabic text. */
function Figure({ value, fallback }: { value: string; fallback: string }) {
    return (
        <span dir="ltr" className="bidi-ltr">
            <Filled value={value} fallback={fallback} />
        </span>
    );
}

export function PortraitPlaceholder({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'grid size-full place-items-center bg-[repeating-linear-gradient(135deg,oklch(1_0_0/0.035)_0_1px,transparent_1px_12px)] text-center',
                className,
            )}
        >
            <span className="grid justify-items-center gap-2 px-4 text-[12px] leading-snug text-smoke">
                <ImageUp aria-hidden className="size-5 text-mint/70" />
                The portrait appears here
            </span>
        </div>
    );
}

export function StoryPreview({
    values,
    locale = 'en',
    className,
}: {
    values: StoryPreviewValues;
    /** The card's language (its texts already picked by the form). */
    locale?: ContentLocale;
    className?: string;
}) {
    const arabic = locale === 'ar';
    const standIn = STAND_IN[locale];
    const quote = splitQuote(values.quote);
    const plain = `${quote.before}${quote.accent}${quote.after}`;
    const long = plain.length > 140;
    const short = values.short.trim() || values.label;
    const coordinates = arabic
        ? arabicCoordinates(values.coordinates.trim())
        : values.coordinates.trim();
    const messages = testimonialMessages[locale];
    const place = fillPlace(
        messages.place,
        values.store.trim(),
        values.city.trim(),
    );
    const placeShort = fillPlace(
        messages.placeShort,
        values.store.trim(),
        values.city.trim(),
    );
    const accentClass = arabic
        ? 'font-semibold text-mint not-italic'
        : 'text-mint not-italic';

    return (
        <div aria-hidden className={cn('grid gap-6', className)}>
            {/* The featured card. */}
            <div {...localeProps(locale)} className="relative">
                <div className="relative aspect-[4/5] w-[62%] overflow-hidden rounded-[22px] bg-ink-raised">
                    {values.image ? (
                        <FocalImage
                            src={values.image}
                            alt=""
                            aspect={4 / 5}
                            focus={values.focus}
                            zoom={values.zoom}
                            className="absolute inset-0"
                        />
                    ) : (
                        // In the upper part: the quote card and its mark
                        // cover the portrait's lower third.
                        <PortraitPlaceholder className="content-start pt-[22%]" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-ink/85 via-ink/35 to-transparent" />
                    {values.city.trim() || coordinates ? (
                        <div className="absolute start-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-col gap-1 rounded-[12px] px-3 py-2 glass-strong">
                            <span
                                className={cn(
                                    'truncate font-medium text-bone',
                                    arabic
                                        ? 'text-[11px] leading-tight'
                                        : 'text-[9px] leading-none tracking-[0.28em] uppercase',
                                )}
                            >
                                {values.city}
                            </span>
                            {coordinates ? (
                                <span
                                    className={cn(
                                        'truncate text-smoke tabular-nums',
                                        arabic
                                            ? 'text-[10.5px] leading-tight'
                                            : 'text-[10px] leading-none',
                                    )}
                                >
                                    {coordinates}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <div className="glass-rim relative ms-[12%] -mt-28 rounded-[22px] px-5 pt-9 pb-5 glass-strong">
                    <span className="pointer-events-none absolute start-4 -top-6 font-display text-[4.75rem] leading-none text-mint select-none">
                        {messages.quoteMark}
                    </span>
                    <p
                        className={cn(
                            'font-normal text-pretty text-bone',
                            arabic
                                ? [
                                      arabicDisplay,
                                      long
                                          ? 'text-[1.15rem] leading-[1.45]'
                                          : 'text-[1.4rem] leading-[1.4]',
                                  ]
                                : [
                                      'font-display italic',
                                      long
                                          ? 'text-[1.1rem] leading-[1.28]'
                                          : 'text-[1.35rem] leading-[1.14] tracking-[-0.01em]',
                                  ],
                        )}
                    >
                        {plain.trim() ? (
                            <>
                                {quote.before}
                                <em className={accentClass}>{quote.accent}</em>
                                {quote.after}
                            </>
                        ) : (
                            <span className="opacity-40">
                                {standIn.quote[0]}
                                <em className={accentClass}>
                                    {standIn.quote[1]}
                                </em>
                                {standIn.quote[2]}
                            </span>
                        )}
                    </p>

                    <div className="mt-5 flex flex-col items-start gap-4">
                        <span className="flex min-w-0 flex-col gap-0.5 border-s border-mint/40 ps-3.5">
                            <span className="text-[15px] leading-snug font-medium text-bone">
                                <Filled
                                    value={values.name}
                                    fallback={standIn.name}
                                />
                            </span>
                            <span className="text-[12.5px] leading-snug text-mist">
                                <Filled
                                    value={values.role}
                                    fallback={standIn.role}
                                />
                            </span>
                            <span className="text-[12.5px] leading-snug text-smoke">
                                <Filled
                                    value={place}
                                    fallback={standIn.place}
                                />
                            </span>
                        </span>
                        <span className="inline-flex max-w-full items-center gap-3 rounded-[14px] py-2 ps-3 pe-3.5 glass-thin">
                            <span className="font-display text-[1.4rem] leading-none font-medium text-mint tabular-nums">
                                <Figure
                                    value={values.figure}
                                    fallback={standIn.figure}
                                />
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-[12px] leading-tight text-bone">
                                    <Filled
                                        value={values.label}
                                        fallback={standIn.label}
                                    />
                                </span>
                                {values.note.trim() ? (
                                    <span className="truncate text-[11px] leading-tight text-smoke">
                                        {values.note}
                                    </span>
                                ) : null}
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Its row in the list beside the card (the selected state). */}
            <div className="grid gap-2.5">
                <p className="text-[10px] font-medium tracking-[0.24em] text-smoke uppercase">
                    In the story list
                </p>
                <div
                    {...localeProps(locale)}
                    className="glass-rim grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 rounded-[20px] px-4 py-3.5 ring-1 glass-strong ring-mint/45"
                >
                    <div className="size-12 overflow-hidden rounded-[14px] bg-ink-raised ring-1 ring-white/15">
                        {values.image ? (
                            <FocalImage
                                src={values.image}
                                alt=""
                                aspect={1}
                                focus={values.focus}
                                zoom={avatarZoom(values.zoom)}
                                className="size-full"
                            />
                        ) : null}
                    </div>
                    <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[15px] font-medium text-bone">
                            <Filled
                                value={values.name}
                                fallback={standIn.name}
                            />
                        </span>
                        <span className="truncate text-[13px] text-smoke">
                            <Filled
                                value={placeShort}
                                fallback={standIn.listPlace}
                            />
                        </span>
                    </span>
                    <span className="flex flex-col items-end gap-1.5">
                        <span className="font-display text-2xl leading-none font-medium text-mint tabular-nums">
                            <Figure
                                value={values.figure}
                                fallback={standIn.figure}
                            />
                        </span>
                        <span
                            className={cn(
                                'max-w-[7rem] truncate text-smoke',
                                arabic
                                    ? 'text-[11px] leading-tight'
                                    : 'text-[10px] leading-none tracking-[0.18em] uppercase',
                            )}
                        >
                            <Filled value={short} fallback={standIn.short} />
                        </span>
                    </span>
                </div>
            </div>
        </div>
    );
}
