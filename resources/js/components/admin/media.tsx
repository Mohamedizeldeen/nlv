import type { ComponentProps } from 'react';
import { unsplash } from '@/components/landing/photo';
import { cn } from '@/lib/utils';
import type { FocusPoint, MediaRef } from '@/types/admin';

/** A URL for a media ref at roughly `width` pixels wide (uncropped). */
export function mediaUrl(media: MediaRef, width = 800): string {
    return media.kind === 'unsplash' ? unsplash(media.id, width) : media.url;
}

/** Width / height of a media ref when known (uploads carry it; stock doesn't). */
export function mediaAspect(media: MediaRef): number | null {
    return media.kind === 'upload' && media.width && media.height
        ? media.width / media.height
        : null;
}

type MediaImageProps = Omit<ComponentProps<'img'>, 'src'> & {
    media: MediaRef;
    alt: string;
    /** Requested width in CSS pixels (doubled for sharp screens). */
    width?: number;
    /** Where the crop centres (object-position), 0..1 from the top-left. */
    focus?: FocusPoint;
};

/**
 * Renders a stored image (Unsplash stock or an upload) cropped by CSS
 * around its focal point. Size it with className, e.g. "size-12 rounded-[10px]".
 */
export function MediaImage({
    media,
    alt,
    width = 240,
    focus,
    className,
    style,
    ...props
}: MediaImageProps) {
    return (
        <img
            src={mediaUrl(media, Math.min(width * 2, 2000))}
            alt={alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            className={cn(
                'max-w-none shrink-0 bg-white/[0.05] object-cover',
                className,
            )}
            style={{
                objectPosition: focus
                    ? `${focus[0] * 100}% ${focus[1] * 100}%`
                    : undefined,
                ...style,
            }}
            {...props}
        />
    );
}
