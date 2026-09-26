import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import StoryController from '@/actions/App/Http/Controllers/Admin/StoryController';
import { ArabicMissing } from '@/components/admin/arabic-missing';
import { Button, button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { SortableList } from '@/components/admin/sortable-list';
import { Toggle } from '@/components/admin/toggle';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import {
    STORY_FIELD_LABELS,
    TRANSLATABLE_STORY_FIELDS,
} from './partials/fields';
import { StoryPhoto } from './partials/focal-image';
import { splitQuote } from './partials/story-preview';
import type { StoriesIndexProps, StoryListItem } from './partials/types';

const pad = (n: number) => String(n).padStart(2, '0');

const nameLink =
    'rounded-[6px] transition-colors duration-300 ease-glass hover:text-mint focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none';

function QuoteExcerpt({ quote }: { quote: string }) {
    const parts = splitQuote(quote);

    return (
        <p className="line-clamp-2 font-display text-[15px] leading-snug text-pretty text-mist italic">
            {parts.before}
            <em className="text-mint not-italic">{parts.accent}</em>
            {parts.after}
        </p>
    );
}

/**
 * A quiet line under the store when some of the story is not in Arabic
 * yet: the Arabic page shows the English there.
 */
function StoryArabicMissing({ story }: { story: StoryListItem }) {
    return (
        <ArabicMissing
            as="p"
            fields={TRANSLATABLE_STORY_FIELDS.filter((field) =>
                story.arabic_missing.includes(field),
            ).map((field) => STORY_FIELD_LABELS[field].toLowerCase())}
            className="mt-1 md:truncate"
        />
    );
}

function StoryRow({
    story,
    index,
    handle,
    published,
    pending,
    onPublish,
}: {
    story: StoryListItem;
    index: number;
    handle: ReactNode;
    published: boolean;
    pending: boolean;
    onPublish: (published: boolean) => void;
}) {
    const editUrl = StoryController.edit.url(story.id);

    return (
        <div
            className={cn(
                'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] gap-x-3 gap-y-3 py-3 pr-4 pl-2',
                "[grid-template-areas:'handle_thumb_who_metric'_'handle_thumb_quote_quote'_'._controls_controls_controls']",
                "md:grid-cols-[auto_1.75rem_auto_minmax(0,1fr)_7rem_auto] md:items-center md:gap-x-4 md:[grid-template-areas:'handle_num_thumb_who_metric_controls']",
                "lg:grid-cols-[auto_1.75rem_auto_minmax(0,13rem)_minmax(0,1fr)_7rem_auto] lg:[grid-template-areas:'handle_num_thumb_who_quote_metric_controls']",
            )}
        >
            <div className="[grid-area:handle] max-md:self-start">{handle}</div>

            <span
                aria-hidden
                className="font-display text-[1.15rem] leading-none text-smoke tabular-nums [grid-area:num] max-md:hidden"
            >
                {pad(index + 1)}
            </span>

            <Link
                href={editUrl}
                tabIndex={-1}
                aria-hidden
                className="block w-12 shrink-0 self-start overflow-hidden rounded-[12px] ring-1 ring-white/[0.12] [grid-area:thumb] md:self-center"
            >
                {story.portrait ? (
                    <StoryPhoto
                        media={story.portrait}
                        alt=""
                        aspect={4 / 5}
                        focus={story.focus}
                        zoom={story.zoom}
                        width={48}
                        className={cn(
                            'w-12 transition-[filter,opacity] duration-500 ease-glass',
                            !published && 'opacity-60 grayscale',
                        )}
                    />
                ) : (
                    <span className="block aspect-[4/5] w-12 bg-white/[0.05]" />
                )}
            </Link>

            <div className="min-w-0 [grid-area:who]">
                <p className="text-[15px] leading-snug font-medium text-bone md:truncate">
                    <Link href={editUrl} className={nameLink}>
                        {story.name}
                    </Link>
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-smoke md:truncate">
                    {story.store} · {story.city}
                </p>
                <StoryArabicMissing story={story} />
            </div>

            <div className="min-w-0 [grid-area:quote] md:max-lg:hidden">
                <QuoteExcerpt quote={story.quote} />
            </div>

            <div className="flex flex-col items-end gap-1.5 text-right [grid-area:metric]">
                <span
                    className={cn(
                        'font-display text-[1.45rem] leading-none font-medium tabular-nums transition-colors duration-300 ease-glass',
                        published ? 'text-mint' : 'text-bone/50',
                    )}
                >
                    {story.metric.figure}
                </span>
                <span className="max-w-[7rem] truncate text-[10px] leading-none tracking-[0.18em] text-smoke uppercase">
                    {story.metric.short}
                </span>
            </div>

            <div className="flex items-center justify-between gap-3 [grid-area:controls] md:justify-end md:gap-2 md:pl-2">
                <Toggle
                    checked={published}
                    onCheckedChange={onPublish}
                    disabled={pending}
                    className="items-center gap-2.5 md:w-[6.5rem]"
                    label={
                        <>
                            <span className="sr-only">
                                Show {story.name}'s story on the landing page
                            </span>
                            <span
                                aria-hidden
                                className={cn(
                                    'text-[10px] font-medium tracking-[0.2em] uppercase',
                                    published ? 'text-mint' : 'text-smoke',
                                )}
                            >
                                {published ? 'Live' : 'Hidden'}
                            </span>
                        </>
                    }
                />
                <div className="flex items-center gap-1">
                    <Link
                        href={editUrl}
                        className={button({ variant: 'ghost', size: 'xs' })}
                    >
                        <Pencil aria-hidden /> Edit
                        <span className="sr-only"> {story.name}</span>
                    </Link>
                    <ConfirmDialog
                        trigger={
                            <Button
                                variant="danger"
                                size="xs"
                                aria-label={`Delete ${story.name}'s story`}
                            >
                                <Trash2 aria-hidden />
                            </Button>
                        }
                        title={
                            <>
                                Delete this <em>story?</em>
                            </>
                        }
                        description={`${story.name}'s story leaves the landing page and this list. An uploaded portrait is deleted with it. This can't be undone.`}
                        confirmLabel="Delete story"
                        form={StoryController.destroy.form(story.id)}
                    />
                </div>
            </div>
        </div>
    );
}

export default function StoriesIndex({ stories }: StoriesIndexProps) {
    // Switches flip at once; the server's answer replaces these.
    const [optimistic, setOptimistic] = useState<Record<number, boolean>>({});
    const [savingOrder, setSavingOrder] = useState(false);
    const live = stories.filter(
        (story) => optimistic[story.id] ?? story.is_published,
    ).length;

    const publish = (story: StoryListItem, published: boolean) => {
        setOptimistic((current) => ({ ...current, [story.id]: published }));

        router.patch(
            StoryController.publish.url(story.id),
            { is_published: published },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () =>
                    setOptimistic((current) => {
                        const next = { ...current };
                        delete next[story.id];

                        return next;
                    }),
            },
        );
    };

    const reorder = (next: StoryListItem[]) =>
        router.post(
            StoryController.reorder.url(),
            { ids: next.map((story) => story.id) },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setSavingOrder(true),
                onFinish: () => setSavingOrder(false),
            },
        );

    const addLink = (
        <Link href={StoryController.create.url()} className={button()}>
            <Plus aria-hidden /> Add a story
        </Link>
    );

    return (
        <>
            <Head title="Stories · Admin" />
            <PageHeader
                title={
                    <>
                        Store owners, <em>in their own words.</em>
                    </>
                }
                description="The people quoted in the landing page's Stories section, in the order it shows them. Hidden stories stay here, off the page."
                actions={
                    <>
                        <ViewOnSite href={`${home.url()}#stories`} />
                        {addLink}
                    </>
                }
            />

            <div className="mt-8 grid gap-5">
                {stories.length === 0 ? (
                    <Panel>
                        <EmptyState
                            title={
                                <>
                                    No stories <em>yet.</em>
                                </>
                            }
                            description="Each story is a store owner's quote, one figure from their first season and a portrait. Until you add one, the landing page has no Stories section."
                            action={
                                <Link
                                    href={StoryController.create.url()}
                                    className={button()}
                                >
                                    <Plus aria-hidden /> Add the first story
                                </Link>
                            }
                        />
                    </Panel>
                ) : (
                    <Panel
                        title="Page order"
                        description="Drag a handle, or focus it and press ↑ or ↓. The landing page follows the new order as soon as you let go."
                        actions={
                            <p
                                role="status"
                                className="text-[12px] text-smoke tabular-nums"
                            >
                                {savingOrder ? (
                                    <span className="text-mint">
                                        Saving the order…
                                    </span>
                                ) : live === stories.length ? (
                                    <span className="text-mist">
                                        All {live} live
                                    </span>
                                ) : (
                                    <>
                                        <span className="text-mist">
                                            {live} live
                                        </span>{' '}
                                        · {stories.length - live} hidden
                                    </>
                                )}
                            </p>
                        }
                        padded={false}
                        bodyClassName="p-2 sm:p-3"
                    >
                        <SortableList
                            label="Stories in page order"
                            items={stories}
                            getKey={(story) => story.id}
                            getLabel={(story) => story.name}
                            onReorder={reorder}
                            itemClassName="rounded-[18px] bg-white/[0.03] ring-1 ring-white/[0.07] ring-inset transition-colors duration-300 ease-glass hover:bg-white/[0.05]"
                            renderItem={(story, { handle, index }) => (
                                <StoryRow
                                    story={story}
                                    index={index}
                                    handle={handle}
                                    published={
                                        optimistic[story.id] ??
                                        story.is_published
                                    }
                                    pending={story.id in optimistic}
                                    onPublish={(published) =>
                                        publish(story, published)
                                    }
                                />
                            )}
                        />
                    </Panel>
                )}
            </div>
        </>
    );
}
