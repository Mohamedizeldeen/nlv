import { Form, Link } from '@inertiajs/react';
import { useState } from 'react';
import CurrencyController from '@/actions/App/Http/Controllers/Admin/CurrencyController';
import PlanController from '@/actions/App/Http/Controllers/Admin/PlanController';
import { button } from '@/components/admin/button';
import { FieldError } from '@/components/admin/field';
import { Panel } from '@/components/admin/panel';
import { SortableList } from '@/components/admin/sortable-list';
import { Badge } from '@/components/admin/status-badge';
import { Toggle } from '@/components/admin/toggle';
import { cn } from '@/lib/utils';
import type { AdminPlan, CurrencyRow } from '../types';

const toggleId = (code: string) => `currency-switch-${code}`;

/**
 * A hidden currency switched back on goes to its place in the site's list
 * (config order), right after the shown currencies that come before it
 * there, instead of trailing the list.
 */
export function enableCurrency(
    rows: CurrencyRow[],
    code: string,
): CurrencyRow[] {
    const row = rows.find((item) => item.code === code);

    if (!row) {
        return rows;
    }

    const rest = rows.filter((item) => item.code !== code);
    let at = 0;

    rest.forEach((item, index) => {
        if (item.enabled && item.position < row.position) {
            at = index + 1;
        }
    });

    return [...rest.slice(0, at), { ...row, enabled: true }, ...rest.slice(at)];
}

/**
 * Which currencies the landing's switch offers, and in what order. Saved
 * as one `pricing.updated` log entry. A currency can only be shown once
 * every plan with a figure has a price in it.
 */
export function CurrenciesPanel({
    options,
    plans,
    className,
}: {
    options: CurrencyRow[];
    plans: AdminPlan[];
    className?: string;
}) {
    const [rows, setRows] = useState(options);
    const [source, setSource] = useState(options);

    // Fresh props after a save replace the local draft.
    if (options !== source) {
        setSource(options);
        setRows(options);
    }

    const enabledCount = rows.filter((row) => row.enabled).length;
    const dirty =
        JSON.stringify(rows.map((row) => [row.code, row.enabled])) !==
        JSON.stringify(options.map((row) => [row.code, row.enabled]));

    const planKey = (name: string) =>
        plans.find((plan) => plan.name === name)?.key;

    const setEnabled = (code: string, enabled: boolean) => {
        // One switched off in this session keeps its place (switching it
        // back on undoes that); one that was hidden when the page loaded
        // sits at the end of the list and goes back to its own place.
        const hiddenOnLoad = options.some(
            (row) => row.code === code && !row.enabled,
        );

        setRows((current) =>
            enabled && hiddenOnLoad
                ? enableCurrency(current, code)
                : current.map((row) =>
                      row.code === code ? { ...row, enabled } : row,
                  ),
        );

        // The row may have moved: keep the keyboard on its switch.
        requestAnimationFrame(() => {
            const toggle = document.getElementById(toggleId(code));

            if (toggle && document.activeElement !== toggle) {
                toggle.focus({ preventScroll: true });
            }
        });
    };

    return (
        <Form
            {...CurrencyController.update.form()}
            options={{ preserveScroll: true }}
            className={className}
        >
            {({ errors, processing }) => (
                <Panel
                    title="Currencies"
                    description="The currency switch above the plans: which currencies it offers, and in what order. The first is shown first."
                    variant="strong"
                    footer={
                        <>
                            {dirty ? (
                                <button
                                    type="button"
                                    onClick={() => setRows(options)}
                                    className={button({ variant: 'ghost' })}
                                >
                                    Discard
                                </button>
                            ) : null}
                            <button
                                type="submit"
                                disabled={processing || !dirty}
                                className={button()}
                            >
                                {processing ? 'Saving…' : 'Save currencies'}
                            </button>
                        </>
                    }
                >
                    <SortableList
                        label="Currencies in switch order"
                        items={rows}
                        getKey={(row) => row.code}
                        getLabel={(row) => row.name}
                        onReorder={setRows}
                        itemClassName="rounded-[16px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
                        renderItem={(row, { handle }) => {
                            const blocked =
                                !row.enabled && row.missing.length > 0;
                            const last = row.enabled && enabledCount === 1;

                            return (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-2 pr-3 sm:flex-nowrap sm:pr-4">
                                    {handle}
                                    <span
                                        className={cn(
                                            'w-11 shrink-0 text-[12px] font-medium tracking-[0.2em] tabular-nums',
                                            row.enabled
                                                ? 'text-bone'
                                                : 'text-smoke',
                                        )}
                                    >
                                        {row.code}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className={cn(
                                                'block truncate text-[14px] first-letter:uppercase',
                                                row.enabled
                                                    ? 'text-bone'
                                                    : 'text-mist',
                                            )}
                                        >
                                            {row.name}
                                        </span>
                                        {row.missing.length ? (
                                            <span className="block text-[12px] leading-snug text-smoke">
                                                No price on{' '}
                                                {row.missing.map(
                                                    (name, index) => {
                                                        const key =
                                                            planKey(name);

                                                        return (
                                                            <span key={name}>
                                                                {index > 0
                                                                    ? ' and '
                                                                    : null}
                                                                {key ? (
                                                                    <Link
                                                                        href={PlanController.edit.url(
                                                                            key,
                                                                        )}
                                                                        className="text-mist underline decoration-white/25 underline-offset-4 hover:text-bone"
                                                                    >
                                                                        {name}
                                                                    </Link>
                                                                ) : (
                                                                    name
                                                                )}
                                                            </span>
                                                        );
                                                    },
                                                )}{' '}
                                                yet.
                                            </span>
                                        ) : null}
                                    </span>
                                    {row.enabled ? (
                                        <input
                                            type="hidden"
                                            name="currencies[]"
                                            value={row.code}
                                        />
                                    ) : (
                                        <Badge
                                            tone="muted"
                                            className="max-sm:hidden"
                                        >
                                            Hidden
                                        </Badge>
                                    )}
                                    <Toggle
                                        id={toggleId(row.code)}
                                        checked={row.enabled}
                                        onCheckedChange={(checked) =>
                                            setEnabled(row.code, checked)
                                        }
                                        disabled={blocked || last}
                                        label={
                                            <span className="sr-only">
                                                Show {row.name}
                                            </span>
                                        }
                                    />
                                </div>
                            );
                        }}
                    />
                    <div className="mt-4 grid gap-1">
                        {errors.currencies ? (
                            <FieldError>{errors.currencies}</FieldError>
                        ) : null}
                        {Object.entries(errors)
                            .filter(([key]) => key.startsWith('currencies.'))
                            .map(([key, message]) => (
                                <FieldError key={key}>{message}</FieldError>
                            ))}
                        <p className="text-[12.5px] leading-relaxed text-smoke">
                            At least one currency stays on. Amounts are never
                            converted: each plan keeps its own price per
                            currency, and hiding a currency keeps its prices.
                        </p>
                    </div>
                </Panel>
            )}
        </Form>
    );
}
