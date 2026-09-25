import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * Device mockups. Every dimension is proportional, so size a frame with a
 * width class only (e.g. "w-[260px]" or "w-full"); the screen is the child.
 */

type FrameProps = {
    className?: string;
    screenClassName?: string;
    children?: ReactNode;
};

export function PhoneFrame({
    className,
    screenClassName,
    children,
}: FrameProps) {
    return (
        <div
            className={cn(
                'relative aspect-[9/19.5] rounded-[15%/7%] bg-[oklch(0.17_0.01_285)] p-[3.2%] shadow-[0_50px_90px_-40px_oklch(0_0_0/0.85),inset_0_0_0_1px_oklch(1_0_0/0.16),inset_0_0_0_4px_oklch(0_0_0/0.55)]',
                className,
            )}
        >
            <div
                className={cn(
                    'relative size-full overflow-hidden rounded-[12.5%/5.8%] bg-ink',
                    screenClassName,
                )}
            >
                {children}
                <div
                    aria-hidden
                    className="absolute top-[1.8%] left-1/2 z-30 h-[3.4%] w-[32%] -translate-x-1/2 rounded-full bg-black"
                />
            </div>
        </div>
    );
}

export function TabletFrame({
    className,
    screenClassName,
    children,
    orientation = 'portrait',
}: FrameProps & { orientation?: 'portrait' | 'landscape' }) {
    return (
        <div
            className={cn(
                'relative rounded-[6%] bg-[oklch(0.17_0.01_285)] p-[2.6%] shadow-[0_50px_90px_-40px_oklch(0_0_0/0.85),inset_0_0_0_1px_oklch(1_0_0/0.16),inset_0_0_0_4px_oklch(0_0_0/0.55)]',
                orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]',
                className,
            )}
        >
            <div
                className={cn(
                    'relative size-full overflow-hidden rounded-[3.6%] bg-ink',
                    screenClassName,
                )}
            >
                {children}
            </div>
        </div>
    );
}

/** A glass browser window. `url` is shown in the address bar. */
export function BrowserFrame({
    className,
    screenClassName,
    children,
    url,
}: FrameProps & { url: string }) {
    return (
        <div
            className={cn(
                'glass-rim relative overflow-hidden rounded-[24px] glass',
                className,
            )}
        >
            <div className="flex h-11 items-center gap-3 border-b border-white/10 px-4">
                <div aria-hidden className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-white/25" />
                    <span className="size-2.5 rounded-full bg-white/15" />
                    <span className="size-2.5 rounded-full bg-white/10" />
                </div>
                <div className="mx-auto flex h-7 min-w-0 flex-1 items-center justify-center gap-2 rounded-[10px] bg-black/25 px-3 text-xs text-mist sm:max-w-[60%]">
                    <Lock aria-hidden className="size-3 shrink-0 opacity-70" />
                    <span className="truncate">{url}</span>
                </div>
                <div aria-hidden className="hidden w-[46px] sm:block" />
            </div>
            <div className={cn('relative', screenClassName)}>{children}</div>
        </div>
    );
}

/**
 * Free-standing in-store kiosk: a portrait touchscreen with a camera bar,
 * a neck and a floor base. Hotspot anchors (percent of the whole frame):
 * camera ≈ (50%, 2.4%), screen centre ≈ (50%, 36%), `footer` slot ≈ (50%, 66%).
 */
export function KioskFrame({
    className,
    screenClassName,
    children,
    footer,
}: FrameProps & { footer?: ReactNode }) {
    return (
        <div className={cn('relative flex flex-col items-center', className)}>
            <div className="relative w-full rounded-[7%/4%] bg-[oklch(0.2_0.01_285)] p-[4%] pt-[10%] shadow-[0_60px_100px_-40px_oklch(0_0_0/0.9),inset_0_0_0_1px_oklch(1_0_0/0.16),inset_0_2px_0_oklch(1_0_0/0.12)]">
                <div
                    aria-hidden
                    className="absolute top-[3.2%] left-1/2 flex h-[3.4%] w-[22%] -translate-x-1/2 items-center justify-center gap-[12%] rounded-full bg-black/80"
                >
                    <span className="aspect-square h-[46%] rounded-full bg-[radial-gradient(circle_at_35%_35%,oklch(0.7_0.08_230),oklch(0.2_0.03_260)_60%)] shadow-[0_0_0_2px_oklch(0.3_0.01_285)]" />
                    <span className="aspect-square h-[22%] rounded-full bg-lagoon/80" />
                </div>
                <div
                    className={cn(
                        'relative aspect-[9/16] w-full overflow-hidden rounded-[3%/1.7%] bg-ink',
                        screenClassName,
                    )}
                >
                    {children}
                </div>
                {footer ? <div className="pt-[5%]">{footer}</div> : null}
            </div>
            <div
                aria-hidden
                className="aspect-[1/2.4] w-[11%] bg-[linear-gradient(90deg,oklch(0.16_0.01_285),oklch(0.28_0.01_285)_45%,oklch(0.15_0.01_285))]"
            />
            <div
                aria-hidden
                className="aspect-[7/1] w-[62%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_30%,oklch(0.3_0.01_285),oklch(0.14_0.01_285)_70%)] shadow-[0_30px_40px_-10px_oklch(0_0_0/0.8)]"
            />
        </div>
    );
}
