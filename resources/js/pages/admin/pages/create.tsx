import { Head, Link } from '@inertiajs/react';
import PageController from '@/actions/App/Http/Controllers/Admin/PageController';
import { button } from '@/components/admin/button';
import { PageHeader } from '@/components/admin/page-header';
import { PageForm } from './page-form';
import type { PageFormProps } from './types';

export default function PagesCreate({
    page,
    html,
    htmlAr,
    footerGroups,
}: PageFormProps) {
    return (
        <>
            <Head title="New page · Admin" />
            <PageHeader
                crumbs={[{ label: 'New page' }]}
                title={
                    <>
                        A new <em>page.</em>
                    </>
                }
                description="Write it in English and Arabic, in Markdown. It stays hidden until you publish it, then it is served at its own address in each language."
                actions={
                    <Link
                        href={PageController.index.url()}
                        className={button({ variant: 'glass' })}
                    >
                        Cancel
                    </Link>
                }
            />
            <PageForm
                page={page}
                html={html}
                htmlAr={htmlAr}
                footerGroups={footerGroups}
            />
        </>
    );
}
