import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import FaqController from '@/actions/App/Http/Controllers/Admin/FaqController';
import {
    bilingualValue,
    localeProps,
    localized,
} from '@/components/admin/bilingual';
import type { ContentLocale } from '@/components/admin/bilingual';
import { Button, button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { EmptyState, NoMatches } from '@/components/admin/empty-state';
import { FilterBar, SearchInput } from '@/components/admin/filter-bar';
import { plural } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { PreviewLocaleToggle } from '@/components/admin/preview-locale-toggle';
import { Select } from '@/components/admin/select';
import { SortableList } from '@/components/admin/sortable-list';
import { Toggle } from '@/components/admin/toggle';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { cn } from '@/lib/utils';
import { ArabicMissing } from '@/components/admin/arabic-missing';
import { FaqRow } from './partials/faq-row';
import type { AdminFaq, FaqsIndexProps } from './types';

const STATUS_OPTIONS = [
    { value: 'live', label: 'Live' },
    { value: 'hidden', label: 'Hidden' },
];

function FaqActions({ faq }: { faq: AdminFaq }) {
    return (
        <>
            <Link
                href={FaqController.edit.url(faq)}
                className={button({ variant: 'ghost', size: 'xs' })}
            >
                <Pencil aria-hidden /> Edit
            </Link>
            <ConfirmDialog
                trigger={
                    <Button
                        variant="danger"
                        size="xs"
                        aria-label={`Delete “${faq.question}”`}
                    >
                        <Trash2 aria-hidden />
                    </Button>
                }
                title={
                    <>
                        Delete this <em>question?</em>
                    </>
                }
                description={`“${faq.question}” and its answer are removed${faq.is_published ? ' from the landing page' : ''}. This can’t be undone.`}
                confirmLabel="Delete question"
                form={FaqController.destroy.form(faq)}
            />
        </>
    );
}

export default function FaqsIndex({
    faqs,
    filters,
    counts,
    published,
    heading,
}: FaqsIndexProps) {
    const filtered = Boolean(filters.search || filters.status);
    // Switches flip at once; the server's answer replaces this.
    const [optimistic, setOptimistic] = useState<Record<number, boolean>>({});
    const [locale, setLocale] = useState<ContentLocale>('en');

    const publish = (faq: AdminFaq, next: boolean) => {
        setOptimistic((current) => ({ ...current, [faq.id]: next }));
        router.patch(
            FaqController.publish.url(faq),
            { is_published: next },
            {
                preserveScroll: true,
                onFinish: () =>
                    setOptimistic((current) => {
                        const rest = { ...current };
                        delete rest[faq.id];

                        return rest;
                    }),
            },
        );
    };

    const reorder = (next: AdminFaq[]) =>
        router.post(
            FaqController.reorder.url(),
            { ids: next.map((faq) => faq.id) },
            { preserveScroll: true },
        );

    const hidden = counts.all - counts.live;

    return (
        <>
            <Head title="FAQ · Admin" />
            <PageHeader
                title={
                    <>
                        Questions before <em>the order.</em>
                    </>
                }
                description="The answers under the plans on the landing page, in page order."
                actions={
                    <>
                        <ViewOnSite href="/#pricing" />
                        <Link
                            href={FaqController.create.url()}
                            className={button()}
                        >
                            <Plus aria-hidden /> Add a question
                        </Link>
                    </>
                }
            />

            <div className="mt-8 grid gap-5">
                {counts.all > 0 ? (
                    <FilterBar
                        aside={
                            <span>
                                {plural(counts.all, 'question')} · {counts.live}{' '}
                                live
                                {hidden ? ` · ${hidden} hidden` : null}
                            </span>
                        }
                    >
                        <SearchInput
                            name="search"
                            defaultValue={filters.search ?? ''}
                            placeholder="Search, in English or Arabic"
                        />
                        <Select
                            size="sm"
                            name="status"
                            aria-label="Status"
                            placeholder="Live and hidden"
                            options={STATUS_OPTIONS}
                            defaultValue={filters.status ?? ''}
                            className="w-44"
                        />
                    </FilterBar>
                ) : null}

                <Panel
                    padded={false}
                    variant="strong"
                    title={filtered ? 'Matching questions' : 'In page order'}
                    description={
                        filtered
                            ? 'Clear the filters to change the order.'
                            : 'Drag a handle, or focus it and press the arrow keys. The order saves as you drop.'
                    }
                >
                    {counts.all === 0 ? (
                        <EmptyState
                            title={
                                <>
                                    No questions <em>yet.</em>
                                </>
                            }
                            description="Questions and their answers appear under the plans on the landing page, three to a row."
                            action={
                                <Link
                                    href={FaqController.create.url()}
                                    className={button()}
                                >
                                    <Plus aria-hidden /> Add the first question
                                </Link>
                            }
                        />
                    ) : faqs.length === 0 ? (
                        <NoMatches
                            noun="questions"
                            clearHref={FaqController.index.url()}
                        />
                    ) : (
                        <SortableList
                            label="Questions in page order"
                            items={faqs}
                            getKey={(faq) => faq.id}
                            getLabel={(faq) => faq.question}
                            onReorder={reorder}
                            disabled={filtered}
                            className="p-3 sm:p-4"
                            itemClassName="rounded-[16px] bg-white/[0.04] ring-1 ring-white/[0.08] ring-inset"
                            renderItem={(faq, { handle, index }) => {
                                const live =
                                    optimistic[faq.id] ?? faq.is_published;

                                return (
                                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2 p-2 pr-3 sm:flex-nowrap sm:items-center sm:pr-4">
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            {handle}
                                            <span className="w-6 shrink-0 pt-2.5 text-[11px] text-smoke tabular-nums">
                                                {String(index + 1).padStart(
                                                    2,
                                                    '0',
                                                )}
                                            </span>
                                            <div className="min-w-0 flex-1 py-1.5">
                                                <Link
                                                    href={FaqController.edit.url(
                                                        faq,
                                                    )}
                                                    className={cn(
                                                        'rounded-[6px] text-[15px] leading-snug font-medium transition-colors duration-300 ease-glass hover:text-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none',
                                                        live
                                                            ? 'text-bone'
                                                            : 'text-mist',
                                                    )}
                                                >
                                                    {faq.question}
                                                </Link>
                                                <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-smoke">
                                                    {faq.answer}
                                                </p>
                                                <ArabicMissing
                                                    fields={faq.missing_arabic}
                                                    className="mt-1.5 block"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5 max-sm:w-full max-sm:justify-between max-sm:pl-[5.25rem]">
                                            <Toggle
                                                checked={live}
                                                onCheckedChange={(next) =>
                                                    publish(faq, next)
                                                }
                                                className="mr-2 items-center"
                                                label={
                                                    <>
                                                        <span className="sr-only">
                                                            Show on the landing
                                                            page: {faq.question}
                                                        </span>
                                                        <span
                                                            aria-hidden
                                                            className={cn(
                                                                'inline-block w-14 text-[10px] font-medium tracking-[0.2em] uppercase',
                                                                live
                                                                    ? 'text-mint'
                                                                    : 'text-smoke',
                                                            )}
                                                        >
                                                            {live
                                                                ? 'Live'
                                                                : 'Hidden'}
                                                        </span>
                                                    </>
                                                }
                                            />
                                            <div className="flex items-center gap-1">
                                                <FaqActions faq={faq} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }}
                        />
                    )}
                </Panel>

                {counts.all > 0 ? (
                    <Panel
                        kicker="Preview"
                        title="Under the plans, as visitors see it"
                        description={
                            published.length
                                ? `${plural(published.length, 'live question')}, in page order.`
                                : undefined
                        }
                        actions={
                            published.length ? (
                                <PreviewLocaleToggle
                                    value={locale}
                                    onValueChange={setLocale}
                                />
                            ) : undefined
                        }
                    >
                        {published.length ? (
                            <div {...localeProps(locale)}>
                                <FaqRow
                                    heading={heading[locale]}
                                    items={published.map((item) => ({
                                        id: item.id,
                                        question: localized(
                                            bilingualValue(item, 'question'),
                                            locale,
                                        ),
                                        answer: localized(
                                            bilingualValue(item, 'answer'),
                                            locale,
                                        ),
                                    }))}
                                />
                            </div>
                        ) : (
                            <EmptyState
                                compact
                                title={
                                    <>
                                        Nothing on the <em>page.</em>
                                    </>
                                }
                                description="Every question is hidden: nothing shows under the plans."
                            />
                        )}
                    </Panel>
                ) : null}
            </div>
        </>
    );
}
