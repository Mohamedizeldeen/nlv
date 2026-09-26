import { router } from '@inertiajs/react';
import type { PendingVisit } from '@inertiajs/core';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { ConfirmDialog } from './dialog';

/**
 * Keeps unsaved edits from being lost. While `dirty`:
 * - leaving through an Inertia link or visit opens a glass "Leave without
 *   saving?" dialog (Keep editing / Leave without saving), and confirming
 *   replays the visit;
 * - closing or reloading the tab raises the browser's own question.
 * Saving and deleting (any non-GET visit), prefetches and partial reloads
 * are not leaving and pass through. Render the returned dialog once.
 *
 * `subject` names what would be lost: "Noura's story", "the Buy plan".
 */
export function useUnsavedGuard(
    dirty: boolean,
    { subject = 'this page' }: { subject?: string } = {},
): ReactNode {
    const [pending, setPending] = useState<PendingVisit | null>(null);
    const leaving = useRef(false);

    useEffect(() => {
        if (!dirty) {
            return;
        }

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!leaving.current) {
                event.preventDefault();
            }
        };

        const stop = router.on('before', (event) => {
            const { visit } = event.detail;
            const partial =
                visit.only.length > 0 ||
                visit.except.length > 0 ||
                visit.reset.length > 0;

            if (
                leaving.current ||
                visit.method !== 'get' ||
                visit.prefetch ||
                partial
            ) {
                return;
            }

            setPending(visit);

            return false;
        });

        window.addEventListener('beforeunload', onBeforeUnload);

        return () => {
            stop();
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, [dirty]);

    const leave = () => {
        const visit = pending;

        setPending(null);

        if (!visit) {
            return;
        }

        leaving.current = true;
        router.visit(visit.url.href, {
            method: visit.method,
            replace: visit.replace,
            preserveScroll: visit.preserveScroll,
            preserveState: visit.preserveState,
            onFinish: () => {
                leaving.current = false;
            },
        });
    };

    return (
        <ConfirmDialog
            open={pending !== null}
            onOpenChange={(open) => {
                if (!open) {
                    setPending(null);
                }
            }}
            title={
                <>
                    Leave without <em>saving?</em>
                </>
            }
            description={`Your changes to ${subject} have not been saved. If you leave now, they are lost.`}
            confirmLabel="Leave without saving"
            cancelLabel="Keep editing"
            onConfirm={leave}
        />
    );
}

/** A form's values as one comparable string (files by name, size and date). */
function snapshot(form: HTMLFormElement): string {
    const lines: string[] = [];

    for (const [key, value] of new FormData(form).entries()) {
        const text =
            typeof value === 'string'
                ? value
                : value.size > 0
                  ? `file:${value.name}:${value.size}:${value.lastModified}`
                  : '';

        lines.push(`${key}=${text}`);
    }

    return lines.join('\n');
}

/**
 * Whether an uncontrolled form differs from how it loaded, read from the
 * <form> itself. Kit controls keep some values in hidden inputs that React
 * updates without input events (toggles, focal points, "remove image"),
 * so the form is also watched for DOM changes. Mount it in a component
 * that remounts after a save (key it by the record's updated_at), so the
 * saved values become the new baseline.
 */
export function useFormDirty(form: RefObject<HTMLFormElement | null>): boolean {
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        const node = form.current;

        if (!node) {
            return;
        }

        const initial = snapshot(node);
        let timer: number | undefined;
        // Deferred: a state update inside the form's own input listener
        // re-renders before React's root listener has seen the event, so a
        // controlled input in the form (every bilingual kit field) would
        // snap back and lose the keystroke that made the form dirty.
        const check = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(
                () => setDirty(snapshot(node) !== initial),
                0,
            );
        };
        const observer = new MutationObserver(check);

        observer.observe(node, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['value'],
        });
        node.addEventListener('input', check);
        node.addEventListener('change', check);

        return () => {
            window.clearTimeout(timer);
            observer.disconnect();
            node.removeEventListener('input', check);
            node.removeEventListener('change', check);
        };
    }, [form]);

    return dirty;
}
