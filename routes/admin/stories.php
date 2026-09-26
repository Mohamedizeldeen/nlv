<?php

use App\Http\Controllers\Admin\StoryController;
use Illuminate\Support\Facades\Route;

/*
| Stories: the store owners quoted on the landing page (/admin/stories).
| Loaded inside the admin group (routes/admin.php): paths are relative to
| /admin and names to "admin.".
*/

Route::post('stories/reorder', [StoryController::class, 'reorder'])->name('stories.reorder');
Route::patch('stories/{story}/publish', [StoryController::class, 'publish'])->name('stories.publish');
Route::resource('stories', StoryController::class)->except('show');
