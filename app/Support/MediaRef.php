<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

/**
 * Image columns hold a "media ref": either `unsplash:photo-<id>` (seeded stock
 * photography, served from the Unsplash CDN by the page) or a path on the
 * public disk (`landing/looks/<uuid>.webp`, written by ImageUploader).
 */
class MediaRef
{
    /**
     * The prefix of Unsplash refs.
     */
    public const UNSPLASH = 'unsplash:';

    /**
     * The ref for an Unsplash photo id ("photo-1762605135318-f34a993cbcf0").
     */
    public static function unsplash(string $id): string
    {
        return self::UNSPLASH.$id;
    }

    /**
     * Whether the ref points at an Unsplash photo.
     */
    public static function isUnsplash(?string $ref): bool
    {
        return $ref !== null && str_starts_with($ref, self::UNSPLASH);
    }

    /**
     * Whether the ref is a safe relative path on the public disk.
     */
    public static function isUpload(?string $ref): bool
    {
        return $ref !== null
            && $ref !== ''
            && ! self::isUnsplash($ref)
            && ! str_starts_with($ref, '/')
            && ! str_contains($ref, '..')
            && ! str_contains($ref, '://')
            && ! str_contains($ref, '\\');
    }

    /**
     * The ref as the page (and the admin previews) need it:
     * {kind: 'unsplash', id} or {kind: 'upload', url, width, height}.
     *
     * @return array{kind: 'unsplash', id: string}|array{kind: 'upload', url: string, width: int|null, height: int|null}|null
     */
    public static function toArray(?string $ref): ?array
    {
        if ($ref === null || trim($ref) === '') {
            return null;
        }

        if (self::isUnsplash($ref)) {
            $id = substr($ref, strlen(self::UNSPLASH));

            return $id === '' ? null : ['kind' => 'unsplash', 'id' => $id];
        }

        if (! self::isUpload($ref)) {
            return null;
        }

        [$width, $height] = self::dimensions($ref);

        return [
            'kind' => 'upload',
            'url' => self::url($ref),
            'width' => $width,
            'height' => $height,
        ];
    }

    /**
     * Width / height of an uploaded image (3 decimals, as looks.aspect stores
     * it), or null for Unsplash refs and unreadable files.
     */
    public static function aspect(?string $ref): ?float
    {
        if (! self::isUpload($ref)) {
            return null;
        }

        [$width, $height] = self::dimensions((string) $ref);

        return $width && $height ? round($width / $height, 3) : null;
    }

    /**
     * The public URL of an upload: root-relative when the disk is served by this
     * app (so it works whatever host the site is opened on), absolute otherwise.
     */
    public static function url(string $path): string
    {
        $url = Storage::disk('public')->url($path);
        $appUrl = rtrim((string) config('app.url'), '/');

        if ($appUrl !== '' && str_starts_with($url, $appUrl.'/')) {
            return substr($url, strlen($appUrl));
        }

        return $url;
    }

    /**
     * Pixel size of an uploaded image, or [null, null] when it cannot be read.
     *
     * @return array{0: int|null, 1: int|null}
     */
    private static function dimensions(string $path): array
    {
        $disk = Storage::disk('public');

        if (! $disk->exists($path)) {
            return [null, null];
        }

        $size = @getimagesize($disk->path($path));

        return $size === false ? [null, null] : [$size[0], $size[1]];
    }
}
