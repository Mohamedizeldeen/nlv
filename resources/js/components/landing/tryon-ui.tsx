import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Photo } from './photo';

/*
 * Pieces of the TryOn product UI, rendered in HTML so every mockup on the
 * page (phones, kiosk, browser) shows the same believable interface.
 */

/**
 * Body-mapping grid, corner brackets and a sweeping scan line.
 * `frameClassName` insets the bracket frame (e.g. "top-12 bottom-20") so the
 * brackets clear chips and captions laid over the same image.
 */
export function ScanOverlay({
    className,
    frameClassName,
}: {
    className?: string;
    frameClassName?: string;
}) {
    return (
        <div
            aria-hidden
            className={cn(
                'pointer-events-none absolute inset-0 overflow-hidden',
                className,
            )}
        >
            <div className="absolute inset-0 bg-[linear-gradient(oklch(1_0_0/0.09)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.09)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)] bg-[size:12.5%_8%]" />
            <div className={cn('absolute inset-0', frameClassName)}>
                {(
                    [
                        'top-[6%] left-[6%] border-t border-l',
                        'top-[6%] right-[6%] border-t border-r',
                        'bottom-[6%] left-[6%] border-b border-l',
                        'right-[6%] bottom-[6%] border-r border-b',
                    ] as const
                ).map((corner) => (
                    <span
                        key={corner}
                        className={cn(
                            'absolute size-[9%] min-h-3 min-w-3 border-mint/80',
                            corner,
                        )}
                    />
                ))}
            </div>
            <div className="absolute inset-x-0 top-0 h-full animate-scan">
                <div className="h-px w-full bg-[linear-gradient(90deg,transparent,oklch(0.84_0.12_160/0.9),transparent)] shadow-[0_0_18px_2px_oklch(0.84_0.12_160/0.45)]" />
            </div>
        </div>
    );
}

/**
 * A small labelled value floating over imagery, e.g. "Fit · True to size".
 * Use `tone="dark"` over bright or saturated photos, where clear glass
 * would pick up too much colour to stay legible.
 */
export function FitChip({
    label,
    value,
    icon,
    tone = 'glass',
    className,
}: {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    tone?: 'glass' | 'dark';
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-2.5 rounded-[14px] px-3 py-2 text-start',
                tone === 'dark' ? 'glass-dark' : 'glass-thin',
                className,
            )}
        >
            {icon ? (
                <span className="grid size-7 shrink-0 place-items-center rounded-[10px] bg-white/10 text-mint">
                    {icon}
                </span>
            ) : null}
            <span className="flex flex-col">
                <span className="text-[10px] leading-tight tracking-[0.18em] text-smoke uppercase">
                    {label}
                </span>
                <span className="text-[13px] leading-snug font-medium text-bone tabular-nums">
                    {value}
                </span>
            </span>
        </div>
    );
}

/** An `IMAGES.garments` entry, with its label from the section's dictionary. */
export type Garment = {
    /** Unsplash photo id. */
    id: string;
    label: string;
    focus?: [number, number];
    zoom?: number;
};

/**
 * Row of garment thumbnails; the active one gets a mint ring. Each `label`
 * is the thumbnail's alt text, or with `onSelect` its button's name through
 * `selectLabel` (pass one from the caller's dictionary, e.g. "Try on {label}").
 */
export function GarmentRail({
    items,
    active = 0,
    onSelect,
    selectLabel = (label) => label,
    className,
    thumbClassName,
}: {
    items: Garment[];
    active?: number;
    onSelect?: (index: number) => void;
    selectLabel?: (label: string) => string;
    className?: string;
    thumbClassName?: string;
}) {
    return (
        <div className={cn('flex gap-2', className)}>
            {items.map((item, index) => {
                const selected = index === active;
                const thumb = (
                    <Photo
                        id={item.id}
                        alt={onSelect ? '' : item.label}
                        widths={[160, 240]}
                        sizes="80px"
                        ratio={1.25}
                        focus={item.focus}
                        zoom={item.zoom}
                        className="size-full"
                    />
                );
                const frame = cn(
                    'relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-[10px] ring-1 transition-[box-shadow,transform] duration-300 ease-glass',
                    selected ? 'ring-2 ring-mint' : 'opacity-70 ring-white/15',
                    thumbClassName,
                );

                return onSelect ? (
                    <button
                        key={item.label}
                        type="button"
                        aria-label={selectLabel(item.label)}
                        aria-pressed={selected}
                        onClick={() => onSelect(index)}
                        className={cn(
                            frame,
                            'cursor-pointer hover:opacity-100 focus-visible:ring-2 focus-visible:ring-mint focus-visible:outline-none',
                        )}
                    >
                        {thumb}
                    </button>
                ) : (
                    <div key={item.label} className={frame}>
                        {thumb}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Size recommendation: the recommended size is filled, with a confidence
 * note under it (the caller's translated "96% fit confidence").
 */
export function SizeScale({
    sizes,
    recommended,
    note,
    className,
}: {
    sizes: string[];
    recommended: string;
    note: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <div className="flex gap-1.5">
                {sizes.map((size) => (
                    <span
                        key={size}
                        className={cn(
                            'grid h-8 min-w-8 place-items-center rounded-[10px] px-2 text-xs font-medium tabular-nums',
                            size === recommended
                                ? 'bg-mint text-ink'
                                : 'bg-white/[0.07] text-mist ring-1 ring-white/10',
                        )}
                    >
                        {size}
                    </span>
                ))}
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-mist">
                <Check aria-hidden className="size-3 text-lagoon" />
                {note}
            </p>
        </div>
    );
}

// Deterministic QR-like pattern (decorative only, not scannable).
const QR_SIZE = 21;
const qrCells = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
    const x = i % QR_SIZE;
    const y = Math.floor(i / QR_SIZE);
    const inFinder = (fx: number, fy: number) =>
        x >= fx && x < fx + 7 && y >= fy && y < fy + 7;

    for (const [fx, fy] of [
        [0, 0],
        [QR_SIZE - 7, 0],
        [0, QR_SIZE - 7],
    ]) {
        if (inFinder(fx, fy)) {
            const dx = x - fx;
            const dy = y - fy;
            const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6;
            const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;

            return ring || core;
        }
    }

    return (x * 7 + y * 13 + ((x * y) % 5)) % 3 === 0;
});

/** Decorative QR glyph for "continue on your phone" moments. */
export function QrGlyph({ className }: { className?: string }) {
    return (
        <svg
            viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
            aria-hidden
            shapeRendering="crispEdges"
            className={cn('size-20 rounded-[8px] bg-bone p-1.5', className)}
        >
            {qrCells.map((on, i) =>
                on ? (
                    <rect
                        key={i}
                        x={i % QR_SIZE}
                        y={Math.floor(i / QR_SIZE)}
                        width="1"
                        height="1"
                        className="fill-ink"
                    />
                ) : null,
            )}
        </svg>
    );
}
