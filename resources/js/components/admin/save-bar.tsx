import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button, button } from './button';
import { RelativeTime } from './relative-time';

/*
 * The end of every admin form: one sticky glass bar that says where the
 * form stands and holds Discard and Save, plus Cmd/Ctrl+S. Pair it with
 * `useUnsavedGuard` (use-unsaved-guard.tsx) for the leave prompt.
 */

const noop = () => () => {};

/** "⌘S" on Apple devices, "Ctrl S" elsewhere; null on the server and while hydrating. */
function useShortcutLabel(): string | null {
    return useSyncExternalStore(
        noop,
        () =>
            /Mac|iPhone|iPad|iPod/.test(
                navigator.platform || navigator.userAgent,
            )
                ? '⌘S'
                : 'Ctrl S',
        () => null,
    );
}

/**
 * Cmd+S (Apple) or Ctrl+S (elsewhere) submits the form `resolve` returns,
 * through its first submit button (a disabled one means "nothing to save").
 * The browser's own "Save page" never opens on an admin form; a shortcut
 * pressed while a dialog is open does nothing.
 */
export function useSaveShortcut(
    resolve: () => HTMLFormElement | null | undefined,
): void {
    const latest = useRef(resolve);

    useEffect(() => {
        latest.current = resolve;
    });

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isS =
                event.key.toLowerCase() === 's' || event.code === 'KeyS';

            if (
                !isS ||
                !(event.metaKey || event.ctrlKey) ||
                event.altKey ||
                event.shiftKey ||
                event.defaultPrevented
            ) {
                return;
            }

            event.preventDefault();

            if (
                event.repeat ||
                document.querySelector('[role="dialog"][data-state="open"]')
            ) {
                return;
            }

            const form = latest.current();
            const submit = form?.querySelector<HTMLButtonElement>(
                'button[type="submit"]',
            );

            if (!form || submit?.disabled) {
                return;
            }

            form.requestSubmit(submit ?? undefined);
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
}

/**
 * Brings the first field marked invalid into view and focuses it (the
 * bar sits at the bottom; errors are often far above).
 */
function focusFirstInvalid(form: HTMLFormElement | null | undefined): void {
    const field = [
        ...(form?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []),
    ].find((element) => element.getClientRects().length > 0);

    if (!field) {
        return;
    }

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    field.scrollIntoView({
        block: 'center',
        behavior: still ? 'auto' : 'smooth',
    });
    field.focus({ preventScroll: true });
}

type SaveBarProps = {
    /** The form differs from what is saved. */
    dirty: boolean;
    /** The form is being submitted (Inertia `<Form>`'s `processing`). */
    processing: boolean;
    /** The last save came back with errors (`<Form>`'s `hasErrors`). */
    hasErrors?: boolean;
    /** A record that was never saved (create forms). */
    isNew?: boolean;
    /** When the record was last saved (ISO 8601), shown as "3 min ago". */
    savedAt?: string | null;
    /** Who saved it last, when known. */
    savedBy?: string | null;
    /** Puts every field back to its saved value; Discard shows while dirty. */
    onDiscard?: () => void;
    /** The submit button on an existing record. */
    saveLabel?: string;
    /** The submit button on a new record, e.g. "Add story". */
    createLabel?: string;
    /** Extra buttons before Discard (e.g. a phone-only Preview). */
    children?: ReactNode;
    className?: string;
};

/**
 * The form's save row: a glass bar stuck to the bottom of the screen while
 * the form is taller than it. Put it last inside the form's own column
 * (never across a preview column): it spans whatever column it is in.
 * It reads "Unsaved changes", "All changes saved · 3 min ago", "Not saved
 * yet", "Saving…" or, after a failed save, points at the fields to fix
 * (and focuses the first). Cmd/Ctrl+S saves.
 */
