import { Head, Link } from '@inertiajs/react';
import FaqController from '@/actions/App/Http/Controllers/Admin/FaqController';
import { button } from '@/components/admin/button';
import { PageHeader } from '@/components/admin/page-header';
import { FaqForm } from './partials/faq-form';
import type { FaqFormProps } from './types';

export default function FaqCreate({ published, heading }: FaqFormProps) {
    return (
        <>
            <Head title="New question · FAQ · Admin" />
            <PageHeader
                crumbs={[{ label: 'New question' }]}
                title={
                    <>
                        A new <em>question.</em>
                    </>
                }
                description="It joins the end of the row under the plans. Reorder it from the list."
                actions={
                    <Link
                        href={FaqController.index.url()}
                        className={button({ variant: 'glass' })}
                    >
                        Cancel
                    </Link>
                }
            />
            <FaqForm faq={null} published={published} heading={heading} />
        </>
    );
}
