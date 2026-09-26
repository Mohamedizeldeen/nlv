import { ImageUp, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent, MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import type { FocusPoint, MediaRef } from '@/types/admin';
import { button } from './button';
import { FieldError, useFieldControl } from './field';
import { mediaUrl } from './media';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MB = 1024 * 1024;

/*
 * Big photos are resized in the browser before they are sent (ADMIN.md
 * section 11): the server's own limits (PHP's upload size, 8 MB, 2000 px)
 * stay as the backstop, but a 12 MB phone photo should just work.
 */

/** Longest edge sent to the server, in px (it keeps at most 2000). */
const MAX_EDGE = 2400;
/** Files at or under this size and edge are sent untouched. */
const TARGET_BYTES = 1.5 * MB;
/** Larger originals are refused outright: decoding them could stall the tab. */
const MAX_SOURCE_BYTES = 60 * MB;
/** WebP (or JPEG) qualities tried in turn before the image is made smaller. */
const QUALITIES = [0.86, 0.78, 0.7];

type Resized = {
    /** The original file's name and size. */
    name: string;
    size: number;
    width: number;
    height: number;
};

type Picked = { file: File; url: string; resized: Resized | null };

type ImageInputProps = {
    /** The file field's name, e.g. "after_image". Inertia's <Form> sends it as multipart on its own. */
    name: string;
    /** The stored image, if any. */
    value?: MediaRef | null;
    /** Alt text for the preview (the record's own alt when it has one). */
    alt?: string;
    /** Enables the focal-point picker; the initial point, 0..1 from top-left. */
    focus?: FocusPoint;
    /** Hidden inputs that carry the focus, e.g. ["focus_x", "focus_y"]. */
    focusNames?: [string, string];
    onFocusChange?: (focus: FocusPoint) => void;
    /**
     * For optional images: a hidden input set to "1" when the stored image is
     * removed (e.g. "remove_before_image"). Without it, a stored image can
     * only be replaced.
     */
    removeName?: string;
    /** Crop previews that follow the focus: [{ label: 'Card', aspect: 4 / 5 }]. */
    crops?: { label: string; aspect: number }[];
    onFileChange?: (file: File | null) => void;
    /** Defaults to the surrounding <Field>'s `required`. */
    required?: boolean;
    disabled?: boolean;
    /**
     * Client-side checks, mirroring the server's rules. `maxBytes` applies to
     * the file that is sent, after large photos are resized.
     */
    maxBytes?: number;
    minSize?: number;
    /** What goes here, for the empty drop zone: "the try-on result". */
    subject?: string;
    id?: string;
    className?: string;
};

/** A problem with the chosen file, worded for the person who chose it. */
class ImageProblem extends Error {}

const UNREADABLE =
    'This file can’t be opened as an image: it may be damaged, or saved in a format this browser can’t read. Export it again as JPG or PNG and try once more.';

type Decoded = {
    source: CanvasImageSource;
    width: number;
    height: number;
    release: () => void;
};

/** Decode an image file, honouring its EXIF orientation. */
async function decodeImage(file: File): Promise<Decoded> {
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file, {
                imageOrientation: 'from-image',
            });

            return {
                source: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                release: () => bitmap.close(),
            };
        } catch {
            // Older engines reject the options or the format: try an <img>.
        }
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.src = url;

    try {
        await image.decode();
    } catch {
        URL.revokeObjectURL(url);

        throw new ImageProblem(UNREADABLE);
    }

    if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(url);

        throw new ImageProblem(UNREADABLE);
    }

    return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release: () => URL.revokeObjectURL(url),
    };
}

let webpSupport: boolean | null = null;

/** Whether this browser's canvas can encode WebP (Safari's can't everywhere). */
function canEncodeWebp(): boolean {
    if (webpSupport === null) {
        const probe = document.createElement('canvas');
        probe.width = 1;
        probe.height = 1;
        webpSupport = probe
            .toDataURL('image/webp')
            .startsWith('data:image/webp');
    }

    return webpSupport;
}

function toBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number,
): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * The file to upload: the original when it is already small, otherwise a
 * WebP (JPEG where WebP can't be encoded) with the longest edge at most
 * 2400 px, re-encoded until it is under 1.5 MB. Throws an ImageProblem for
 * files that can't be read or are too small.
 */
async function prepareImage(
    file: File,
    minSize: number,
): Promise<{ file: File; resized: Resized | null }> {
    const decoded = await decodeImage(file);
    const { width, height } = decoded;

    try {
        if (width < minSize || height < minSize) {
            throw new ImageProblem(
                `This image is ${width} × ${height} px; it needs to be at least ${minSize} × ${minSize} px.`,
            );
        }

        const longest = Math.max(width, height);

        if (file.size <= TARGET_BYTES && longest <= MAX_EDGE) {
            return { file, resized: null };
        }

        const webp = canEncodeWebp();
        const type = webp ? 'image/webp' : 'image/jpeg';
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new ImageProblem(
                'This browser couldn’t prepare the image for upload. Try another browser, or a smaller file.',
            );
        }

        let scale = Math.min(1, MAX_EDGE / longest);
        let smallest: Blob | null = null;

        try {
            // Each round tries a few qualities, then shrinks the image by a fifth.
            for (let round = 0; round < 6; round++) {
                const w = Math.max(1, Math.round(width * scale));
                const h = Math.max(1, Math.round(height * scale));

                canvas.width = w;
                canvas.height = h;
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';

                if (!webp) {
                    // JPEG has no transparency: put transparent PNGs on white.
                    context.fillStyle = '#fff';
                    context.fillRect(0, 0, w, h);
                }

                context.drawImage(decoded.source, 0, 0, w, h);

                for (const quality of QUALITIES) {
                    const blob = await toBlob(canvas, type, quality);

                    if (!blob) {
                        continue;
                    }

                    if (!smallest || blob.size < smallest.size) {
                        smallest = blob;
                    }

                    if (blob.size <= TARGET_BYTES) {
                        break;
                    }
                }

                if (
                    (smallest && smallest.size <= TARGET_BYTES) ||
                    Math.min(w, h) * 0.8 < minSize
                ) {
                    break;
                }

                scale *= 0.8;
            }
        } finally {
            // Free the pixels at once (large canvases hold a lot of memory).
            canvas.width = 0;
            canvas.height = 0;
        }

        if (!smallest) {
            throw new ImageProblem(
                'This browser couldn’t prepare the image for upload. Try another browser, or a smaller file.',
            );
        }

        // A small original that re-encodes bigger is better sent as it is.
        if (file.size <= TARGET_BYTES && smallest.size >= file.size) {
            return { file, resized: null };
        }

        const stem = file.name.replace(/\.[^./\\]+$/, '') || 'image';
        const prepared = new File(
            [smallest],
            `${stem}.${webp ? 'webp' : 'jpg'}`,
            { type: smallest.type || type, lastModified: Date.now() },
        );

        return {
            file: prepared,
            resized: { name: file.name, size: file.size, width, height },
        };
    } finally {
        decoded.release();
    }
}

function describeSize(bytes: number): string {
    // Non-breaking spaces keep "9.2 MB" on one line.
    return bytes >= MB
        ? `${(bytes / MB).toFixed(1)}\u00a0MB`
        : `${Math.max(1, Math.round(bytes / 1024))}\u00a0KB`;
}

const clamp01 = (n: number) =>
    Math.min(1, Math.max(0, Math.round(n * 100) / 100));

/**
 * Image upload with preview. Drop a file or click to choose one; large
 * photos are resized in the browser first (WebP, longest edge 2400 px,
 * under 1.5 MB), and the preview shows the new file or the stored image. With `focus`, click the
 * preview (or use the arrow keys on it) to set the focal point that crops
 * keep in frame. Everything travels as ordinary form fields, so it works
 * inside Inertia's <Form>, which switches to multipart by itself when a
 * file is chosen (its v3 <Form> has no `forceFormData` prop).
 */
