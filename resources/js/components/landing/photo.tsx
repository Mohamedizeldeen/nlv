import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

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

type PhotoProps = Omit<ComponentProps<'img'>, 'src' | 'srcSet'> &
    CropOptions & {
        id: string;
        alt: string;
        /** Candidate widths for srcset. */
        widths?: number[];
        /** Above-the-fold images load eagerly with high priority. */
        priority?: boolean;
    };

/** Responsive Unsplash image. `sizes` should describe the rendered width. */
export function Photo({
    id,
    alt,
    widths = [480, 800, 1200, 1600],
    sizes = '100vw',
    ratio,
    quality,
    focus,
    zoom,
    priority = false,
    className,
    ...props
}: PhotoProps) {
    const options = { ratio, quality, focus, zoom };
    const largest = widths[widths.length - 1];

    return (
        <img
            src={unsplash(id, largest, options)}
            srcSet={widths
                .map((w) => `${unsplash(id, w, options)} ${w}w`)
                .join(', ')}
            sizes={sizes}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className={cn('object-cover', className)}
            {...props}
        />
    );
}
