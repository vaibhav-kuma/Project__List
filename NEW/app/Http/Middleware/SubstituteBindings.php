<?php

namespace App\Http\Middleware;

use Illuminate\Routing\Middleware\SubstituteBindings as Middleware;

class SubstituteBindings extends Middleware
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
