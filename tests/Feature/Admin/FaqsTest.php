<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Faq;
use App\Models\User;
use App\Support\Activity;
use App\Support\LandingContent;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class FaqsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Faq $cloud;

    private Faq $photos;

    private Faq $install;

    protected function setUp(): void
    {
        parent::setUp();

        // Created without logging, so each test's activity starts empty.
        [$this->admin, $this->cloud, $this->photos, $this->install] = Activity::withoutModelLogging(fn () => [
            User::factory()->admin()->create(),
            Faq::factory()->create([
                'question' => 'What does the cloud app do?',
                'answer' => 'It runs the try-on on the device and keeps your catalogue up to date.',
                'question_ar' => 'ما دور التطبيق السحابي؟',
                'answer_ar' => 'يشغّل التجربة على الجهاز ويُبقي كتالوجك محدّثًا.',
            ]),
            Faq::factory()->unpublished()->create([
                'question' => 'Do you keep customer photos?',
                'answer' => 'No. Photos are deleted when the session ends.',
                'question_ar' => 'هل تحتفظون بصور العملاء؟',
                'answer_ar' => 'لا. تُحذف الصور بانتهاء الجلسة.',
            ]),
            Faq::factory()->create([
                'question' => 'How long does installation take?',
                'answer' => 'One visit. The device is ready the same day.',
                'question_ar' => 'كم يستغرق التركيب؟',
                'answer_ar' => null,
            ]),
        ]);
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function routes(): array
    {
        return [
            'index' => ['get', '/admin/faqs'],
            'create' => ['get', '/admin/faqs/create'],
            'store' => ['post', '/admin/faqs'],
            'edit' => ['get', '/admin/faqs/1/edit'],
            'update' => ['put', '/admin/faqs/1'],
            'destroy' => ['delete', '/admin/faqs/1'],
            'publish' => ['patch', '/admin/faqs/1/publish'],
            'reorder' => ['post', '/admin/faqs/reorder'],
        ];
    }

    #[DataProvider('routes')]
    public function test_guests_are_redirected_to_the_login_page(string $method, string $uri): void
    {
        $this->call($method, $uri)->assertRedirect(route('login'));
        $this->assertSame(3, Faq::query()->count());
    }

    #[DataProvider('routes')]
    public function test_non_admins_are_forbidden(string $method, string $uri): void
    {
        $this->actingAs(User::factory()->create())
            ->call($method, $uri, ['question' => 'Hi?', 'answer' => 'Hello.', 'is_published' => '1', 'ids' => [1]])
            ->assertForbidden();

        $this->assertSame(3, Faq::query()->count());
        $this->assertSame('What does the cloud app do?', $this->cloud->fresh()?->question);
    }

    public function test_the_index_lists_every_question_in_page_order(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.faqs.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/faqs/index')
                ->has('faqs', 3)
                ->where('faqs.0', [
                    'id' => $this->cloud->id,
                    'question' => 'What does the cloud app do?',
                    'answer' => 'It runs the try-on on the device and keeps your catalogue up to date.',
                    'question_ar' => 'ما دور التطبيق السحابي؟',
                    'answer_ar' => 'يشغّل التجربة على الجهاز ويُبقي كتالوجك محدّثًا.',
                    'missing_arabic' => [],
                    'is_published' => true,
                    'sort_order' => 0,
                    'updated_at' => $this->cloud->updated_at?->toIso8601String(),
                ])
                ->where('faqs.1.id', $this->photos->id)
                ->where('faqs.1.is_published', false)
                ->where('faqs.2.id', $this->install->id)
                ->where('faqs.2.missing_arabic', ['answer'])
                ->where('filters', ['search' => null, 'status' => null])
                ->where('counts', ['all' => 3, 'live' => 2])
                ->where('published', [
                    [
                        'id' => $this->cloud->id, 'question' => $this->cloud->question, 'answer' => $this->cloud->answer,
                        'question_ar' => $this->cloud->question_ar, 'answer_ar' => $this->cloud->answer_ar, 'sort_order' => 0,
                    ],
                    [
                        'id' => $this->install->id, 'question' => $this->install->question, 'answer' => $this->install->answer,
                        'question_ar' => 'كم يستغرق التركيب؟', 'answer_ar' => null, 'sort_order' => 2,
                    ],
                ])
                ->where('heading', ['en' => 'Asked before every order', 'ar' => Settings::string('sections.pricing.faq_title', 'ar')]),
            );
    }

    public function test_the_index_can_be_searched_and_filtered(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.faqs.index', ['search' => 'same day']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('faqs', 1)
                ->where('faqs.0.id', $this->install->id)
                ->where('filters.search', 'same day')
                ->where('counts.all', 3),
            );

        $this->actingAs($this->admin)
            ->get(route('admin.faqs.index', ['status' => 'hidden']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('faqs', 1)
                ->where('faqs.0.id', $this->photos->id)
                ->where('filters.status', 'hidden'),
            );

        $this->actingAs($this->admin)
            ->get(route('admin.faqs.index', ['status' => 'live', 'search' => 'photos']))
            ->assertInertia(fn (Assert $page) => $page->has('faqs', 0));

        // Wildcards in the search are taken literally; unknown statuses are ignored.
        $this->actingAs($this->admin)
            ->get(route('admin.faqs.index', ['search' => '%', 'status' => 'archived']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('faqs', 0)
                ->where('filters.status', null),
            );
    }

    public function test_the_search_takes_wildcards_literally(): void
    {
        [$deposit, $export, $bang] = Activity::withoutModelLogging(fn () => [
            Faq::factory()->create([
                'question' => 'Is there a deposit?',
                'answer' => 'Yes: 10% of the device price, paid when you order.',
            ]),
            Faq::factory()->create([
                'question' => 'Can I import my catalogue?',
                'answer' => 'Send us the catalogue_export file from your till system.',
            ]),
            Faq::factory()->create([
                'question' => 'Does it work for 100 stores?',
                'answer' => 'Yes! Chains get a rollout plan and one invoice.',
            ]),
        ]);
        Faq::factory()->create([
            'question' => 'Which catalogue export formats work?',
            'answer' => 'CSV or Excel.',
        ]);

        $ids = fn (string $search) => array_column(
            $this->actingAs($this->admin)->get(route('admin.faqs.index', ['search' => $search]))->viewData('page')['props']['faqs'],
            'id',
        );

        // "%" and "_" are not wildcards, and "!" (the escape character) is plain text too.
        $this->assertSame([$deposit->id], $ids('10%'));
        $this->assertSame([$export->id], $ids('catalogue_export'));
        $this->assertSame([$bang->id], $ids('yes!'));
    }

    public function test_the_create_and_edit_pages_render(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.faqs.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/faqs/create')
                ->has('published', 2)
                ->where('heading.en', 'Asked before every order'),
            );

        $this->actingAs($this->admin)
            ->get(route('admin.faqs.edit', $this->photos))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/faqs/edit')
                ->where('faq.id', $this->photos->id)
                ->where('faq.question', 'Do you keep customer photos?')
                ->where('faq.question_ar', 'هل تحتفظون بصور العملاء؟')
                ->where('faq.answer_ar', 'لا. تُحذف الصور بانتهاء الجلسة.')
                ->where('faq.is_published', false)
                ->has('published', 2),
            );
    }

    public function test_a_question_is_added_at_the_end_and_logged(): void
    {
        $this->actingAs($this->admin)
            ->post(route('admin.faqs.store'), [
                'question' => '  Can the device run on battery?  ',
                'answer' => 'No, it plugs into a normal wall socket.',
                'question_ar' => '  هل يعمل الجهاز بالبطارية؟  ',
                'answer_ar' => 'لا، يوصَل بمقبس كهرباء عادي.',
                'is_published' => '1',
            ])
            ->assertRedirect(route('admin.faqs.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Question added.']);

        $faq = Faq::query()->latest('id')->firstOrFail();
        $this->assertSame('Can the device run on battery?', $faq->question);
        $this->assertSame('هل يعمل الجهاز بالبطارية؟', $faq->question_ar);
        $this->assertSame('لا، يوصَل بمقبس كهرباء عادي.', $faq->answer_ar);
        $this->assertSame(3, $faq->sort_order);
        $this->assertTrue($faq->is_published);

        $log = ActivityLog::query()->sole();
        $this->assertSame('faq.created', $log->event);
        $this->assertSame($this->admin->id, $log->user_id);
        $this->assertSame($faq->id, $log->subject_id);

        $this->assertSame(
            ['What does the cloud app do?', 'How long does installation take?', 'Can the device run on battery?'],
            array_column(LandingContent::build()['pricing']['faqs'], 'question'),
        );
    }

    public function test_questions_are_validated(): void
    {
        $this->actingAs($this->admin)
            ->from(route('admin.faqs.create'))
            ->post(route('admin.faqs.store'), ['question' => '', 'answer' => '', 'question_ar' => '', 'answer_ar' => '', 'is_published' => 'maybe'])
            ->assertRedirect(route('admin.faqs.create'))
            ->assertSessionHasErrors([
                'question' => 'Write the question.',
                'answer' => 'Write the answer.',
                'question_ar' => 'Write the question in Arabic too.',
                'answer_ar' => 'Write the answer in Arabic too.',
                'is_published',
            ]);

        $this->actingAs($this->admin)
            ->post(route('admin.faqs.store'), [
                'question' => str_repeat('q', 201),
                'answer' => str_repeat('a', 1001),
                'question_ar' => str_repeat('س', 201),
                'answer_ar' => str_repeat('ج', 1001),
                'is_published' => '1',
            ])
            ->assertSessionHasErrors([
                'question', 'answer',
                'question_ar' => 'The Arabic question field must not be greater than 200 characters.',
                'answer_ar' => 'The Arabic answer field must not be greater than 1000 characters.',
            ]);

        $this->actingAs($this->admin)
            ->post(route('admin.faqs.store'), [
                'question' => 'Do you keep customer photos?',
                'answer' => 'Twice?',
                'question_ar' => 'هل تحتفظون بصور العملاء؟',
                'answer_ar' => 'مرتين؟',
                'is_published' => '0',
            ])
            ->assertSessionHasErrors([
                'question' => 'This question is already in the list.',
                'question_ar' => 'This Arabic question is already in the list.',
            ]);

        // Exactly at the limits is fine (counted in characters, not bytes).
        $this->actingAs($this->admin)
            ->post(route('admin.faqs.store'), [
                'question' => 'Can I pay in instalments?',
                'answer' => 'Yes: the Lease plan is one monthly fee.',
                'question_ar' => str_repeat('س', 200),
                'answer_ar' => str_repeat('ج', 1000),
                'is_published' => '0',
            ])
            ->assertSessionHasNoErrors();
        Faq::query()->where('question', 'Can I pay in instalments?')->delete();
        ActivityLog::query()->delete();

        $this->assertSame(3, Faq::query()->count());
        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_a_question_is_updated_and_logged(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.faqs.update', $this->photos), [
                'question' => 'Do you keep customer photos?',
                'answer' => 'Never. Photos are deleted when the session ends.',
                'question_ar' => 'هل تحتفظون بصور العملاء؟',
                'answer_ar' => 'لا. تُحذف الصور بانتهاء الجلسة.',
                'is_published' => '1',
            ])
            ->assertRedirect(route('admin.faqs.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Question saved.');

        $photos = $this->photos->fresh();
        $this->assertNotNull($photos);
        $this->assertSame('Never. Photos are deleted when the session ends.', $photos->answer);
        $this->assertTrue($photos->is_published);

        $log = ActivityLog::query()->sole();
        $this->assertSame('faq.updated', $log->event);
        $this->assertSame(['answer', 'is_published'], array_keys($log->properties['changes'] ?? []));
        $this->assertSame([false, true], $log->properties['changes']['is_published'] ?? null);

        $this->assertCount(3, LandingContent::build()['pricing']['faqs']);
    }

    public function test_saving_an_unchanged_question_logs_nothing(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.faqs.update', $this->cloud), [
                'question' => $this->cloud->question,
                'answer' => $this->cloud->answer,
                'question_ar' => $this->cloud->question_ar,
                'answer_ar' => $this->cloud->answer_ar,
                'is_published' => '1',
            ])
            ->assertInertiaFlash('toast', ['type' => 'info', 'message' => 'No changes to save.']);

        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_the_switch_in_the_list_shows_and_hides_a_question(): void
    {
        LandingContent::build();

        $this->actingAs($this->admin)
            ->from(route('admin.faqs.index', ['status' => 'live']))
            ->patch(route('admin.faqs.publish', $this->cloud), ['is_published' => false])
            ->assertRedirect(route('admin.faqs.index', ['status' => 'live']))
            ->assertInertiaFlash('toast.message', 'The question is hidden from the page.');

        $this->assertFalse($this->cloud->fresh()?->is_published);
        $this->assertSame(['How long does installation take?'], array_column(LandingContent::build()['pricing']['faqs'], 'question'));
        $this->assertSame('faq.updated', ActivityLog::query()->sole()->event);

        $this->actingAs($this->admin)
            ->patch(route('admin.faqs.publish', $this->photos), ['is_published' => true])
            ->assertInertiaFlash('toast.message', 'The question is live on the page.');

        $this->assertTrue($this->photos->fresh()?->is_published);

        $this->actingAs($this->admin)
            ->patch(route('admin.faqs.publish', $this->photos), [])
            ->assertSessionHasErrors(['is_published']);
    }

    public function test_the_questions_are_reordered_in_one_logged_step(): void
    {
        $this->actingAs($this->admin)
            ->from(route('admin.faqs.index'))
            ->post(route('admin.faqs.reorder'), ['ids' => [$this->install->id, $this->cloud->id]])
            ->assertRedirect(route('admin.faqs.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Order saved.');

        // The one left out keeps its place after the ones that were sent.
        $this->assertSame(
            [$this->install->id, $this->cloud->id, $this->photos->id],
            Faq::query()->ordered()->pluck('id')->all(),
        );

        $log = ActivityLog::query()->sole();
        $this->assertSame('faq.reordered', $log->event);
        $this->assertSame([$this->install->id, $this->cloud->id, $this->photos->id], $log->properties['order'] ?? null);

        $this->assertSame(
            ['How long does installation take?', 'What does the cloud app do?'],
            array_column(LandingContent::build()['pricing']['faqs'], 'question'),
        );
    }

    public function test_a_reorder_only_takes_existing_questions(): void
    {
        $this->actingAs($this->admin)
            ->post(route('admin.faqs.reorder'), ['ids' => [$this->install->id, 999]])
            ->assertSessionHasErrors(['ids.1']);

        $this->actingAs($this->admin)
            ->post(route('admin.faqs.reorder'), ['ids' => []])
            ->assertSessionHasErrors(['ids']);

        $this->assertSame(0, ActivityLog::query()->count());
    }

    public function test_the_arabic_is_saved_logged_and_shown_on_the_arabic_page(): void
    {
        $this->actingAs($this->admin)
            ->put(route('admin.faqs.update', $this->install), [
                'question' => $this->install->question,
                'answer' => $this->install->answer,
                'question_ar' => 'كم يستغرق تركيب الجهاز؟',
                'answer_ar' => 'زيارة واحدة. يصبح الجهاز جاهزًا في اليوم نفسه.',
                'is_published' => '1',
            ])
            ->assertRedirect(route('admin.faqs.index'))
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Question saved.');

        $install = $this->install->fresh();
        $this->assertNotNull($install);
        $this->assertSame('كم يستغرق تركيب الجهاز؟', $install->question_ar);
        $this->assertSame([], $install->missingArabic());

        $log = ActivityLog::query()->sole();
        $this->assertSame('faq.updated', $log->event);
        $this->assertSame([
            'question_ar' => ['كم يستغرق التركيب؟', 'كم يستغرق تركيب الجهاز؟'],
            'answer_ar' => [null, 'زيارة واحدة. يصبح الجهاز جاهزًا في اليوم نفسه.'],
        ], $log->properties['changes'] ?? null);

        $this->get('/ar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.pricing.faqs.1.question', 'كم يستغرق تركيب الجهاز؟')
                ->where('landing.pricing.faqs.1.answer', 'زيارة واحدة. يصبح الجهاز جاهزًا في اليوم نفسه.'),
            );

        $this->get('/')
            ->assertInertia(fn (Assert $page) => $page
                ->where('landing.pricing.faqs.1.question', 'How long does installation take?'),
            );
    }

    public function test_the_list_can_be_searched_in_arabic(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.faqs.index', ['search' => 'الجلسة']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('faqs', 1)
                ->where('faqs.0.id', $this->photos->id),
            );
    }

    public function test_a_question_is_deleted_and_logged(): void
    {
        $this->actingAs($this->admin)
            ->delete(route('admin.faqs.destroy', $this->cloud))
            ->assertRedirect(route('admin.faqs.index'))
            ->assertInertiaFlash('toast.message', 'Question deleted.');

        $this->assertModelMissing($this->cloud);

        $log = ActivityLog::query()->sole();
        $this->assertSame('faq.deleted', $log->event);
        $this->assertSame('Deleted FAQ “What does the cloud app do?”', $log->description);

        $this->assertSame(['How long does installation take?'], array_column(LandingContent::build()['pricing']['faqs'], 'question'));
    }
}
