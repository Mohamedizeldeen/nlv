<?php

namespace App\Support;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Stores admin image uploads on the public disk as WebP.
 *
 * Every upload is decoded and re-encoded with GD: that turns it into WebP
 * (quality 82), scales the longest edge down to 2000px, applies the camera's
 * EXIF rotation and drops all metadata (EXIF, GPS, colour profiles) on the way.
 */
class ImageUploader
{
    /**
     * Longest edge of a stored image, in pixels.
     */
    public const MAX_EDGE = 2000;

    /**
     * WebP quality.
     */
    public const QUALITY = 82;

    /**
     * Largest image (in pixels) that is decoded: 50 megapixels. A bigger one
     * would need more memory than PHP has once GD unpacks it (a small PNG
     * can claim 30000 × 30000 px), so it is refused before decoding.
     */
    public const MAX_PIXELS = 50_000_000;

    /**
     * Validation for every image upload in the admin.
     *
     * @var list<string>
     */
    public const RULES = ['image', 'mimes:jpg,jpeg,png,webp,avif', 'max:8192', 'dimensions:min_width=400,min_height=400'];

    /**
     * The validation rules for an image field.
     *
     * @return list<string>
     */
    public static function rules(bool $required = false): array
    {
        return [$required ? 'required' : 'nullable', ...self::RULES];
    }

    /**
     * Re-encode the upload and store it as `<folder>/<uuid>.webp` on the
     * public disk. Returns the stored path (the media ref).
     *
     * @throws RuntimeException when the file cannot be read as an image
     */
    public static function store(UploadedFile $file, string $folder): string
    {
        self::ensureMemory();

        $contents = @file_get_contents($file->getRealPath() ?: $file->getPathname());

        if ($contents === false || $contents === '') {
            throw new RuntimeException('The image could not be read.');
        }

        $size = @getimagesizefromstring($contents);

        if ($size !== false && $size[0] * $size[1] > self::MAX_PIXELS) {
            throw new RuntimeException('The image is too large to process.');
        }

        $image = @imagecreatefromstring($contents);

        if (! $image instanceof GdImage) {
            throw new RuntimeException('The image could not be read.');
        }

        $image = self::orient($image, $contents);
        $image = self::fit($image);

        ob_start();
        $encoded = imagewebp($image, null, self::QUALITY);
        $webp = (string) ob_get_clean();

        if (! $encoded || $webp === '') {
            throw new RuntimeException('The image could not be converted to WebP.');
        }

        $path = trim($folder, '/').'/'.Str::uuid()->toString().'.webp';

        Storage::disk('public')->put($path, $webp);

        return $path;
    }

    /**
     * Delete an uploaded image. Unsplash refs and anything outside the public
     * disk are left alone; a missing file is not an error.
     */
    public static function delete(?string $ref): void
    {
        if (MediaRef::isUpload($ref)) {
            Storage::disk('public')->delete((string) $ref);
        }
    }

    /**
     * Scale down so the longest edge is at most MAX_EDGE, keeping transparency.
     */
    private static function fit(GdImage $image): GdImage
    {
        if (! imageistruecolor($image)) {
            imagepalettetotruecolor($image);
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $scale = min(1, self::MAX_EDGE / max($width, $height));

        if ($scale >= 1) {
            imagealphablending($image, false);
            imagesavealpha($image, true);

            return $image;
        }

        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));

        $resized = imagecreatetruecolor($targetWidth, $targetHeight);

        if (! $resized instanceof GdImage) {
            throw new RuntimeException('The image could not be resized.');
        }

        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagefill($resized, 0, 0, (int) imagecolorallocatealpha($resized, 0, 0, 0, 127));
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        return $resized;
    }

    /**
     * Apply a JPEG's EXIF orientation, so phone photos are stored upright once
     * the metadata is gone.
     */
    private static function orient(GdImage $image, string $contents): GdImage
    {
        if (! function_exists('exif_read_data') || ! str_starts_with($contents, "\xFF\xD8")) {
            return $image;
        }

        $exif = @exif_read_data('data://image/jpeg;base64,'.base64_encode($contents));
        $orientation = is_array($exif) && isset($exif['Orientation']) ? (int) $exif['Orientation'] : 1;

        $rotated = match ($orientation) {
            3 => imagerotate($image, 180, 0),
            6 => imagerotate($image, -90, 0),
            8 => imagerotate($image, 90, 0),
            default => $image,
        };

        return $rotated instanceof GdImage ? $rotated : $image;
    }

    /**
     * Large photos need more memory than PHP's default while decoded.
     */
    private static function ensureMemory(): void
    {
        $limit = (string) ini_get('memory_limit');

        if ($limit === '-1') {
            return;
        }

        $bytes = (int) $limit;
        $unit = strtolower(substr($limit, -1));
        $bytes *= match ($unit) {
            'g' => 1024 ** 3,
            'm' => 1024 ** 2,
            'k' => 1024,
            default => 1,
        };

        if ($bytes < 512 * 1024 ** 2) {
            ini_set('memory_limit', '512M');
        }
    }
}
