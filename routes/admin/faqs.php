<?php

use App\Http\Controllers\Admin\FaqController;
use Illuminate\Support\Facades\Route;

/*
| The questions under the pricing plans: CRUD, the publish switch in the
| list and the drag-and-drop page order.
*/

Route::post('faqs/reorder', [FaqController::class, 'reorder'])->name('faqs.reorder');
Route::patch('faqs/{faq}/publish', [FaqController::class, 'publish'])->name('faqs.publish');
Route::resource('faqs', FaqController::class)->except('show');
