import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { mediaUrl } from '@/components/admin/media';
import { unsplash } from '@/components/landing/photo';
import { cn } from '@/lib/utils';
import type { FocusPoint, MediaRef } from '@/types/admin';

/*
 * Crops that match the landing page. The page asks the Unsplash CDN for a
 * focal-point crop (`crop=focalpoint`, `fp-x/y`, `fp-z`): the photo covers
 * the frame, is zoomed by `zoom`, and is shifted so the focal point sits
 * in the middle of the frame without showing past the photo's edges.
 * FocalImage does the same in CSS, so the admin preview follows the focal
 * point and zoom instantly, for stock photos and new uploads alike.
 */

/** The story list's small avatar reuses the portrait's focus, zoomed in further. */
export const AVATAR_ZOOM_FACTOR = 2;
export const AVATAR_ZOOM_MAX = 4;

export function avatarZoom(zoom: number): number {
    return Math.min(
        AVATAR_ZOOM_MAX,
        Math.round(zoom * AVATAR_ZOOM_FACTOR * 100) / 100,
    );
}

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

/** Size and offset of the photo inside the frame, as percentages of the frame. */
export function focalBox(
    natural: { width: number; height: number },
    frameAspect: number,
    focus: FocusPoint,
    zoom: number,
): CSSProperties {
    const imageAspect = natural.width / natural.height;
    const scale = Math.max(1, zoom);
    // "cover": one side fits the frame, the other overflows.
    const width =
        (imageAspect > frameAspect ? imageAspect / frameAspect : 1) * scale;
    const height =
        (imageAspect > frameAspect ? 1 : frameAspect / imageAspect) * scale;
    const left = clamp(0.5 - focus[0] * width, 1 - width, 0);
    const top = clamp(0.5 - focus[1] * height, 1 - height, 0);

    return {
        width: `${width * 100}%`,
        height: `${height * 100}%`,
        left: `${left * 100}%`,
        top: `${top * 100}%`,
    };
}

type FocalImageProps = {
    src: string;
    alt: string;
    /** Frame width / height, e.g. 4 / 5 for the story card. */
    aspect: number;
    focus: FocusPoint;
    zoom?: number;
    className?: string;
    imgClassName?: string;
};

/** A photo cropped around its focal point, like the landing page crops it. */
export function FocalImage({
    src,
    alt,
    aspect,
    focus,
    zoom = 1,
    className,
    imgClassName,
}: FocalImageProps) {
    const img = useRef<HTMLImageElement>(null);
    const [size, setSize] = useState<{
        src: string;
        width: number;
        height: number;
    } | null>(null);
    const natural = size?.src === src ? size : null;

    const measure = (node: HTMLImageElement) => {
        if (node.complete && node.naturalWidth > 0) {
            setSize({
                src: node.getAttribute('src') ?? src,
                width: node.naturalWidth,
                height: node.naturalHeight,
            });
        }
    };

    // Server-rendered images can finish loading before hydration, when
    // onLoad no longer fires: measure whatever is already there.
    useEffect(() => {
        const node = img.current;

        if (node && node.complete && node.naturalWidth > 0) {
            setSize({
                src,
                width: node.naturalWidth,
                height: node.naturalHeight,
            });
        }
    }, [src]);

    return (
        <div
            className={cn('relative overflow-hidden', className)}
            style={{ aspectRatio: aspect }}
        >
            <img
                ref={img}
                src={src}
                alt={alt}
                draggable={false}
                decoding="async"
                onLoad={(event) => measure(event.currentTarget)}
                className={cn(
                    'absolute max-w-none select-none',
                    natural ? null : 'inset-0 size-full object-cover',
                    imgClassName,
                )}
                style={
                    natural
                        ? focalBox(natural, aspect, focus, zoom)
                        : {
                              objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`,
                          }
                }
            />
        </div>
    );
}

type StoryPhotoProps = {
    media: MediaRef;
    alt: string;
    /** Frame width / height. */
    aspect: number;
    focus: FocusPoint;
    zoom: number;
    /** Rendered width in CSS pixels (stock photos are fetched at 2x). */
    width: number;
    className?: string;
};

/**
 * A stored portrait at a fixed crop, e.g. the list's thumbnails. Stock
 * photos come pre-cropped from the CDN exactly as the landing page asks
 * for them; uploads are cropped in CSS.
 */
export function StoryPhoto({
    media,
    alt,
    aspect,
    focus,
    zoom,
    width,
    className,
}: StoryPhotoProps) {
    if (media.kind === 'unsplash') {
        return (
            <img
                src={unsplash(media.id, width * 2, {
                    ratio: 1 / aspect,
                    focus,
                    zoom,
                })}
                alt={alt}
                loading="lazy"
                decoding="async"
                draggable={false}
                className={cn(
                    'max-w-none bg-white/[0.05] object-cover select-none',
                    className,
                )}
                style={{ aspectRatio: aspect }}
            />
        );
    }

    return (
        <FocalImage
            src={mediaUrl(media, width * 2)}
            alt={alt}
            aspect={aspect}
            focus={focus}
            zoom={zoom}
            className={cn('bg-white/[0.05]', className)}
        />
    );
}
