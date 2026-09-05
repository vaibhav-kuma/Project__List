<?php

namespace App\Http\Middleware;

use Illuminate\View\Middleware\ShareErrorsFromSession as Middleware;

class ShareErrorsFromSession extends Middleware
{
    /**
     * The names of the attributes that should not be trimmed.
     *
     * @var array<int, string>
     */
    protected $except = [
        //
    ];
}
