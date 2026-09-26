import { Head } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import LookController from '@/actions/App/Http/Controllers/Admin/LookController';
import { Button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { PageHeader } from '@/components/admin/page-header';
import { ViewOnSite } from '@/components/admin/view-on-site';
import { home } from '@/routes';
import { LookForm } from './look-form';
import type { LookFormProps } from './types';

export default function LooksEdit(props: LookFormProps) {
    const { look, position } = props;
    const number = String(position).padStart(2, '0');
    const id = look.id ?? 0;
    const uploads = [look.after, look.before].some(
        (media) => media?.kind === 'upload',
    );

    return (
        <>
            <Head title={`${look.title} · Looks · Admin`} />

            <PageHeader
                crumbs={[{ label: look.title }]}
                title={
                    <>
                        Look {number}, <em>{look.city}.</em>
                    </>
                }
                description={
                    look.is_published
                        ? `N° ${number} in the lookbook, live on the landing page. Changes go live when you save.`
                        : `N° ${number} in the lookbook, hidden from the landing page.`
                }
                actions={
                    <>
                        <ViewOnSite href={`${home.url()}#lookbook`} />
                        <ConfirmDialog
                            trigger={
                                <Button variant="danger">
                                    <Trash2 aria-hidden /> Delete
                                </Button>
                            }
                            title={
                                <>
                                    Delete this <em>look?</em>
                                </>
                            }
                            description={`“${look.title}” leaves the lookbook${uploads ? ' and its uploaded photos are deleted' : ''}. This can't be undone.`}
                            confirmLabel="Delete look"
                            form={LookController.destroy.form(id)}
                        />
                    </>
                }
            />

            <LookForm {...props} />
        </>
    );
}
