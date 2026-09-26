import { Head, Link } from '@inertiajs/react';
import LookController from '@/actions/App/Http/Controllers/Admin/LookController';
import { button } from '@/components/admin/button';
import { PageHeader } from '@/components/admin/page-header';
import { LookForm } from './look-form';
import type { LookFormProps } from './types';

export default function LooksCreate(props: LookFormProps) {
    return (
        <>
            <Head title="New look · Admin" />

            <PageHeader
                crumbs={[{ label: 'New look' }]}
                title={
                    <>
                        A new <em>look.</em>
                    </>
                }
                description={`A try-on photo for the lookbook. It goes in at N° ${String(props.position).padStart(2, '0')}, after the last look; reorder it from the list.`}
                actions={
                    <Link
                        href={LookController.index.url()}
                        className={button({ variant: 'glass' })}
                    >
                        Cancel
                    </Link>
                }
            />

            <LookForm {...props} />
        </>
    );
}
