import { Form } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { button } from './button';

/*
 * Glass modals on Radix Dialog: focus is trapped inside, Escape and the
 * backdrop close it, page scroll is locked, focus returns to the trigger.
 */

/** Classes for portalled surfaces: they render outside the admin layout. */
export const portalSurface =
    'landing font-sans text-bone antialiased [color-scheme:dark]';

type ModalProps = {
    /** Controlled open state (omit both to let `trigger` drive it). */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** An element that opens the modal (rendered as-is: pass a <button>). */
    trigger?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    /** Right-aligned buttons under a hairline. */
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
    /** Called when the modal opens, instead of focusing its first control. */
    onOpenAutoFocus?: (event: Event) => void;
    children?: ReactNode;
};

const WIDTH = {
    sm: 'max-w-[28rem]',
    md: 'max-w-[36rem]',
    lg: 'max-w-[48rem]',
} as const;

/** A general glass modal: a Bodoni title, optional description, body, footer. */
export function Modal({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    footer,
    size = 'md',
    onOpenAutoFocus,
    children,
}: ModalProps) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            {trigger ? (
                <DialogPrimitive.Trigger asChild>
                    {trigger}
                </DialogPrimitive.Trigger>
            ) : null}
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className={cn(
                        portalSurface,
                        'fixed inset-0 z-50 bg-[oklch(0.1_0.012_200/0.72)] backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
                    )}
                />
                <DialogPrimitive.Content
                    onOpenAutoFocus={onOpenAutoFocus}
                    // Without a description, say so (Radix warns otherwise).
                    {...(description ? {} : { 'aria-describedby': undefined })}
                    className={cn(
                        portalSurface,
                        'glass-rim fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[28px] glass-strong duration-300 focus:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97]',
                        WIDTH[size],
                    )}
                >
                    <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
                        <div className="min-w-0">
                            <DialogPrimitive.Title className="font-display text-[1.6rem] leading-[1.15] font-medium text-balance text-bone [&_em]:font-normal [&_em]:text-mint">
                                {title}
                            </DialogPrimitive.Title>
                            {description ? (
                                <DialogPrimitive.Description className="mt-2 text-[14px] leading-relaxed text-pretty text-mist">
                                    {description}
                                </DialogPrimitive.Description>
                            ) : null}
                        </div>
                        <DialogPrimitive.Close
                            aria-label="Close"
                            className="-mt-1 -mr-2 grid size-9 shrink-0 cursor-pointer place-items-center rounded-[12px] text-smoke transition-colors duration-300 ease-glass hover:bg-white/[0.08] hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                        >
                            <X aria-hidden className="size-4" />
                        </DialogPrimitive.Close>
                    </div>
                    {children ? (
                        <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pt-5 pb-1 sm:px-8">
                            {children}
                        </div>
                    ) : null}
                    {footer ? (
                        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-6 py-4 sm:px-8">
                            {footer}
                        </div>
                    ) : (
                        <div className="h-6 sm:h-7" />
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

type FormTarget = {
    action: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
};

type ConfirmDialogProps = {
    /** An element that opens the dialog, e.g. a "Delete" <button>. */
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    /** Label of the confirming button, as a verb: "Delete story". */
    confirmLabel?: string;
    cancelLabel?: string;
    /** `danger` paints the confirm button coral. Default "danger". */
    tone?: 'danger' | 'default';
    /**
     * Submit a Wayfinder form on confirm, e.g.
     * `StoryController.destroy.form(story)`. The dialog closes on success.
     */
    form?: FormTarget;
    /** Or run anything on confirm; a returned promise keeps it open until it settles. */
    onConfirm?: () => void | Promise<unknown>;
    /** Extra body, e.g. what will be lost. */
    children?: ReactNode;
};

/**
 * "Are you sure?" as a focus-trapped glass modal. Focus starts on Cancel,
 * so a stray Enter never deletes anything.
 */
export function ConfirmDialog({
    trigger,
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    tone = 'danger',
    form,
    onConfirm,
    children,
}: ConfirmDialogProps) {
    const [innerOpen, setInnerOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const cancel = useRef<HTMLButtonElement>(null);
    const isOpen = open ?? innerOpen;

    const setOpen = (next: boolean) => {
        setInnerOpen(next);
        onOpenChange?.(next);
    };

    const confirmClass = button({
        variant: tone === 'danger' ? 'danger' : 'primary',
        className:
            tone === 'danger'
                ? 'bg-coral/[0.16] text-[oklch(0.84_0.1_38)] ring-1 ring-coral/40 ring-inset hover:bg-coral/25'
                : undefined,
    });

    const runConfirm = async () => {
        const result = onConfirm?.();

        if (result instanceof Promise) {
            setBusy(true);

            try {
                await result;
            } finally {
                setBusy(false);
            }
        }

        setOpen(false);
    };

    const cancelButton = (
        <DialogPrimitive.Close
            ref={cancel}
            className={button({ variant: 'glass' })}
        >
            {cancelLabel}
        </DialogPrimitive.Close>
    );

    return (
        <Modal
            open={isOpen}
            onOpenChange={setOpen}
            trigger={trigger}
            title={title}
            description={description}
            size="sm"
            onOpenAutoFocus={(event) => {
                event.preventDefault();
                cancel.current?.focus();
            }}
            footer={
                form ? (
                    <Form
                        action={form.action}
                        method={form.method}
                        options={{ preserveScroll: true }}
                        onSuccess={() => setOpen(false)}
                        className="flex flex-wrap items-center justify-end gap-2"
                    >
                        {({ processing }) => (
                            <>
                                {cancelButton}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className={confirmClass}
                                >
                                    {confirmLabel}
                                </button>
                            </>
                        )}
                    </Form>
                ) : (
                    <>
                        {cancelButton}
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runConfirm()}
                            className={confirmClass}
                        >
                            {confirmLabel}
                        </button>
                    </>
                )
            }
        >
            {children}
        </Modal>
    );
}
