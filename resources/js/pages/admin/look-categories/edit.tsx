import { Head } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/admin/button';
import { PageHeader } from '@/components/admin/page-header';
import type { LookCategoryFormProps } from '../looks/types';
import { CategoryForm } from './category-form';
import { DeleteCategory } from './delete-category';

export default function LookCategoriesEdit(props: LookCategoryFormProps) {
    const { category } = props;

    return (
        <>
            <Head title={`${category.name} · Categories · Admin`} />

            <PageHeader
                crumbs={[{ label: category.name }]}
                title={
                    <>
                        The <em>{category.name}</em> filter.
                    </>
                }
                description={
                    category.live_count > 0
                        ? 'On the landing page now. Changes go live when you save.'
                        : 'Not on the landing page yet: it appears once one of its looks is live.'
                }
                actions={
                    <DeleteCategory
                        category={{
                            id: category.id ?? 0,
                            name: category.name,
                            slug: category.slug,
                            looks_count: category.looks_count,
                        }}
                        trigger={
                            <Button variant="danger">
                                <Trash2 aria-hidden /> Delete
                            </Button>
                        }
                    />
                }
            />

            <CategoryForm {...props} />
        </>
    );
}
