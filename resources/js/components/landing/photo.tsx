import type { ComponentProps, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { MediaRef } from '@/types/landing';

type CropOptions = {
    /** Output height divided by width; omit to keep the original ratio. */
    ratio?: number;
    quality?: number;
    /** Focal point, 0..1 from the top-left corner. */
    focus?: [number, number];
    /** Focal zoom (1 = none). Use it to pull a detail crop out of a photo. */
    zoom?: number;
};

/** Build an Unsplash CDN (imgix) URL for a photo id like "photo-1483985988355-763728e1935b". */
export function unsplash(
    id: string,
    width: number,
    { ratio, quality = 70, focus, zoom }: CropOptions = {},
): string {
    const params = new URLSearchParams({
        auto: 'format',
        w: String(width),
        q: String(quality),
    });

    if (ratio) {
        params.set('h', String(Math.round(width * ratio)));
        params.set('fit', 'crop');

        if (focus || zoom) {
            const [x, y] = focus ?? [0.5, 0.5];
            params.set('crop', 'focalpoint');
            params.set('fp-x', String(x));
            params.set('fp-y', String(y));
            params.set('fp-z', String(zoom ?? 1));
        }
    }

    return `https://images.unsplash.com/${id}?${params.toString()}`;
}

/**
 * A single URL for a media ref (CSS backgrounds, previews): Unsplash photos
 * are cropped by the CDN, uploads are served as stored.
 */
export function mediaSrc(
    media: MediaRef,
    width: number,
    options: CropOptions = {},
): string {
    return media.kind === 'unsplash'
        ? unsplash(media.id, width, options)
        : media.url;
}

/** Either an Unsplash id (designed artwork in images.ts) or a managed media ref. */
type PhotoSource =
    | { id: string; media?: MediaRef | null }
    | { id?: string; media: MediaRef };

type PhotoProps = Omit<ComponentProps<'img'>, 'src' | 'srcSet' | 'id'> &
    CropOptions &
    PhotoSource & {
        alt: string;
        /** Candidate widths for srcset (Unsplash only). */
        widths?: number[];
        /** Above-the-fold images load eagerly with high priority. */
        priority?: boolean;
    };

/**
 * Responsive image. `sizes` should describe the rendered width.
 *
 * `media` (from the landing payload) wins over `id`. Unsplash refs get the
 * CDN srcset and crop; an upload is a plain <img> with its stored width and
 * height, framed by `object-cover` with `focus` as its object-position
 * (`ratio` and `zoom` crop on the CDN only: size the element with CSS).
 */
export function Photo({
    id,
    media,
    alt,
    widths = [480, 800, 1200, 1600],
    sizes = '100vw',
    ratio,
    quality,
    focus,
    zoom,
    priority = false,
    className,
    style,
    ...props
}: PhotoProps) {
    const loading = priority ? 'eager' : 'lazy';
    const fetchPriority = priority ? 'high' : 'auto';

    if (media?.kind === 'upload') {
        const framed: CSSProperties | undefined = focus
            ? {
                  objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`,
                  ...style,
              }
            : style;

        return (
            <img
                src={media.url}
                width={media.width ?? undefined}
                height={media.height ?? undefined}
                alt={alt}
                loading={loading}
                fetchPriority={fetchPriority}
                decoding="async"
                className={cn('object-cover', className)}
                style={framed}
                {...props}
            />
        );
    }

    const photoId = media?.kind === 'unsplash' ? media.id : (id ?? '');
    const options = { ratio, quality, focus, zoom };
    const largest = widths[widths.length - 1];

    return (
        <img
            src={unsplash(photoId, largest, options)}
            srcSet={widths
                .map((w) => `${unsplash(photoId, w, options)} ${w}w`)
                .join(', ')}
            sizes={sizes}
            alt={alt}
            loading={loading}
            fetchPriority={fetchPriority}
            decoding="async"
            className={cn('object-cover', className)}
            style={style}
            {...props}
        />
    );
}
