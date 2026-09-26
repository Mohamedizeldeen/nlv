import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import StoryController from '@/actions/App/Http/Controllers/Admin/StoryController';
import { Button, button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { describeEvent } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/admin/panel';
import { RelativeTime } from '@/components/admin/relative-time';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { home } from '@/routes';
import { StoryForm } from './partials/story-form';
import type { StoryEditProps, StoryHistoryEntry } from './partials/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** The activity log, narrowed to content changes that mention this story. */
const ACTIVITY = '/admin/activity';

function History({
    entries,
    name,
}: {
    entries: StoryHistoryEntry[];
    name: string;
}) {
    return (
        <Panel
            title="History"
            description="Every change to this story, as the activity log recorded it."
            padded={false}
            actions={
                <Link
                    href={`${ACTIVITY}?${new URLSearchParams({ group: 'content', search: name }).toString()}`}
                    className={button({ variant: 'ghost', size: 'xs' })}
                >
                    Activity log <ArrowUpRight aria-hidden />
                </Link>
            }
        >
            {entries.length === 0 ? (
                <EmptyState
                    compact
                    title={
                        <>
                            No changes <em>yet.</em>
                        </>
                    }
                    description="Edits, reorders and visibility changes will be listed here."
                />
            ) : (
                <ol className="divide-y divide-white/[0.07]">
                    {entries.map((entry) => {
                        const { subject, action } = describeEvent(entry.event);

                        return (
                            <li
                                key={entry.id}
                                className="grid gap-1 px-5 py-3 sm:px-6"
                            >
                                <div className="flex items-baseline justify-between gap-3">
                                    <p className="truncate text-[10px] font-medium tracking-[0.2em] text-smoke uppercase">
                                        <span className="text-mist">
                                            {subject}
                                        </span>
                                        {action ? <> · {action}</> : null}
                                        {entry.user ? (
                                            <> · {entry.user}</>
                                        ) : null}
                                    </p>
                                    <RelativeTime
                                        value={entry.createdAt}
                                        className="shrink-0 text-[12px] text-smoke tabular-nums"
                                    />
                                </div>
                                <p className="text-[13.5px] leading-snug text-pretty text-mist">
                                    {entry.description}
                                </p>
                            </li>
                        );
                    })}
                </ol>
            )}
        </Panel>
    );
}

export default function StoriesEdit({
    story,
    position,
    total,
    limits,
    history,
}: StoryEditProps) {
    const firstName = story.name.split(' ')[0] || story.name;

    return (
        <>
            <Head title={`${story.name} · Stories · Admin`} />
            <PageHeader
                crumbs={[{ label: story.name }]}
                title={
                    <>
                        The story of <em>{firstName}.</em>
                    </>
                }
                description={
                    <>
                        {story.role}, {story.store}, {story.city}.{' '}
                        <span className="text-smoke">
                            N° {pad(position)} of {pad(total)} on the landing
                            page
                            {story.is_published ? '' : ' (hidden)'}
                            {story.updated_at ? (
                                <>
                                    {' '}
                                    · updated{' '}
                                    <RelativeTime value={story.updated_at} />
                                </>
                            ) : null}
                            .
                        </span>
                    </>
                }
                actions={
                    <>
                        <ViewOnSite href={`${home.url()}#stories`} />
                        <ConfirmDialog
                            trigger={
                                <Button variant="danger">
                                    <Trash2 aria-hidden /> Delete
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
                    </>
                }
            />

            {/* A fresh form after every save, so the new values become the baseline. */}
            <StoryForm
                key={story.updated_at ?? 'new'}
                story={story}
                limits={limits}
                target={StoryController.update.form(story.id)}
                positionNote={
                    <>
                        <span className="text-mist tabular-nums">
                            N° {pad(position)} of {pad(total)}
                        </span>{' '}
                        in the Stories section.{' '}
                        <Link
                            href={StoryController.index.url()}
                            className="text-mist underline decoration-white/25 underline-offset-4 transition-colors duration-300 ease-glass hover:text-bone"
                        >
                            Reorder from the list
                        </Link>
                        .
                    </>
                }
            >
                <History entries={history} name={story.name} />
            </StoryForm>
        </>
    );
}
