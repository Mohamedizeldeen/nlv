import { Head, Link } from '@inertiajs/react';
import LookCategoryController from '@/actions/App/Http/Controllers/Admin/LookCategoryController';
import { button } from '@/components/admin/button';
import { PageHeader } from '@/components/admin/page-header';
import type { LookCategoryFormProps } from '../looks/types';
import { CategoryForm } from './category-form';

export default function LookCategoriesCreate(props: LookCategoryFormProps) {
    return (
        <>
            <Head title="New category · Admin" />

            <PageHeader
                crumbs={[{ label: 'New category' }]}
                title={
                    <>
                        A new <em>filter.</em>
                    </>
                }
                description="A tab above the lookbook grid, with its own note for the week. It goes in after the last one; reorder it from the list."
                actions={
                    <Link
                        href={LookCategoryController.index.url()}
                        className={button({ variant: 'glass' })}
                    >
                        Cancel
                    </Link>
                }
            />

            <CategoryForm {...props} />
        </>
    );
}
