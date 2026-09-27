<?php

namespace App\Http\Responses;

use App\Http\Responses\Concerns\RedirectsToAdminPanel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class PasskeyLoginResponse implements PasskeyLoginResponseContract
{
    use RedirectsToAdminPanel;

    /**
     * Create an HTTP response that represents the object.
     *
     * @param  Request  $request
     */
    public function toResponse($request): Response
    {
        $redirect = redirect()->intended($this->home());

        return $request->wantsJson()
            ? new JsonResponse(['redirect' => $redirect->getTargetUrl()])
            : $redirect;
    }
}
