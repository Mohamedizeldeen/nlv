import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { DailyCount } from '@/types/admin';
import { formatDate, formatNumber, parseDay } from './format';

const short = (date: string) => formatDate(parseDay(date), { year: false });

const long = (date: string) =>
    formatDate(parseDay(date), { year: false, weekday: true });

/** Mean of the day and the six before it (fewer at the start of the range). */
function rollingAverage(counts: number[], span = 7): number[] {
    return counts.map((_, index) => {
        const days = counts.slice(Math.max(0, index - span + 1), index + 1);

        return days.reduce((sum, n) => sum + n, 0) / days.length;
    });
}

/** A round axis top and step: 0/2/4, 0/5/10/15, 0/20/40… */
function scale(max: number): { top: number; step: number } {
    if (max <= 4) {
        return { top: 4, step: 2 };
    }

    const rough = max / 3;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step =
        [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ??
        10 * magnitude;

    return { top: Math.ceil(max / step) * step, step };
}

function useWidth<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const node = ref.current;

        if (!node) {
            return;
        }

        const observer = new ResizeObserver(([entry]) =>
            setWidth(Math.round(entry.contentRect.width)),
        );
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return [ref, width] as const;
}

type DailyChartProps = {
    data: DailyCount[];
    /** What one unit is: "lead" → "3 leads". */
    noun?: string;
    /** Chart height in px (the plot, without the date labels). */
    height?: number;
    /** Shown over an all-zero chart. */
    emptyMessage?: string;
    className?: string;
};

const PAD = { top: 12, right: 4, bottom: 28, left: 28 };
const BAR_MAX = 18;
const GAP = 2;

/**
 * Counts per day as mint columns (today in full mint) with a lagoon
 * 7-day average line. Hover a day, or focus the chart and use ← / →, for
 * its numbers; "Show the numbers" opens the same data as a table.
 */
