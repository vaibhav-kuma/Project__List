<?php

namespace App\Http\Middleware;

use Illuminate\Session\Middleware\StartSession as Middleware;

class StartSession extends Middleware
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