export function ImageInput({
    name,
    value = null,
    alt = '',
    focus: initialFocus,
    focusNames,
    onFocusChange,
    removeName,
    crops = [],
    onFileChange,
    required,
    disabled = false,
    maxBytes = 8 * MB,
    minSize = 400,
    subject = 'an image',
    id,
    className,
}: ImageInputProps) {
    const control = useFieldControl({ id, required });
    const input = useRef<HTMLInputElement>(null);
    const [picked, setPicked] = useState<Picked | null>(null);
    const [removed, setRemoved] = useState(false);
    const [focus, setFocus] = useState<FocusPoint | null>(initialFocus ?? null);
    const [natural, setNatural] = useState<{ w: number; h: number } | null>(
        null,
    );
    const [dragging, setDragging] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);
    // The file input is visually hidden; its keyboard focus rings the visible control.
    const [inputFocused, setInputFocused] = useState(false);
    /** The name of the file being resized, while it is. */
    const [preparing, setPreparing] = useState<string | null>(null);
    const latest = useRef<Picked | null>(null);
    /** Bumped for every pick, so a slow resize can't overwrite a newer one. */
    const job = useRef(0);

    // Free the preview's object URL (and drop any resize still running)
    // when the component goes away.
    useEffect(
        () => () => {
            job.current += 1;

            if (latest.current) {
                URL.revokeObjectURL(latest.current.url);
            }
        },
        [],
    );

    const stored = value && !removed ? value : null;
    const src = picked ? picked.url : stored ? mediaUrl(stored, 1200) : null;
    const canRemove =
        picked !== null || (stored !== null && removeName !== undefined);

    const replacePicked = (next: Picked | null) => {
        if (latest.current) {
            URL.revokeObjectURL(latest.current.url);
        }

        latest.current = next;
        setPicked(next);
        setNatural(null);
        onFileChange?.(next?.file ?? null);
    };

    const clearInput = () => {
        if (input.current) {
            input.current.value = '';
        }
    };

    /** Put `file` in the real input (the form submits it), or empty it. */
    const setInputFile = (file: File | null) => {
        const node = input.current;

        if (!node) {
            return;
        }

        if (!file) {
            node.value = '';

            return;
        }

        if (node.files?.[0] === file) {
            return;
        }

        try {
            const transfer = new DataTransfer();
            transfer.items.add(file);
            node.files = transfer.files;
        } catch {
            // Very old browsers can't set files: the chosen original stays.
        }
    };

    /** Blocks the form's submit while a resize is running. */
    const setBusy = (fileName: string | null) => {
        setPreparing(fileName);
        input.current?.setCustomValidity(
            fileName
                ? 'The image is still being prepared for upload. Try again in a moment.'
                : '',
        );
    };

    const fail = (message: string) => {
        setProblem(message);
        // Keep whatever was picked before (or nothing) in the input.
        setInputFile(latest.current?.file ?? null);
    };

    const accept = async (file: File) => {
        setProblem(null);
        const current = ++job.current;

        if (!ACCEPT.split(',').includes(file.type)) {
            setBusy(null);
            fail('Use a JPG, PNG, WebP or AVIF image.');

            return;
        }

        if (file.size > MAX_SOURCE_BYTES) {
            setBusy(null);
            fail(
                `That file is ${describeSize(file.size)}; choose one under ${describeSize(MAX_SOURCE_BYTES)}.`,
            );

            return;
        }

        setBusy(file.name);

        let prepared: Awaited<ReturnType<typeof prepareImage>>;

        try {
            prepared = await prepareImage(file, minSize);
        } catch (error) {
            if (current === job.current) {
                setBusy(null);
                fail(
                    error instanceof ImageProblem ? error.message : UNREADABLE,
                );
            }

            return;
        }

        // A newer pick (or unmounting) made this one obsolete.
        if (current !== job.current) {
            return;
        }

        setBusy(null);

        if (prepared.file.size > maxBytes) {
            fail(
                `Even resized, that image is ${describeSize(prepared.file.size)}; the limit is ${describeSize(maxBytes)}.`,
            );

            return;
        }

        setInputFile(prepared.file);
        replacePicked({
            file: prepared.file,
            url: URL.createObjectURL(prepared.file),
            resized: prepared.resized,
        });
        setRemoved(false);
    };

    const onPick = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file) {
            void accept(file);
        }
    };

    const onDrop = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        setDragging(false);

        if (disabled) {
            return;
        }

        const file = event.dataTransfer.files[0];

        if (file) {
            void accept(file);
        }
    };

    const onDragOver = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();

        if (!disabled) {
            setDragging(true);
        }
    };

    const onLoad = (event: { currentTarget: HTMLImageElement }) => {
        const { naturalWidth: w, naturalHeight: h } = event.currentTarget;
        setNatural({ w, h });

        if (picked && (w < minSize || h < minSize)) {
            setProblem(
                `This image is ${w} × ${h} px; it needs to be at least ${minSize} × ${minSize} px.`,
            );
            replacePicked(null);
            clearInput();
        }
    };

    const remove = () => {
        setProblem(null);

        if (preparing) {
            job.current += 1;
            setBusy(null);
        }

        if (picked) {
            replacePicked(null);
            clearInput();

            return;
        }

        setRemoved(true);
    };

    const moveFocus = (next: FocusPoint) => {
        const point: FocusPoint = [clamp01(next[0]), clamp01(next[1])];
        setFocus(point);
        onFocusChange?.(point);
    };

    const onPreviewClick = (event: MouseEvent<HTMLButtonElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        moveFocus([
            (event.clientX - box.left) / box.width,
            (event.clientY - box.top) / box.height,
        ]);
    };

    const onPreviewKey = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (!focus) {
            return;
        }

        const step = event.shiftKey ? 0.1 : 0.02;
        const moves: Record<string, FocusPoint> = {
            ArrowLeft: [focus[0] - step, focus[1]],
            ArrowRight: [focus[0] + step, focus[1]],
            ArrowUp: [focus[0], focus[1] - step],
            ArrowDown: [focus[0], focus[1] + step],
        };

        if (event.key in moves) {
            event.preventDefault();
            moveFocus(moves[event.key]);
        }
    };

    const meta = picked
        ? picked.resized
            ? `${picked.resized.name} · resized from ${describeSize(picked.resized.size)} to ${describeSize(picked.file.size)}${natural ? ` · ${natural.w}\u00a0×\u00a0${natural.h}` : ''}`
            : `${picked.file.name} · ${describeSize(picked.file.size)}${natural ? ` · ${natural.w}\u00a0×\u00a0${natural.h}` : ''}`
        : stored?.kind === 'unsplash'
          ? `Stock photo (Unsplash)${natural ? ` · ${natural.w}\u00a0×\u00a0${natural.h}` : ''}`
          : stored
            ? `Uploaded image${stored.width && stored.height ? ` · ${stored.width}\u00a0×\u00a0${stored.height}` : ''}`
            : null;
    const errorId = problem ? `${control.id}-problem` : undefined;
    const describedBy =
        [control['aria-describedby'], errorId].filter(Boolean).join(' ') ||
        undefined;

    const fileInput = (
        <input
            ref={input}
            id={control.id}
            type="file"
            name={name}
            accept={ACCEPT}
            onChange={onPick}
            disabled={disabled}
            // A stored image satisfies "required" until it is removed.
            required={Boolean(control.required) && !stored && !picked}
            aria-describedby={describedBy}
            aria-invalid={
                control['aria-invalid'] ?? (problem ? true : undefined)
            }
            onFocus={(event) =>
                setInputFocused(event.currentTarget.matches(':focus-visible'))
            }
            onBlur={() => setInputFocused(false)}
            className="sr-only"
        />
    );

    return (
        <div className={cn('relative grid min-w-0 gap-3', className)}>
            {/* Always at the same place in the tree, so a chosen file survives re-renders. */}
            {fileInput}
            {focusNames && focus ? (
                <>
                    <input
                        type="hidden"
                        name={focusNames[0]}
                        value={focus[0].toFixed(2)}
                    />
                    <input
                        type="hidden"
                        name={focusNames[1]}
                        value={focus[1].toFixed(2)}
                    />
                </>
            ) : null}
            {removeName && removed && !picked ? (
                <input type="hidden" name={removeName} value="1" />
            ) : null}

            {src ? (
                <div className="grid min-w-0 gap-3">
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        className={cn(
                            'relative grid place-items-center overflow-hidden rounded-[20px] bg-[repeating-conic-gradient(oklch(1_0_0/0.04)_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-3 ring-1 ring-white/[0.12] transition-shadow duration-300 ring-inset',
                            dragging && 'ring-2 ring-mint/80',
                        )}
                    >
                        <div className="relative max-w-full">
                            <img
                                src={src}
                                alt={alt}
                                onLoad={onLoad}
                                draggable={false}
                                className="block max-h-[22rem] w-auto max-w-full rounded-[10px] select-none"
                            />
                            {focus ? (
                                <button
                                    type="button"
                                    onClick={onPreviewClick}
                                    onKeyDown={onPreviewKey}
                                    disabled={disabled}
                                    aria-label={`Focal point: ${Math.round(focus[0] * 100)}% from the left, ${Math.round(focus[1] * 100)}% from the top. Click the image or use the arrow keys to move it.`}
                                    className="absolute inset-0 cursor-crosshair rounded-[10px] focus-visible:ring-2 focus-visible:ring-mint focus-visible:outline-none"
                                >
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-y-0 w-px bg-mint/45"
                                        style={{ left: `${focus[0] * 100}%` }}
                                    />
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-x-0 h-px bg-mint/45"
                                        style={{ top: `${focus[1] * 100}%` }}
                                    />
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_4px_oklch(0.145_0.014_200/0.45),0_0_18px_oklch(0.84_0.12_160/0.6)] ring-2 ring-mint"
                                        style={{
                                            left: `${focus[0] * 100}%`,
                                            top: `${focus[1] * 100}%`,
                                        }}
                                    />
                                </button>
                            ) : null}
                        </div>
                        {picked ? (
                            <span className="absolute top-5 left-5 rounded-[8px] bg-ink/70 px-2 py-1 text-[10px] font-medium tracking-[0.18em] text-mint uppercase backdrop-blur-sm">
                                New, not saved yet
                            </span>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <p className="min-w-0 flex-1 basis-56 text-[12.5px] leading-relaxed text-pretty text-smoke">
                            {meta}
                            {focus ? (
                                <span className="text-mist">
                                    {' '}
                                    · Focus {Math.round(focus[0] * 100)}%,{' '}
                                    {Math.round(focus[1] * 100)}%
                                </span>
                            ) : null}
                        </p>
                        <div className="flex items-center gap-1">
                            <label
                                htmlFor={control.id}
                                className={button({
                                    variant: 'glass',
                                    size: 'xs',
                                    className: cn(
                                        inputFocused && 'ring-2 ring-mint/70',
                                        disabled &&
                                            'pointer-events-none opacity-50',
                                    ),
                                })}
                            >
                                <ImageUp aria-hidden />
                                Replace
                            </label>
                            {picked && value && !removed ? (
                                <button
                                    type="button"
                                    onClick={remove}
                                    className={button({
                                        variant: 'ghost',
                                        size: 'xs',
                                    })}
                                >
                                    <RotateCcw aria-hidden />
                                    Keep current
                                </button>
                            ) : canRemove ? (
                                <button
                                    type="button"
                                    onClick={remove}
                                    disabled={disabled}
                                    className={button({
                                        variant: 'danger',
                                        size: 'xs',
                                    })}
                                >
                                    <Trash2 aria-hidden />
                                    Remove
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {focus && crops.length ? (
                        <div className="flex flex-wrap items-end gap-3">
                            {crops.map((crop) => (
                                <figure
                                    key={crop.label}
                                    className="grid gap-1.5"
                                >
                                    <div
                                        className="h-24 overflow-hidden rounded-[10px] ring-1 ring-white/[0.14]"
                                        style={{ aspectRatio: crop.aspect }}
                                    >
                                        <img
                                            src={src}
                                            alt=""
                                            draggable={false}
                                            className="size-full object-cover"
                                            style={{
                                                objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <figcaption className="text-[10px] tracking-[0.16em] text-smoke uppercase">
                                        {crop.label}
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="relative">
                    <label
                        htmlFor={control.id}
                        onDragOver={onDragOver}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        className={cn(
                            'relative grid min-h-44 cursor-pointer place-items-center rounded-[20px] border border-dashed px-6 py-8 text-center transition-[border-color,background-color] duration-300 ease-glass',
                            inputFocused && 'ring-2 ring-mint/70',
                            disabled && 'cursor-not-allowed opacity-50',
                            dragging
                                ? 'border-mint bg-mint/[0.07]'
                                : 'border-white/20 bg-white/[0.03] hover:border-white/35 hover:bg-white/[0.05]',
                            (control['aria-invalid'] || problem) &&
                                'border-coral/70',
                        )}
                    >
                        <span className="grid justify-items-center gap-2">
                            {preparing ? (
                                <LoaderCircle
                                    aria-hidden
                                    className="size-5 animate-spin text-mint"
                                />
                            ) : (
                                <ImageUp
                                    aria-hidden
                                    className="size-5 text-mint"
                                />
                            )}
                            <span className="text-[14px] text-bone">
                                Drop {subject} here, or{' '}
                                <span className="text-mint underline decoration-mint/40 underline-offset-4">
                                    choose a file
                                </span>
                            </span>
                            <span className="text-[12px] text-smoke">
                                JPG, PNG, WebP or AVIF · at least {minSize} ×{' '}
                                {minSize} px · large photos are resized before
                                upload
                            </span>
                            {removed && value ? (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        setRemoved(false);
                                    }}
                                    className="mt-1 cursor-pointer rounded-[6px] text-[12.5px] text-mist underline decoration-white/25 underline-offset-4 hover:text-bone focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:outline-none"
                                >
                                    Undo remove
                                </button>
                            ) : null}
                        </span>
                    </label>
                </div>
            )}

            <p
                role="status"
                className={cn(
                    'flex items-center gap-2 text-[12.5px] text-mist',
                    !preparing && 'sr-only',
                )}
            >
                {preparing ? (
                    <>
                        <LoaderCircle
                            aria-hidden
                            className="size-3.5 shrink-0 animate-spin text-mint"
                        />
                        <span className="min-w-0 truncate">
                            Preparing {preparing} for upload…
                        </span>
                    </>
                ) : null}
            </p>

            {problem ? <FieldError id={errorId}>{problem}</FieldError> : null}
        </div>
    );
}
