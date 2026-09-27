import type { ReactNode } from 'react';

/**
 * A short numbered sequence set like the landing's section numbers
 * ("01", "02" in mint), with hairlines between the steps.
 */
export function NextSteps({ steps }: { steps: ReactNode[] }) {
    return (
        <ol className="grid">
            {steps.map((step, index) => (
                <li
                    key={index}
                    className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 border-t border-white/[0.08] py-3.5 first:border-t-0 first:pt-0 last:pb-0"
                >
                    <span
                        aria-hidden
                        className="pt-px text-[11px] font-medium tracking-[0.18em] text-mint tabular-nums"
                    >
                        {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[14px] leading-relaxed text-pretty text-mist [&_strong]:font-medium [&_strong]:text-bone">
                        {step}
                    </span>
                </li>
            ))}
        </ol>
    );
}
