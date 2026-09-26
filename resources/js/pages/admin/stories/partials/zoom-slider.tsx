import { Minus, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useFieldControl } from '@/components/admin/field';
import { cn } from '@/lib/utils';

type ZoomSliderProps = {
    /** Submitted as a plain number, e.g. "1.35". */
    name: string;
    value: number;
    onValueChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    className?: string;
};

const round = (value: number) => Math.round(value * 100) / 100;

const stepButton =
    'grid size-9 shrink-0 cursor-pointer place-items-center rounded-[12px] bg-white/[0.06] text-mist ring-1 ring-white/[0.12] transition-colors duration-300 ease-glass ring-inset hover:bg-white/[0.1] hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-3.5';

/*
 * A range input in the landing's glass: a hairline track filled in mint up
 * to the thumb, a bone thumb with a mint ring. Arrow keys move it by one
 * step, Page Up / Down by ten (native behaviour).
 */
const range = cn(
    'h-9 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent focus-visible:outline-none',
    '[&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--color-mint)_var(--fill),oklch(1_0_0/0.16)_var(--fill))]',
    '[&::-webkit-slider-thumb]:-mt-[8.5px] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bone [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_var(--color-mint),0_4px_12px_oklch(0_0_0/0.45)] [&::-webkit-slider-thumb]:transition-shadow',
    'focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_2px_var(--color-mint),0_0_0_7px_oklch(0.84_0.12_160/0.3)]',
    '[&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/[0.16]',
    '[&::-moz-range-progress]:h-[3px] [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-mint',
    '[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-bone [&::-moz-range-thumb]:shadow-[0_0_0_2px_var(--color-mint),0_4px_12px_oklch(0_0_0/0.45)]',
    'focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_2px_var(--color-mint),0_0_0_7px_oklch(0.84_0.12_160/0.3)]',
);

/** The portrait zoom: a slider with − / + steps (show the value in the Field's `aside`). */
export function ZoomSlider({
    name,
    value,
    onValueChange,
    min,
    max,
    step = 0.05,
    className,
}: ZoomSliderProps) {
    const control = useFieldControl({});
    const fill = ((value - min) / (max - min)) * 100;
    const nudge = (delta: number) =>
        onValueChange(round(Math.min(max, Math.max(min, value + delta))));

    return (
        <div className={cn('grid gap-1.5', className)}>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => nudge(-0.1)}
                    disabled={value <= min}
                    aria-label="Zoom out"
                    className={stepButton}
                >
                    <Minus aria-hidden />
                </button>
                <input
                    type="range"
                    id={control.id}
                    name={name}
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(event) =>
                        onValueChange(round(Number(event.target.value)))
                    }
                    aria-describedby={control['aria-describedby']}
                    aria-invalid={control['aria-invalid']}
                    aria-valuetext={`${value.toFixed(2)} times`}
                    style={{ '--fill': `${fill}%` } as CSSProperties}
                    className={range}
                />
                <button
                    type="button"
                    onClick={() => nudge(0.1)}
                    disabled={value >= max}
                    aria-label="Zoom in"
                    className={stepButton}
                >
                    <Plus aria-hidden />
                </button>
            </div>
            <div
                aria-hidden
                className="flex justify-between gap-4 px-12 text-[10px] tracking-[0.18em] whitespace-nowrap text-smoke uppercase"
            >
                <span>Whole photo</span>
                <span>Close crop</span>
            </div>
        </div>
    );
}