export function SaveBar({
    dirty,
    processing,
    hasErrors = false,
    isNew = false,
    savedAt,
    savedBy,
    onDiscard,
    saveLabel = 'Save changes',
    createLabel = 'Create',
    children,
    className,
}: SaveBarProps) {
    const bar = useRef<HTMLDivElement>(null);
    const shortcut = useShortcutLabel();
    const state = { dirty, isNew };
    const latest = useRef(state);
    const wasProcessing = useRef(processing);

    useEffect(() => {
        latest.current = state;
    });

    // A clean, saved form has nothing to send.
    useSaveShortcut(() => {
        const { dirty: changed, isNew: unsaved } = latest.current;

        return changed || unsaved ? bar.current?.closest('form') : null;
    });

    // Fields focused near the bottom of the screen scroll clear of the bar:
    // the page's scroll padding grows by the bar's height while it is here.
    useEffect(() => {
        const node = bar.current;
        const root = document.documentElement;
        const previous = root.style.scrollPaddingBottom;

        if (!node) {
            return;
        }

        const observer = new ResizeObserver(() => {
            root.style.scrollPaddingBottom = `${Math.ceil(node.getBoundingClientRect().height) + 36}px`;
        });

        observer.observe(node);

        return () => {
            observer.disconnect();
            root.style.scrollPaddingBottom = previous;
        };
    }, []);

    // After a failed save, take the keyboard to the first field to fix.
    useEffect(() => {
        if (wasProcessing.current && !processing && hasErrors) {
            focusFirstInvalid(bar.current?.closest('form'));
        }

        wasProcessing.current = processing;
    }, [processing, hasErrors]);

    const status = processing
        ? 'Saving…'
        : hasErrors
          ? 'Not saved: check the fields marked in coral'
          : dirty
            ? 'Unsaved changes'
            : isNew
              ? 'Not saved yet'
              : 'All changes saved';
    const showSaved = !processing && !hasErrors && !dirty && !isNew && savedAt;

    return (
        <div
            ref={bar}
            className={cn('sticky bottom-3 z-20 sm:bottom-5', className)}
        >
            <div className="glass-rim flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] py-2.5 pr-2.5 pl-5 glass-strong">
                <p
                    className={cn(
                        'min-w-0 flex-1 text-[13px] leading-snug text-smoke',
                        // The longer error line gets a row of its own on phones.
                        hasErrors && !processing && 'max-sm:basis-full',
                    )}
                >
                    <span
                        role="status"
                        className={cn(
                            hasErrors && !processing
                                ? 'text-coral'
                                : dirty && !processing
                                  ? 'font-medium text-mint'
                                  : processing
                                    ? 'text-mist'
                                    : undefined,
                        )}
                    >
                        {status}
                    </span>
                    {showSaved ? (
                        // Beside extra buttons (a phone Preview), phones keep
                        // the status to one short line.
                        <span className={cn(children && 'max-sm:hidden')}>
                            <span aria-hidden className="mx-1.5 text-white/25">
                                ·
                            </span>
                            <RelativeTime value={savedAt} />
                            {savedBy ? ` by ${savedBy}` : null}
                        </span>
                    ) : null}
                </p>
                <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {children}
                    {dirty && onDiscard ? (
                        <Button
                            variant="ghost"
                            onClick={onDiscard}
                            disabled={processing}
                        >
                            Discard
                        </Button>
                    ) : null}
                    {/* Mint while there is something to save, glass otherwise. */}
                    <button
                        type="submit"
                        disabled={processing}
                        aria-keyshortcuts="Meta+S Control+S"
                        title={shortcut ? `Save (${shortcut})` : undefined}
                        className={button({
                            variant: dirty || isNew ? 'primary' : 'glass',
                        })}
                    >
                        {isNew ? createLabel : saveLabel}
                        {shortcut ? (
                            <kbd
                                aria-hidden
                                className={cn(
                                    'ml-0.5 font-sans text-[11px] font-medium tracking-[0.04em] max-lg:hidden',
                                    dirty || isNew
                                        ? 'text-ink/55'
                                        : 'text-smoke',
                                )}
                            >
                                {shortcut}
                            </kbd>
                        ) : null}
                    </button>
                </div>
            </div>
        </div>
    );
}
