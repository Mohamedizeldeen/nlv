<?php

namespace App\Http\Requests\Admin\Stories;

/**
 * Adding a story: a portrait is required.
 */
class StoreStoryRequest extends StoryRequest
{
    /**
     * A new story needs a portrait.
     */
    protected function portraitRequired(): bool
    {
        return true;
    }
}