export function DailyChart({
    data,
    noun = 'lead',
    height = 200,
    emptyMessage = 'Nothing in this period yet.',
    className,
}: DailyChartProps) {
    const [frame, width] = useWidth<HTMLDivElement>();
    const [active, setActive] = useState<number | null>(null);
    const titleId = useId();
    const counts = data.map((day) => day.count);
    const average = rollingAverage(counts);
    const total = counts.reduce((sum, n) => sum + n, 0);
    const { top, step } = scale(Math.max(...counts, ...average, 0));
    const plural = (n: number) =>
        `${formatNumber(n)} ${n === 1 ? noun : `${noun}s`}`;

    const plotWidth = Math.max(0, width - PAD.left - PAD.right);
    const band = data.length ? plotWidth / data.length : 0;
    const barWidth = Math.max(2, Math.min(BAR_MAX, band - GAP));
    const y = (value: number) => PAD.top + height - (value / top) * height;
    const x = (index: number) => PAD.left + band * index + band / 2;
    const ticks = Array.from(
        { length: Math.round(top / step) + 1 },
        (_, i) => i * step,
    );
    const labelEvery = width < 420 ? 14 : 7;

    const line = average
        .map(
            (value, index) =>
                `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`,
        )
        .join(' ');

    const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
        const last = data.length - 1;
        const current = active ?? last;
        const moves: Record<string, number> = {
            ArrowLeft: Math.max(0, current - 1),
            ArrowRight: Math.min(last, current + 1),
            Home: 0,
            End: last,
        };

        if (event.key in moves) {
            event.preventDefault();
            setActive(moves[event.key]);
        } else if (event.key === 'Escape') {
            setActive(null);
        }
    };

    const shown = active === null ? null : data[active];
    const tipLeft =
        active === null ? 0 : Math.min(Math.max(x(active), 70), width - 70);

    return (
        <figure className={cn('min-w-0', className)}>
            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-smoke">
                <span className="inline-flex items-center gap-2">
                    <span
                        aria-hidden
                        className="h-2.5 w-2 rounded-t-[2px] bg-mint/70"
                    />
                    {noun.charAt(0).toUpperCase() + noun.slice(1)}s per day
                </span>
                <span className="inline-flex items-center gap-2">
                    <span
                        aria-hidden
                        className="h-[2px] w-3.5 rounded-full bg-[oklch(0.8_0.1_195)]"
                    />
                    7-day average
                </span>
            </div>

            <div
                ref={frame}
                className="relative"
                style={{ height: height + PAD.top + PAD.bottom }}
            >
                {width > 0 ? (
                    <svg
                        width={width}
                        height={height + PAD.top + PAD.bottom}
                        role="img"
                        aria-labelledby={titleId}
                        tabIndex={0}
                        onKeyDown={onKeyDown}
                        onFocus={(event) => {
                            if (event.currentTarget.matches(':focus-visible')) {
                                setActive(
                                    (current) => current ?? data.length - 1,
                                );
                            }
                        }}
                        onBlur={() => setActive(null)}
                        onPointerLeave={() => setActive(null)}
                        className="block overflow-visible rounded-[8px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint/70"
                    >
                        <title id={titleId}>
                            {`${plural(total)} in the last ${data.length} days. Use the left and right arrow keys to read each day.`}
                        </title>

                        {ticks.map((tick) => (
                            <g key={tick}>
                                <line
                                    x1={PAD.left}
                                    x2={width - PAD.right}
                                    y1={y(tick)}
                                    y2={y(tick)}
                                    className={
                                        tick === 0
                                            ? 'stroke-white/20'
                                            : 'stroke-white/[0.07]'
                                    }
                                    strokeWidth={1}
                                    shapeRendering="crispEdges"
                                />
                                <text
                                    x={PAD.left - 10}
                                    y={y(tick)}
                                    dy="0.32em"
                                    textAnchor="end"
                                    className="fill-smoke text-[10px] tabular-nums"
                                >
                                    {formatNumber(tick)}
                                </text>
                            </g>
                        ))}

                        {data.map((day, index) => {
                            const isToday = index === data.length - 1;
                            const isActive = index === active;
                            const barTop = y(day.count);
                            const barHeight = PAD.top + height - barTop;
                            const left = x(index) - barWidth / 2;
                            const r = Math.min(4, barWidth / 2, barHeight);

                            return (
                                <g key={day.date}>
                                    {day.count > 0 ? (
                                        <path
                                            d={`M${left},${PAD.top + height} V${barTop + r} Q${left},${barTop} ${left + r},${barTop} H${left + barWidth - r} Q${left + barWidth},${barTop} ${left + barWidth},${barTop + r} V${PAD.top + height} Z`}
                                            className={cn(
                                                'transition-[fill] duration-200',
                                                isActive || isToday
                                                    ? 'fill-mint'
                                                    : active !== null
                                                      ? 'fill-mint/35'
                                                      : 'fill-mint/60',
                                            )}
                                        />
                                    ) : (
                                        <rect
                                            x={left}
                                            y={PAD.top + height - 2}
                                            width={barWidth}
                                            height={2}
                                            rx={1}
                                            className={
                                                isActive
                                                    ? 'fill-white/40'
                                                    : 'fill-white/[0.12]'
                                            }
                                        />
                                    )}
                                    {/* The whole day's column is the hover target. */}
                                    <rect
                                        x={PAD.left + band * index}
                                        y={PAD.top}
                                        width={band}
                                        height={height}
                                        fill="transparent"
                                        onPointerEnter={() => setActive(index)}
                                    />
                                    {(data.length - 1 - index) % labelEvery ===
                                    0 ? (
                                        <text
                                            x={x(index)}
                                            y={PAD.top + height + 18}
                                            textAnchor={
                                                isToday ? 'end' : 'middle'
                                            }
                                            dx={isToday ? barWidth / 2 : 0}
                                            className={cn(
                                                'text-[10px] tabular-nums',
                                                isToday
                                                    ? 'fill-mist'
                                                    : 'fill-smoke',
                                            )}
                                        >
                                            {isToday
                                                ? 'Today'
                                                : short(day.date)}
                                        </text>
                                    ) : null}
                                </g>
                            );
                        })}

                        {total > 0 ? (
                            // An ink halo keeps the line legible where it crosses the bars.
                            <path
                                d={line}
                                fill="none"
                                strokeWidth={5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="pointer-events-none stroke-ink/70"
                            />
                        ) : null}
                        {total > 0 ? (
                            <path
                                d={line}
                                fill="none"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="pointer-events-none stroke-[oklch(0.8_0.1_195)]"
                            />
                        ) : null}
                        {active !== null && total > 0 ? (
                            <circle
                                cx={x(active)}
                                cy={y(average[active])}
                                r={4}
                                strokeWidth={2}
                                className="pointer-events-none fill-[oklch(0.8_0.1_195)] stroke-ink"
                            />
                        ) : null}
                    </svg>
                ) : null}

                {total === 0 ? (
                    <p
                        className="pointer-events-none absolute inset-x-0 text-center font-display text-[1.2rem] text-mist italic"
                        style={{
                            top: PAD.top + height / 2 - 14,
                            paddingLeft: PAD.left,
                        }}
                    >
                        {emptyMessage}
                    </p>
                ) : null}

                {shown && active !== null ? (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute z-10 w-[132px] -translate-x-1/2 rounded-[12px] px-3 py-2 glass-dark"
                        style={{
                            left: tipLeft,
                            top: Math.max(
                                0,
                                y(Math.max(shown.count, average[active])) - 82,
                            ),
                        }}
                    >
                        <p className="text-[15px] leading-tight font-medium text-bone">
                            {plural(shown.count)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-mist">
                            {long(shown.date)}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-smoke">
                            <span className="h-[2px] w-2.5 rounded-full bg-[oklch(0.8_0.1_195)]" />
                            avg {average[active].toFixed(1)}
                        </p>
                    </div>
                ) : null}
            </div>

            <figcaption className="sr-only">
                {plural(total)} in the last {data.length} days.
            </figcaption>

            <details className="group/table mt-3">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-[8px] text-[12px] text-smoke transition-colors hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                    <span className="group-open/table:hidden">
                        Show the numbers
                    </span>
                    <span className="hidden group-open/table:inline">
                        Hide the numbers
                    </span>
                </summary>
                <div className="mt-3 max-h-64 overflow-y-auto rounded-[14px] ring-1 ring-white/10 ring-inset">
                    <table className="w-full text-left text-[13px]">
                        <thead className="sticky top-0 bg-ink-raised">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-4 py-2 text-[10px] font-medium tracking-[0.2em] text-smoke uppercase"
                                >
                                    Day
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2 text-right text-[10px] font-medium tracking-[0.2em] text-smoke uppercase"
                                >
                                    {noun}s
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2 text-right text-[10px] font-medium tracking-[0.2em] text-smoke uppercase"
                                >
                                    7-day avg
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...data].reverse().map((day, reversed) => {
                                const index = data.length - 1 - reversed;

                                return (
                                    <tr
                                        key={day.date}
                                        className="border-t border-white/[0.06]"
                                    >
                                        <th
                                            scope="row"
                                            className="px-4 py-1.5 font-normal text-mist"
                                        >
                                            {long(day.date)}
                                        </th>
                                        <td className="px-4 py-1.5 text-right text-bone tabular-nums">
                                            {day.count}
                                        </td>
                                        <td className="px-4 py-1.5 text-right text-smoke tabular-nums">
                                            {average[index].toFixed(1)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </details>
        </figure>
    );
}
