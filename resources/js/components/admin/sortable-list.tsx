import { GripVertical } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import type {
    CSSProperties,
    KeyboardEvent,
    PointerEvent,
    ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type Key = string | number;

export type SortableItemContext = {
    index: number;
    /** The drag handle (a button): place it where the row should be grabbed. */
    handle: ReactNode;
    moveUp: () => void;
    moveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
    /** True while this row is being dragged. */
    dragging: boolean;
};

type SortableListProps<T> = {
    items: T[];
    getKey: (item: T) => Key;
    /** Short name of an item, for the handle's label and announcements. */
    getLabel: (item: T) => string;
    renderItem: (item: T, context: SortableItemContext) => ReactNode;
    /** Called with the new order after every drop or keyboard move. */
    onReorder?: (items: T[]) => void;
    /** Emits hidden inputs `${name}[]` with the keys in order, for forms. */
    name?: string;
    /** Accessible name of the list, e.g. "Stories in page order". */
    label: string;
    disabled?: boolean;
    className?: string;
    /** Classes for each <li> (the row surface). */
    itemClassName?: string;
};

type Drag = {
    key: Key;
    from: number;
    to: number;
    dy: number;
    startY: number;
    /** Height of the dragged row plus the gap after it. */
    shift: number;
    /** Midpoints of every row at drag start, in order. */
    mids: number[];
    center: number;
};

function moved<T>(list: T[], from: number, to: number): T[] {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);

    return next;
}

/**
 * A reorderable list: drag a row by its handle (mouse, pen or touch), or
 * focus the handle and press ↑ / ↓. Rows make room as you drag; the new
 * order is committed on drop and announced to screen readers.
 */
export function SortableList<T>({
    items,
    getKey,
    getLabel,
    renderItem,
    onReorder,
    name,
    label,
    disabled = false,
    className,
    itemClassName,
}: SortableListProps<T>) {
    const [source, setSource] = useState(items);
    const [order, setOrder] = useState(items);
    const [drag, setDrag] = useState<Drag | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const rows = useRef(new Map<Key, HTMLLIElement>());
    const refocus = useRef<Key | null>(null);
    const helpId = useId();

    // New items from the server (after a save) replace the local order.
    if (items !== source) {
        setSource(items);
        setOrder(items);
    }

    // Moving a row in the DOM drops focus; put it back on the moved handle.
    useLayoutEffect(() => {
        if (refocus.current === null) {
            return;
        }

        rows.current
            .get(refocus.current)
            ?.querySelector<HTMLButtonElement>('[data-sort-handle]')
            ?.focus();
        refocus.current = null;
    });

    const commit = (from: number, to: number, keepFocus: boolean) => {
        if (from === to || to < 0 || to >= order.length) {
            return;
        }

        const next = moved(order, from, to);
        const item = order[from];
        setOrder(next);
        setAnnouncement(
            `${getLabel(item)} moved to position ${to + 1} of ${next.length}.`,
        );

        if (keepFocus) {
            refocus.current = getKey(item);
        }

        onReorder?.(next);
    };

    const onPointerDown = (
        event: PointerEvent<HTMLButtonElement>,
        index: number,
    ) => {
        if (disabled || event.button !== 0) {
            return;
        }

        const nodes = order.map((item) => rows.current.get(getKey(item)));
        const rects = nodes.map((node) => node?.getBoundingClientRect());
        const rect = rects[index];

        if (!rect) {
            return;
        }

        const next = rects[index + 1] ?? null;
        const previous = rects[index - 1] ?? null;
        const gap = next
            ? next.top - rect.bottom
            : previous
              ? rect.top - previous.bottom
              : 0;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({
            key: getKey(order[index]),
            from: index,
            to: index,
            dy: 0,
            startY: event.clientY,
            shift: rect.height + gap,
            mids: rects.map((r) => (r ? r.top + r.height / 2 : 0)),
            center: rect.top + rect.height / 2,
        });
    };

    const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
        if (!drag) {
            return;
        }

        const dy = event.clientY - drag.startY;
        const center = drag.center + dy;
        const to = drag.mids.filter(
            (mid, index) => index !== drag.from && mid < center,
        ).length;

        setDrag({ ...drag, dy, to });
    };

    const onPointerUp = () => {
        if (!drag) {
            return;
        }

        const { from, to } = drag;
        setDrag(null);
        commit(from, to, false);
    };

    const onKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number,
    ) => {
        if (disabled) {
            return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            commit(index, index + (event.key === 'ArrowUp' ? -1 : 1), true);
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            commit(index, event.key === 'Home' ? 0 : order.length - 1, true);
        }
    };

    const offset = (index: number): number => {
        if (!drag) {
            return 0;
        }

        if (index === drag.from) {
            return drag.dy;
        }

        if (drag.from < index && index <= drag.to) {
            return -drag.shift;
        }

        if (drag.to <= index && index < drag.from) {
            return drag.shift;
        }

        return 0;
    };

    return (
        <div className={className}>
            <p id={helpId} className="sr-only">
                Drag a handle, or focus it and press the up and down arrow keys,
                to change the order.
            </p>
            <ol aria-label={label} className="grid gap-2">
                {order.map((item, index) => {
                    const key = getKey(item);
                    const dragging = drag?.key === key;
                    const style: CSSProperties | undefined = drag
                        ? { transform: `translate3d(0, ${offset(index)}px, 0)` }
                        : undefined;

                    const handle = (
                        <button
                            type="button"
                            data-sort-handle
                            aria-label={`Reorder ${getLabel(item)}, position ${index + 1} of ${order.length}`}
                            aria-describedby={helpId}
                            disabled={disabled}
                            onPointerDown={(event) =>
                                onPointerDown(event, index)
                            }
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            onKeyDown={(event) => onKeyDown(event, index)}
                            className={cn(
                                'grid size-9 shrink-0 touch-none place-items-center rounded-[10px] text-smoke transition-colors duration-300 ease-glass hover:bg-white/[0.08] hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
                                dragging
                                    ? 'cursor-grabbing text-mint'
                                    : 'cursor-grab',
                            )}
                        >
                            <GripVertical aria-hidden className="size-4" />
                        </button>
                    );

                    return (
                        <li
                            key={key}
                            ref={(node) => {
                                if (node) {
                                    rows.current.set(key, node);
                                } else {
                                    rows.current.delete(key);
                                }
                            }}
                            style={style}
                            className={cn(
                                // min-w-0: long, truncated labels never widen the list on phones.
                                'relative min-w-0',
                                drag &&
                                    !dragging &&
                                    'transition-transform duration-200 ease-glass',
                                itemClassName,
                                // The lifted row: opaque, so rows it passes over don't show through.
                                dragging &&
                                    'z-10 bg-[oklch(0.22_0.02_190/0.96)] shadow-[0_24px_48px_-20px_oklch(0_0_0/0.8)] ring-1 ring-mint/50',
                            )}
                        >
                            {renderItem(item, {
                                index,
                                handle,
                                moveUp: () => commit(index, index - 1, false),
                                moveDown: () => commit(index, index + 1, false),
                                isFirst: index === 0,
                                isLast: index === order.length - 1,
                                dragging,
                            })}
                            {name ? (
                                <input
                                    type="hidden"
                                    name={`${name}[]`}
                                    value={String(key)}
                                />
                            ) : null}
                        </li>
                    );
                })}
            </ol>
            <p role="status" aria-live="polite" className="sr-only">
                {announcement}
            </p>
        </div>
    );
}
