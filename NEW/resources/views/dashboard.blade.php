@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Page Header -->
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Security Dashboard</h1>
        <p class="mt-2 text-gray-600">Professional security testing platform with legal compliance</p>
    </div>

    <!-- Legal Compliance Alert -->
    @if($user->teams->isEmpty() || !$user->teams->first()->is_verified)
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-yellow-700">
                        <strong>Verification Required:</strong> Your team must be verified before conducting security testing. 
                        @if(\Illuminate\Support\Facades\Route::has('teams.verify'))
                        <a href="{{ route('teams.verify') }}" class="underline font-semibold">Complete Verification Now</a>
                        @endif
                    </p>
                </div>
            </div>
        </div>
    @endif

    <!-- Authorization Status Alert -->
    @if($activeAuthorizations->isEmpty())
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-gavel text-red-400"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-red-700">
                        <strong>NO ACTIVE AUTHORIZATIONS:</strong> You cannot conduct security testing without active authorizations. 
                        @if(\Illuminate\Support\Facades\Route::has('authorizations.create'))
                        <a href="{{ route('authorizations.create') }}" class="underline font-semibold">Create Authorization</a>
                        @endif
                    </p>
                </div>
            </div>
        </div>
    @endif

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Domains Card -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <i class="fas fa-globe text-primary text-2xl"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dl>
                            <dt class="text-sm font-medium text-gray-500 truncate">Domains</dt>
                            <dd class="text-lg font-medium text-gray-900">{{ $user->domains->count() }}</dd>
                        </dl>
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 px-5 py-3">
                <div class="text-sm">
                    @if(Route::has('domains.index'))
                    <a href="{{ route('domains.index') }}" class="font-medium text-primary hover:text-blue-700">
                        View all domains <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                    @endif
                </div>
            </div>
        </div>

        <!-- Authorizations Card -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <i class="fas fa-file-contract text-secondary text-2xl"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dl>
                            <dt class="text-sm font-medium text-gray-500 truncate">Active Authorizations</dt>
                            <dd class="text-lg font-medium text-gray-900">{{ $activeAuthorizations->count() }}</dd>
                        </dl>
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 px-5 py-3">
                <div class="text-sm">
                    @if(Route::has('authorizations.index'))
                    <a href="{{ route('authorizations.index') }}" class="font-medium text-secondary hover:text-purple-700">
                        Manage authorizations <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                    @endif
                </div>
            </div>
        </div>

        <!-- Pentests Card -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <i class="fas fa-bug text-warning text-2xl"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dl>
                            <dt class="text-sm font-medium text-gray-500 truncate">Active Pentests</dt>
                            <dd class="text-lg font-medium text-gray-900">
                                {{ $activePentestsCount }}
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 px-5 py-3">
                <div class="text-sm">
                    @if(Route::has('pentests.index'))
                    <a href="{{ route('pentests.index') }}" class="font-medium text-warning hover:text-yellow-700">
                        View pentests <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                    @endif
                </div>
            </div>
        </div>

        <!-- Findings Card -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-danger text-2xl"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dl>
                            <dt class="text-sm font-medium text-gray-500 truncate">Critical Findings</dt>
                            <dd class="text-lg font-medium text-gray-900">
                                {{ $criticalFindingsCount }}
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 px-5 py-3">
                <div class="text-sm">
                    @if(Route::has('findings.index'))
                    <a href="{{ route('findings.index') }}" class="font-medium text-danger hover:text-red-700">
                        View findings <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                    @endif
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Activity & Legal Status -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Recent Activity -->
        <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div class="flow-root">
                    <ul class="-mb-8">
                        @php
                            // Check if ActivityLog exists, if not use a dummy array
                            $recentActivity = [];
                            if (class_exists('Spatie\Activitylog\Models\Activity')) {
                                $recentActivity = \Spatie\Activitylog\Models\Activity::where('causer_id', $user->id)
                                    ->with('causer')
                                    ->orderBy('created_at', 'desc')
                                    ->limit(5)
                                    ->get();
                            }
                        @endphp
                        @forelse($recentActivity as $activity)
                            <li>
                                <div class="relative pb-8">
                                    @if(!$loop->last)
                                        <span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                                    @endif
                                    <div class="relative flex space-x-3">
                                        <div>
                                            <span class="h-8 w-8 rounded-full bg-primary flex items-center justify-center ring-8 ring-white">
                                                <i class="fas fa-shield-alt text-white text-xs"></i>
                                            </span>
                                        </div>
                                        <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                            <div>
                                                <p class="text-sm text-gray-500">{{ $activity->description }}</p>
                                            </div>
                                            <div class="text-right text-sm whitespace-nowrap text-gray-500">
                                                <time>{{ $activity->created_at->diffForHumans() }}</time>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        @empty
                            <li class="text-center text-gray-500 py-4">
                                <i class="fas fa-info-circle mr-2"></i>
                                No recent activity
                            </li>
                        @endforelse
                    </ul>
                </div>
            </div>
        </div>

        <!-- Legal Compliance Status -->
        <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                    <i class="fas fa-gavel mr-2"></i> Legal Compliance Status
                </h3>
                
                <!-- Team Verification -->
                <div class="mb-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            @php
                                $team = $user->teams->first();
                            @endphp
                            @if($team && $team->is_verified)
                                <i class="fas fa-check-circle text-success mr-2"></i>
                                <span class="text-sm font-medium text-gray-900">Team Verified</span>
                            @else
                                <i class="fas fa-times-circle text-danger mr-2"></i>
                                <span class="text-sm font-medium text-gray-900">Team Verification Required</span>
                            @endif
                        </div>
                        @if($team && !$team->is_verified && \Illuminate\Support\Facades\Route::has('teams.verify'))
                            <a href="{{ route('teams.verify') }}" class="text-sm text-primary hover:text-blue-700">
                                Verify Now
                            </a>
                        @endif
                    </div>
                </div>

                <!-- User Verification -->
                <div class="mb-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            @if($user->is_verified)
                                <i class="fas fa-check-circle text-success mr-2"></i>
                                <span class="text-sm font-medium text-gray-900">Identity Verified</span>
                            @else
                                <i class="fas fa-times-circle text-danger mr-2"></i>
                                <span class="text-sm font-medium text-gray-900">Identity Verification Required</span>
                            @endif
                        </div>
                        @if(!$user->is_verified && \Illuminate\Support\Facades\Route::has('verification.create'))
                            <a href="{{ route('verification.create') }}" class="text-sm text-primary hover:text-blue-700">
                                Verify Now
                            </a>
                        @endif
                    </div>
                </div>

                <!-- Active Authorizations -->
                <div class="mb-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            @if($activeAuthorizations->count() > 0)
                                <i class="fas fa-check-circle text-success mr-2"></i>
                                <span class="text-sm font-medium text-gray-900">{{ $activeAuthorizations->count() }} Active Authorization(s)</span>
                            @else
                                <i class="fas fa-times-circle text-danger mr-2"></i>
                                <span class="text-sm font-medium text-gray-900">No Active Authorizations</span>
                            @endif
                        </div>
                        @if($activeAuthorizations->count() === 0 && \Illuminate\Support\Facades\Route::has('authorizations.create'))
                            <a href="{{ route('authorizations.create') }}" class="text-sm text-primary hover:text-blue-700">
                                Create Authorization
                            </a>
                        @endif
                    </div>
                </div>

                <!-- Terms Acceptance -->
                <div class="mb-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            @if($user->terms_accepted_at)
                                <i class="fas fa-check-circle text-success mr-2"></i>
                                <span class="text-sm font-medium text-gray-900">Terms Accepted</span>
                            @else
                                <i class="fas fa-times-circle text-danger mr-2"></i>
                                <span class="text-sm font-medium text-gray-900">Terms Not Accepted</span>
                            @endif
                        </div>
                        @if(!$user->terms_accepted_at)
                            <a href="{{ route('legal.terms') }}" class="text-sm text-primary hover:text-blue-700">
                                Review Terms
                            </a>
                        @endif
                    </div>
                </div>

                <!-- Compliance Score -->
                <div class="mt-6 pt-4 border-t border-gray-200">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-900">Overall Compliance Score</span>
                        <span class="text-sm text-gray-500">{{ $complianceScore }}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-primary h-2 rounded-full" style="width: {{ $complianceScore }}%"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Add Domain -->
                @if(Route::has('domains.create'))<button onclick="window.location.href='{{ route('domains.create') }}'" 
                        class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <i class="fas fa-plus mr-2"></i>
                    Add Domain
                </button>@endif

                <!-- Create Authorization -->
                @if(Route::has('authorizations.create'))<button onclick="window.location.href='{{ route('authorizations.create') }}'" 
                        class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <i class="fas fa-file-contract mr-2"></i>
                    Create Authorization
                </button>@endif

                <!-- Start Pentest -->
                @if(Route::has('pentests.create'))<button onclick="window.location.href='{{ route('pentests.create') }}'" 
                        class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <i class="fas fa-play mr-2"></i>
                    Start Pentest
                </button>@endif

                <!-- Generate Report -->
                @if(Route::has('reports.create'))<button onclick="window.location.href='{{ route('reports.create') }}'" 
                        class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <i class="fas fa-chart-bar mr-2"></i>
                    Generate Report
                </button>@endif
            </div>
        </div>
    </div>

    <!-- Legal Reminders -->
    <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <i class="fas fa-info-circle text-blue-400 text-xl"></i>
            </div>
            <div class="ml-3">
                <h3 class="text-sm font-medium text-blue-800">Important Legal Reminders</h3>
                <div class="mt-2 text-sm text-blue-700">
                    <ul class="list-disc list-inside space-y-1">
                        <li>Always ensure you have explicit written authorization before conducting any security testing</li>
                        <li>Verify your team and identity are verified before accessing testing features</li>
                        <li>Keep all authorization documents up to date and easily accessible</li>
                        <li>Report any suspicious activities or compliance concerns immediately</li>
                        <li>Regularly review and accept updated terms of service and policies</li>
                    </ul>
                </div>
                <div class="mt-4">
                    <a href="{{ route('legal.acceptable-use') }}" class="text-sm font-medium text-blue-800 hover:underline">
                        Review Acceptable Use Policy <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

@endsection
