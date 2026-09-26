import { Link } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import LookCategoryController from '@/actions/App/Http/Controllers/Admin/LookCategoryController';
import LookController from '@/actions/App/Http/Controllers/Admin/LookController';
import { Button, button } from '@/components/admin/button';
import { ConfirmDialog, Modal } from '@/components/admin/dialog';
import { plural } from '@/components/admin/format';

/**
 * Delete for a category. An empty one asks for confirmation; one that
 * still has looks explains what to do first (the server refuses too).
 */
export function DeleteCategory({
    category,
    trigger,
}: {
    category: { id: number; name: string; slug: string; looks_count: number };
    /** Defaults to a small coral icon button. */
    trigger?: ReactNode;
}) {
    const opener = trigger ?? (
        <Button
            variant="danger"
            size="xs"
            className="size-8 px-0"
            aria-label={`Delete “${category.name}”`}
        >
            <Trash2 aria-hidden />
        </Button>
    );

    if (category.looks_count > 0) {
        return (
            <Modal
                trigger={opener}
                size="sm"
                title={
                    <>
                        {category.name} still has <em>looks.</em>
                    </>
                }
                description={`${plural(category.looks_count, 'look')} ${category.looks_count === 1 ? 'is' : 'are'} filed under “${category.name}”. Move ${category.looks_count === 1 ? 'it' : 'them'} to another category, or delete ${category.looks_count === 1 ? 'it' : 'them'}, then delete the category.`}
                footer={
                    <Link
                        href={LookController.index.url({
                            query: { category: category.slug },
                        })}
                        className={button()}
                    >
                        Show its looks
                    </Link>
                }
            />
        );
    }

    return (
        <ConfirmDialog
            trigger={opener}
            title={
                <>
                    Delete this <em>category?</em>
                </>
            }
            description={`“${category.name}” has no looks, so nothing else changes. Its note for the week goes with it.`}
            confirmLabel="Delete category"
            form={LookCategoryController.destroy.form(category.id)}
        />
    );
}
