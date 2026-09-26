import { Link, router, usePage } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TextInput } from './text-input';
import type { TextInputProps } from './text-input';

/** Query parameters a filter change keeps (everything else is replaced). */
const KEPT = ['sort', 'direction', 'per_page'];

type FilterBarProps = {
    /** Filter controls with `name`s: SearchInput, Select size="sm", TextInput type="date"… */
    children: ReactNode;
    /** Where to send the query (defaults to the current path). */
    action?: string;
    /** Apply on every change (text fields after a short pause). Default true. */
    autoSubmit?: boolean;
    /** Something at the right edge, e.g. "212 leads" or an Export link. */
    aside?: ReactNode;
    className?: string;
};

/**
 * One row of filters above a table. Submits as a GET visit with the
 * non-empty values as query parameters (keeping the sort, dropping the
 * page), so filtered views are shareable URLs. The controller reads them
 * back and passes them as props for the fields' `defaultValue`s.
 */
export function FilterBar({
    children,
    action,
    autoSubmit = true,
    aside,
    className,
}: FilterBarProps) {
    const { url } = usePage();
    const form = useRef<HTMLFormElement>(null);
    const timer = useRef<number | undefined>(undefined);
    const current = new URL(url, 'http://localhost');
    const target = action ?? current.pathname;
    const filtered = [...current.searchParams.keys()].some(
        (key) => ![...KEPT, 'page'].includes(key),
    );

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const submit = () => {
        const node = form.current;

        if (!node) {
            return;
        }

        const query: Record<string, string> = {};

        for (const key of KEPT) {
            const kept = current.searchParams.get(key);

            if (kept) {
                query[key] = kept;
            }
        }

        for (const [key, value] of new FormData(node).entries()) {
            if (typeof value === 'string' && value.trim() !== '') {
                query[key] = value.trim();
            }
        }

        router.get(target, query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        window.clearTimeout(timer.current);
        submit();
    };

    const onChange = (event: ChangeEvent<HTMLFormElement>) => {
        if (!autoSubmit) {
            return;
        }

        const field = event.target as unknown as HTMLInputElement;
        const typing =
            field.tagName === 'INPUT' &&
            ['text', 'search', 'email'].includes(field.type);

        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(submit, typing ? 450 : 0);
    };

    const clearQuery = Object.fromEntries(
        KEPT.flatMap((key) => {
            const kept = current.searchParams.get(key);

            return kept ? [[key, kept]] : [];
        }),
    );
    const clearHref = `${target}${
        Object.keys(clearQuery).length
            ? `?${new URLSearchParams(clearQuery).toString()}`
            : ''
    }`;

    return (
        <form
            ref={form}
            role="search"
            onSubmit={onSubmit}
            onChange={onChange}
            className={cn('flex flex-wrap items-center gap-2', className)}
        >
            {children}
            {autoSubmit ? null : (
                <button
                    type="submit"
                    className="h-9 cursor-pointer rounded-[12px] bg-white/[0.08] px-3.5 text-[13px] text-bone ring-1 ring-white/[0.14] transition-colors ring-inset hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                >
                    Apply
                </button>
            )}
            {filtered ? (
                <Link
                    href={clearHref}
                    preserveScroll
                    className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-2.5 text-[13px] text-smoke transition-colors duration-300 ease-glass hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                >
                    <X aria-hidden className="size-3.5" />
                    Clear filters
                </Link>
            ) : null}
            {aside ? (
                <div className="ml-auto flex items-center gap-2 text-[13px] text-smoke">
                    {aside}
                </div>
            ) : null}
        </form>
    );
}

/** A compact search field for <FilterBar> (type="search", magnifier icon). */
export function SearchInput({
    className,
    placeholder = 'Search',
    ...props
}: Omit<TextInputProps, 'leading' | 'size' | 'type'>) {
    return (
        <TextInput
            type="search"
            size="sm"
            leading={<Search aria-hidden />}
            placeholder={placeholder}
            aria-label={props['aria-label'] ?? placeholder}
            className={cn('w-full sm:w-72', className)}
            {...props}
        />
    );
}
