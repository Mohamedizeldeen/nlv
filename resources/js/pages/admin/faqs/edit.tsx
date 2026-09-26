import { Head } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import FaqController from '@/actions/App/Http/Controllers/Admin/FaqController';
import { Button } from '@/components/admin/button';
import { ConfirmDialog } from '@/components/admin/dialog';
import { PageHeader } from '@/components/admin/page-header';
import { FaqForm } from './partials/faq-form';
import type { AdminFaq, FaqFormProps } from './types';

function shorten(text: string, length = 48): string {
    return text.length > length
        ? `${text.slice(0, length - 1).trimEnd()}…`
        : text;
}

export default function FaqEdit({
    faq,
    published,
    heading,
}: FaqFormProps & { faq: AdminFaq }) {
    return (
        <>
            <Head title="Edit question · FAQ · Admin" />
            <PageHeader
                crumbs={[{ label: shorten(faq.question) }]}
                title={
                    <>
                        Edit the <em>question.</em>
                    </>
                }
                description="Changes show under the plans as soon as you save."
                actions={
                    <ConfirmDialog
                        trigger={
                            <Button variant="danger">
                                <Trash2 aria-hidden /> Delete
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
                }
            />
            <FaqForm
                key={faq.updated_at ?? faq.id}
                faq={faq}
                published={published}
                heading={heading}
            />
        </>
    );
}
