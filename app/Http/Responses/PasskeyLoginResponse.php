<?php

namespace App\Http\Responses;

use App\Http\Responses\Concerns\RedirectsAdminsToPanel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class PasskeyLoginResponse implements PasskeyLoginResponseContract
{
    use RedirectsAdminsToPanel;

    /**
     * Create an HTTP response that represents the object.
     *
     * @param  Request  $request
     */
    public function toResponse($request): Response
    {
        $redirect = redirect()->intended($this->home($request));

        return $request->wantsJson()
            ? new JsonResponse(['redirect' => $redirect->getTargetUrl()])
            : $redirect;
    }
}
