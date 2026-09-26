import { Head } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import PageController from '@/actions/App/Http/Controllers/Admin/PageController';
import { Button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { PageHeader } from '@/components/admin/page-header';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { show as showArabic } from '@/routes/ar/pages';
import { show } from '@/routes/pages';
import { PageForm } from './page-form';
import type { EditablePage, PageFormProps } from './types';

/** Where the saved page can be read, in a sentence. */
function whereItLives(page: EditablePage, groupLabel: string | null): string {
    const addresses = `/pages/${page.slug} and /ar/pages/${page.slug}`;

    if (!page.is_published) {
        return `Hidden. Visitors get a “not found” page at ${addresses}; admins can still open both.`;
    }

    return groupLabel
        ? `Live at ${addresses}, linked from the ${groupLabel} column of the footer.`
        : `Live at ${addresses}. No footer column links to it.`;
}

export default function PagesEdit({
    page,
    html,
    htmlAr,
    footerGroups,
}: PageFormProps) {
    const id = page.id ?? 0;
    const groupLabel =
        footerGroups.find((group) => group.value === page.footer_group)
            ?.label ?? null;

    return (
        <>
            <Head title={`${page.title} · Pages · Admin`} />
            <PageHeader
                crumbs={[{ label: page.title }]}
                title={
                    <>
                        The <em>{page.title}</em> page.
                    </>
                }
                description={whereItLives(page, groupLabel)}
                actions={
                    <>
                        <ViewOnSite href={show.url(page.slug)} />
                        <ViewOnSite href={showArabic.url(page.slug)}>
                            View in Arabic
                        </ViewOnSite>
                        <ConfirmDialog
                            trigger={
                                <Button variant="danger">
                                    <Trash2 aria-hidden /> Delete
                                </Button>
                            }
                            title={
                                <>
                                    Delete this <em>page?</em>
                                </>
                            }
                            description={`“${page.title}” is removed${page.footer_group ? ' from the footer' : ''}, and /pages/${page.slug} and /ar/pages/${page.slug} stop working. This cannot be undone.`}
                            confirmLabel="Delete page"
                            form={PageController.destroy.form(id)}
                        />
                    </>
                }
            />
            {/* A save remounts the form, so it starts again from the saved page. */}
            <PageForm
                key={page.updated_at ?? 'new'}
                page={page}
                html={html}
                htmlAr={htmlAr}
                footerGroups={footerGroups}
            />
        </>
    );
}
