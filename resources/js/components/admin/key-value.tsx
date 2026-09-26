import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type KeyValueItem = {
    label: string;
    value: ReactNode;
    /** Span the full width (long text such as a message). */
    wide?: boolean;
};

/**
 * Label/value pairs as a definition list: spaced-caps labels over bone
 * values, hairlines between rows. Empty values print a quiet dash.
 */
export function KeyValue({
    items,
    columns = 2,
    className,
}: {
    items: KeyValueItem[];
    /** Columns from `sm` up (phones always use one). */
    columns?: 1 | 2 | 3;
    className?: string;
}) {
    return (
        <dl
            className={cn(
                'grid gap-x-8',
                columns === 2 && 'sm:grid-cols-2',
                columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
                className,
            )}
        >
            {items.map((item) => {
                const empty =
                    item.value === null ||
                    item.value === undefined ||
                    item.value === '';

                return (
                    <div
                        key={item.label}
                        className={cn(
                            'min-w-0 border-b border-white/[0.08] py-3',
                            item.wide && 'sm:col-span-full',
                        )}
                    >
                        <dt className="text-[10px] font-medium tracking-[0.22em] text-smoke uppercase">
                            {item.label}
                        </dt>
                        <dd
                            className={cn(
                                'mt-1.5 text-[15px] leading-relaxed [overflow-wrap:anywhere]',
                                empty ? 'text-smoke' : 'text-bone',
                                item.wide && 'whitespace-pre-line',
                            )}
                        >
                            {empty ? '—' : item.value}
                        </dd>
                    </div>
                );
            })}
        </dl>
    );
}
