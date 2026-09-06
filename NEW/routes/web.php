<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

Route::get('/dashboard', function () {
    $user = auth()->user();
    
    // Load relationships if they exist
    $user->load(['teams.authorizations', 'teams.penetrationTests', 'teams.findings', 'domains']);
    
    $activeAuthorizations = $user->teams->flatMap(function($team) {
        return $team->authorizations->where('is_active', true);
    });
    
    $activePentestsCount = $user->teams->flatMap(function($team) {
        return $team->penetrationTests->where('status', 'in_progress');
    })->count();
    
    $criticalFindingsCount = $user->teams->flatMap(function($team) {
        return $team->findings->where('severity', 'critical');
    })->count();
    
    // Calculate compliance score
    $complianceScore = 0;
    if ($user->teams->first()?->is_verified) $complianceScore += 25;
    if ($user->is_verified) $complianceScore += 25;
    if ($activeAuthorizations->count() > 0) $complianceScore += 25;
    if ($user->terms_accepted_at) $complianceScore += 25;

    return view('dashboard', compact(
        'user', 
        'activeAuthorizations', 
        'activePentestsCount', 
        'criticalFindingsCount',
        'complianceScore'
    ));
})->middleware(['auth'])->name('dashboard');

// Legal routes
Route::get('/legal/terms', function () {
    return view('legal.terms');
})->name('legal.terms');

Route::get('/legal/privacy', function () {
    return view('legal.privacy');
})->name('legal.privacy');

Route::get('/legal/acceptable-use', function () {
    return view('legal.acceptable-use');
})->name('legal.acceptable-use');

// Accept Terms of Service
Route::post('/legal/terms/accept', function (\Illuminate\Http\Request $request) {
    $user = auth()->user();
    abort_unless($user, 403);

    $user->terms_accepted = true;
    $user->terms_accepted_at = now();
    $user->terms_ip_address = $request->ip();
    $user->save();

    return redirect()->route('dashboard')->with('success', 'Terms accepted');
})->middleware(['auth'])->name('legal.terms.accept');

// Accept Privacy Policy
Route::post('/legal/privacy/accept', function (\Illuminate\Http\Request $request) {
    $user = auth()->user();
    abort_unless($user, 403);

    $user->privacy_policy_accepted = true;
    $user->privacy_policy_accepted_at = now();
    $user->save();

    return redirect()->route('dashboard')->with('success', 'Privacy Policy accepted');
})->middleware(['auth'])->name('legal.privacy.accept');

// Accept Acceptable Use Policy
Route::post('/legal/acceptable-use/accept', function (\Illuminate\Http\Request $request) {
    $user = auth()->user();
    abort_unless($user, 403);

    $user->aup_accepted = true;
    $user->aup_accepted_at = now();
    $user->save();

    return redirect()->route('dashboard')->with('success', 'Acceptable Use Policy accepted');
})->middleware(['auth'])->name('legal.acceptable-use.accept');

// Health check
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toISOString(),
        'version' => '1.0.0',
    ]);
})->name('health');
