<?php

namespace App\Http\Requests\Admin\Stories;

/**
 * Editing a story: without a new portrait file the current one is kept.
 */
class UpdateStoryRequest extends StoryRequest
{
    /**
     * The stored portrait stays unless a new file is sent.
     */
    protected function portraitRequired(): bool
    {
        return false;
    }
}
