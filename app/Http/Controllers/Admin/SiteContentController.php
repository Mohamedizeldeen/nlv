<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Content\SiteContentRequest;
use App\Models\ActivityLog;
use App\Support\Locales;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * /admin/content: the landing page's copy, contact details, social links,
 * headline figures and search snippet (config/landing.php → settings), one
 * tab per group. A field left empty uses the schema default; each save is
 * logged as ONE settings.updated entry with the grouped diff.
 *
 * Copy is edited in English and Arabic: a translatable setting has a second
 * input named "<key>_ar" (empty: the Arabic default), and each language is
 * stored, reset and logged on its own ("hero.title_ar" in the diff).
 * Addresses, links and figures have one input for both pages.
 */
class SiteContentController extends Controller
{
    /**
     * The groups edited on this page (the pricing group has its own page).
     *
     * @return list<string>
     */
    public static function groupKeys(): array
    {
        return array_keys(array_filter(Settings::groups(), fn (array $group): bool => $group['site_content']));
    }

    /**
     * One group's fields (`?group=contact`, default the first group).
     */
    public function edit(Request $request): Response
    {
        $groups = self::groupKeys();
        $group = $request->query('group');
        $group = is_string($group) && in_array($group, $groups, true) ? $group : ($groups[0] ?? '');

        $schema = Settings::schema();
        $stored = Settings::storedValues(Locales::ENGLISH);
        $storedAr = Settings::storedValues(Locales::ARABIC);

        return Inertia::render('admin/content/edit', [
            'group' => $group,
            'groups' => array_map(function (string $key) use ($schema, $stored, $storedAr): array {
                $keys = array_keys(array_filter($schema, fn (array $definition): bool => $definition['group'] === $key));

                return [
                    'key' => $key,
                    'label' => Settings::groups()[$key]['label'],
                    'help' => Settings::groups()[$key]['help'],
                    'total' => count($keys),
                    'customised' => count(array_filter(
                        $keys,
                        fn (string $setting): bool => ($stored[$setting] ?? null) !== null || ($storedAr[$setting] ?? null) !== null,
                    )),
                ];
            }, $groups),
            'fields' => array_map(
                fn (string $key): array => [
                    'key' => $key,
                    'label' => $schema[$key]['label'],
                    'type' => $schema[$key]['type'],
                    'help' => $schema[$key]['help'],
                    'translatable' => $schema[$key]['translatable'],
                    'default' => $this->display(Settings::defaultFor($key, Locales::ENGLISH)),
                    'value' => $this->display($stored[$key] ?? null),
                    'default_ar' => $schema[$key]['translatable'] ? $this->display(Settings::defaultFor($key, Locales::ARABIC)) : null,
                    'value_ar' => $schema[$key]['translatable'] ? $this->display($storedAr[$key] ?? null) : null,
                ],
                array_keys(array_filter($schema, fn (array $definition): bool => $definition['group'] === $group)),
            ),
            'lastSaved' => $this->lastSaved($group),
        ]);
    }

    /**
     * Save one group. Unchanged fields are skipped; nothing is logged when
     * nothing changed.
     */
    public function update(SiteContentRequest $request, string $group): RedirectResponse
    {
        $label = Settings::groups()[$group]['label'];
        $changes = Settings::setMany($request->settings(), 'settings.updated', "Updated site content: {$label}");

        Inertia::flash('toast', $changes === []
            ? ['type' => 'info', 'message' => 'Nothing changed.']
            : ['type' => 'success', 'message' => "{$label} saved."]);

        return to_route('admin.content.edit', ['group' => $group]);
    }

    /**
     * A value as the form shows it: numbers stay numbers, everything else
     * is a string; empty is null.
     */
    private function display(mixed $value): string|int|null
    {
        return match (true) {
            is_int($value) => $value,
            is_float($value) => (int) $value,
            is_scalar($value) && (string) $value !== '' => (string) $value,
            default => null,
        };
    }

    /**
     * When the group was last saved, and by whom.
     *
     * @return array{at: string, user: string|null}|null
     */
    private function lastSaved(string $group): ?array
    {
        $entry = ActivityLog::query()
            ->with('user:id,name')
            ->where('event', 'settings.updated')
            ->whereJsonContains('properties->groups', $group)
            ->latest('created_at')
            ->orderByDesc('id')
            ->first();

        if ($entry === null || $entry->created_at === null) {
            return null;
        }

        return [
            'at' => $entry->created_at->toIso8601String(),
            'user' => $entry->user?->name,
        ];
    }
}
