import { Head, Link } from '@inertiajs/react';
import StoryController from '@/actions/App/Http/Controllers/Admin/StoryController';
import { button } from '@/components/admin/button';
import { PageHeader } from '@/components/admin/page-header';
import { StoryForm } from './partials/story-form';
import type { StoryCreateProps } from './partials/types';

const pad = (n: number) => String(n).padStart(2, '0');

export default function StoriesCreate({
    story,
    position,
    total,
    limits,
}: StoryCreateProps) {
    return (
        <>
            <Head title="Add a story · Admin" />
            <PageHeader
                crumbs={[{ label: 'New story' }]}
                title={
                    <>
                        A new voice for the <em>landing page.</em>
                    </>
                }
                description="A store owner, what they said about their first season, one figure to back it, and a portrait."
                actions={
                    <Link
                        href={StoryController.index.url()}
                        className={button({ variant: 'glass' })}
                    >
                        Cancel
                    </Link>
                }
            />

            <StoryForm
                story={story}
                limits={limits}
                target={StoryController.store.form()}
                positionNote={
                    <>
                        Added last:{' '}
                        <span className="text-mist tabular-nums">
                            N° {pad(position)} of {pad(total)}
                        </span>
                        .{' '}
                        <Link
                            href={StoryController.index.url()}
                            className="text-mist underline decoration-white/25 underline-offset-4 transition-colors duration-300 ease-glass hover:text-bone"
                        >
                            Reorder from the list
                        </Link>
                        .
                    </>
                }
            />
        </>
    );
}
