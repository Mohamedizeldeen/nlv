<?php

namespace Tests\Feature\Media;

use App\Models\Look;
use App\Models\Story;
use App\Support\ImageUploader;
use App\Support\MediaRef;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class ImageUploaderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    public function test_an_upload_is_stored_as_webp_under_a_random_name(): void
    {
        $path = ImageUploader::store(UploadedFile::fake()->image('shopper.jpg', 800, 600), 'landing/looks/');

        $this->assertMatchesRegularExpression('#^landing/looks/[0-9a-f-]{36}\.webp$#', $path);
        Storage::disk('public')->assertExists($path);

        $size = getimagesize(Storage::disk('public')->path($path));

        $this->assertNotFalse($size);
        $this->assertSame('image/webp', $size['mime']);
        $this->assertSame([800, 600], [$size[0], $size[1]]);
    }

    public function test_the_longest_edge_is_scaled_down_to_2000_pixels(): void
    {
        $wide = ImageUploader::store(UploadedFile::fake()->image('wide.png', 3000, 1500), 'landing/looks');
        $tall = ImageUploader::store(UploadedFile::fake()->image('tall.jpg', 1000, 2600), 'landing/looks');

        $this->assertSame([2000, 1000], array_slice((array) getimagesize(Storage::disk('public')->path($wide)), 0, 2));
        $this->assertSame([769, 2000], array_slice((array) getimagesize(Storage::disk('public')->path($tall)), 0, 2));
    }

    public function test_metadata_is_stripped_and_the_camera_rotation_applied(): void
    {
        // A landscape JPEG whose EXIF says "rotate 90° clockwise" and carries a GPS-like marker.
        $jpeg = $this->jpegWithExif(800, 600, orientation: 6, marker: 'GPS-SECRET-24.7136N');
        $file = UploadedFile::fake()->createWithContent('phone.jpg', $jpeg);

        $this->assertSame(6, exif_read_data($file->getRealPath())['Orientation'] ?? null);

        $path = ImageUploader::store($file, 'landing/stories');
        $stored = Storage::disk('public')->get($path);

        $this->assertNotNull($stored);
        $this->assertStringNotContainsString('GPS-SECRET', $stored);
        $this->assertStringNotContainsString('Exif', $stored);
        $this->assertSame([600, 800], array_slice((array) getimagesizefromstring($stored), 0, 2));
    }

    public function test_avif_uploads_are_converted(): void
    {
        if (! function_exists('imageavif')) {
            $this->markTestSkipped('GD was built without AVIF support.');
        }

        $image = imagecreatetruecolor(400, 400);
        ob_start();
        imageavif($image, null, 60, 10);
        $avif = (string) ob_get_clean();

        $path = ImageUploader::store(UploadedFile::fake()->createWithContent('look.avif', $avif), 'landing/looks');

        $this->assertSame('image/webp', getimagesize(Storage::disk('public')->path($path))['mime'] ?? null);
    }

    public function test_a_file_that_is_not_an_image_is_refused(): void
    {
        $this->expectException(RuntimeException::class);

        ImageUploader::store(UploadedFile::fake()->createWithContent('fake.jpg', 'not an image at all'), 'landing/looks');
    }

    public function test_an_image_claiming_more_than_50_megapixels_is_refused_before_decoding(): void
    {
        // A tiny PNG whose header claims 30000 × 30000 px (a "decompression bomb").
        $ihdr = pack('NNCCCCC', 30000, 30000, 8, 6, 0, 0, 0);
        $png = "\x89PNG\r\n\x1a\n"
            .pack('N', strlen($ihdr)).'IHDR'.$ihdr.pack('N', crc32('IHDR'.$ihdr))
            .pack('N', 0).'IEND'.pack('N', crc32('IEND'));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('too large');

        ImageUploader::store(UploadedFile::fake()->createWithContent('bomb.png', $png), 'landing/looks');
    }

    public function test_delete_removes_uploads_but_never_unsplash_refs_or_outside_paths(): void
    {
        Storage::disk('public')->put('landing/looks/a.webp', 'x');
        Storage::disk('public')->put('keep.txt', 'x');

        ImageUploader::delete('landing/looks/a.webp');
        ImageUploader::delete('unsplash:photo-1546190075-ed60eaed45e4');
        ImageUploader::delete('landing/../keep.txt');
        ImageUploader::delete(null);

        Storage::disk('public')->assertMissing('landing/looks/a.webp');
        Storage::disk('public')->assertExists('keep.txt');
    }

    public function test_replacing_an_image_deletes_the_old_upload(): void
    {
        $first = ImageUploader::store(UploadedFile::fake()->image('a.jpg', 600, 800), 'landing/looks');
        $second = ImageUploader::store(UploadedFile::fake()->image('b.jpg', 600, 800), 'landing/looks');
        $look = Look::factory()->create(['after_image' => $first, 'before_image' => null]);

        $look->update(['after_image' => $second]);

        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);
    }

    public function test_deleting_a_record_deletes_its_uploads_only(): void
    {
        $portrait = ImageUploader::store(UploadedFile::fake()->image('p.jpg', 600, 800), 'landing/stories');
        $story = Story::factory()->create(['portrait' => $portrait]);
        $stock = Story::factory()->create(['portrait' => MediaRef::unsplash('photo-1')]);

        $story->delete();
        $stock->delete();

        Storage::disk('public')->assertMissing($portrait);
    }

    public function test_media_refs_are_described_for_the_page(): void
    {
        $path = ImageUploader::store(UploadedFile::fake()->image('p.jpg', 900, 1200), 'landing/stories');

        $this->assertNull(MediaRef::toArray(null));
        $this->assertNull(MediaRef::toArray(''));
        $this->assertNull(MediaRef::toArray('../../.env'));
        $this->assertSame(['kind' => 'unsplash', 'id' => 'photo-1'], MediaRef::toArray('unsplash:photo-1'));
        $this->assertSame(
            ['kind' => 'upload', 'url' => '/storage/'.$path, 'width' => 900, 'height' => 1200],
            MediaRef::toArray($path),
        );
        $this->assertSame(
            ['kind' => 'upload', 'url' => '/storage/landing/gone.webp', 'width' => null, 'height' => null],
            MediaRef::toArray('landing/gone.webp'),
        );

        $this->assertSame(0.75, MediaRef::aspect($path));
        $this->assertNull(MediaRef::aspect('unsplash:photo-1'));
        $this->assertNull(MediaRef::aspect('landing/gone.webp'));
    }

    /**
     * A baseline JPEG with an APP1 Exif segment (orientation + a marker string).
     */
    private function jpegWithExif(int $width, int $height, int $orientation, string $marker): string
    {
        $image = imagecreatetruecolor($width, $height);
        imagefill($image, 0, 0, (int) imagecolorallocate($image, 30, 120, 90));
        ob_start();
        imagejpeg($image, null, 90);
        $jpeg = (string) ob_get_clean();

        // Little-endian TIFF: one IFD with Orientation (0x0112, SHORT) and an
        // ImageDescription (0x010E, ASCII) pointing at the marker.
        $description = $marker."\0";
        $ifdOffset = 8;
        $entries = 2;
        $dataOffset = $ifdOffset + 2 + $entries * 12 + 4;

        $tiff = 'II'.pack('v', 42).pack('V', $ifdOffset)
            .pack('v', $entries)
            .pack('vvV', 0x010E, 2, strlen($description)).pack('V', $dataOffset)
            .pack('vvV', 0x0112, 3, 1).pack('vv', $orientation, 0)
            .pack('V', 0)
            .$description;

        $app1 = "Exif\0\0".$tiff;

        return substr($jpeg, 0, 2)."\xFF\xE1".pack('n', strlen($app1) + 2).$app1.substr($jpeg, 2);
    }
}
