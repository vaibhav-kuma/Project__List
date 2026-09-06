<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', config('app.name')) - Professional Security Testing Platform</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="{{ asset('favicon.ico') }}">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Custom Configuration -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'primary': '#1e40af',
                        'secondary': '#7c3aed',
                        'danger': '#dc2626',
                        'warning': '#d97706',
                        'success': '#059669',
                    }
                }
            }
        }
    </script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    
    @stack('styles')
</head>
<body class="bg-gray-50">
    <!-- Legal Notice Banner -->
    @if (!request()->is('legal/*') && !request()->is('auth/*'))
        <div x-data="{ show: true }" x-show="show" x-transition class="bg-red-600 text-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between py-3">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        <span class="text-sm font-medium">
                            <strong>LEGAL NOTICE:</strong> Unauthorized security testing is illegal. All activities require explicit written authorization.
                        </span>
                    </div>
                    <button @click="show = false" class="text-white hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    @endif

    <!-- Navigation -->
    @auth
        <nav class="bg-white shadow-lg border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <!-- Logo -->
                    <div class="flex items-center">
                        <a href="{{ route('dashboard') }}" class="flex items-center">
                            <i class="fas fa-shield-alt text-primary text-2xl mr-2"></i>
                            <span class="text-xl font-bold text-gray-900">{{ config('app.name') }}</span>
                        </a>
                    </div>

                    <!-- Desktop Navigation -->
                    <div class="hidden md:flex items-center space-x-4">
                        <!-- Dashboard -->
                        <a href="{{ route('dashboard') }}" class="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                            <i class="fas fa-tachometer-alt mr-1"></i> Dashboard
                        </a>

                        <!-- Domains -->
                        <div x-data="{ open: false }" class="relative">
                            <button @click="open = !open" class="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                                <i class="fas fa-globe mr-1"></i> Domains
                                <i class="fas fa-chevron-down ml-1 text-xs"></i>
                            </button>
                            <div x-show="open" @click.away="open = false" x-transition class="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                                @if(Route::has('domains.index'))
                                <a href="{{ route('domains.index') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-list mr-2"></i> All Domains
                                </a>
                                @endif
                                @if(Route::has('domains.create'))
                                <a href="{{ route('domains.create') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-plus mr-2"></i> Add Domain
                                </a>
                                @endif
                                @if(Route::has('domains.verifications'))
                                <a href="{{ route('domains.verifications') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-check-circle mr-2"></i> Verifications
                                </a>
                                @endif
                            </div>
                        </div>

                        <!-- Authorizations -->
                        <div x-data="{ open: false }" class="relative">
                            <button @click="open = !open" class="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                                <i class="fas fa-file-contract mr-1"></i> Authorizations
                                <i class="fas fa-chevron-down ml-1 text-xs"></i>
                            </button>
                            <div x-show="open" @click.away="open = false" x-transition class="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                                @if(Route::has('authorizations.index'))
                                <a href="{{ route('authorizations.index') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-list mr-2"></i> All Authorizations
                                </a>
                                @endif
                                @if(Route::has('authorizations.create'))
                                <a href="{{ route('authorizations.create') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-plus mr-2"></i> New Authorization
                                </a>
                                @endif
                            </div>
                        </div>

                        <!-- Pentesting -->
                        <div x-data="{ open: false }" class="relative">
                            <button @click="open = !open" class="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                                <i class="fas fa-bug mr-1"></i> Pentesting
                                <i class="fas fa-chevron-down ml-1 text-xs"></i>
                            </button>
                            <div x-show="open" @click.away="open = false" x-transition class="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                                @if(Route::has('pentests.index'))
                                <a href="{{ route('pentests.index') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-list mr-2"></i> Pentest Projects
                                </a>
                                @endif
                                @if(Route::has('pentests.create'))
                                <a href="{{ route('pentests.create') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-plus mr-2"></i> New Project
                                </a>
                                @endif
                                @if(Route::has('findings.index'))
                                <a href="{{ route('findings.index') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-exclamation-triangle mr-2"></i> Findings
                                </a>
                                @endif
                            </div>
                        </div>

                        <!-- OSINT -->
                        <div x-data="{ open: false }" class="relative">
                            <button @click="open = !open" class="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                                <i class="fas fa-search mr-1"></i> OSINT
                                <i class="fas fa-chevron-down ml-1 text-xs"></i>
                            </button>
                            <div x-show="open" @click.away="open = false" x-transition class="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                                @if(Route::has('leaks.index'))
                                <a href="{{ route('leaks.index') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-database mr-2"></i> Leaks
                                </a>
                                @endif
                                @if(Route::has('osint.collect'))
                                <a href="{{ route('osint.collect') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-download mr-2"></i> Collect OSINT
                                </a>
                                @endif
                            </div>
                        </div>

                        <!-- Reports -->
                        <div x-data="{ open: false }" class="relative">
                            <button @click="open = !open" class="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                                <i class="fas fa-chart-bar mr-1"></i> Reports
                                <i class="fas fa-chevron-down ml-1 text-xs"></i>
                            </button>
                            <div x-show="open" @click.away="open = false" x-transition class="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                                @if(Route::has('reports.index'))
                                <a href="{{ route('reports.index') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-file-alt mr-2"></i> All Reports
                                </a>
                                @endif
                                @if(Route::has('reports.create'))
                                <a href="{{ route('reports.create') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-plus mr-2"></i> Generate Report
                                </a>
                                @endif
                            </div>
                        </div>
                    </div>

                    <!-- Right side items -->
                    <div class="flex items-center space-x-4">
                        <!-- Notifications -->
                        <div x-data="{ open: false }" class="relative">
                            <button @click="open = !open" class="text-gray-700 hover:text-primary p-2">
                                <i class="fas fa-bell"></i>
                                @if(auth()->user()->unreadNotifications->count() > 0)
                                    <span class="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {{ auth()->user()->unreadNotifications->count() }}
                                    </span>
                                @endif
                            </button>
                        </div>

                        <!-- User Menu -->
                        <div x-data="{ open: false }" class="relative">
                            <button @click="open = !open" class="flex items-center text-gray-700 hover:text-primary">
                                <img src="{{ auth()->user()->avatar_url ?? asset('images/default-avatar.png') }}" 
                                     alt="Avatar" class="h-8 w-8 rounded-full mr-2">
                                <span class="text-sm font-medium">{{ auth()->user()->full_name }}</span>
                                <i class="fas fa-chevron-down ml-1 text-xs"></i>
                            </button>
                            <div x-show="open" @click.away="open = false" x-transition class="absolute z-10 right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                                @if(Route::has('profile'))
                                <a href="{{ route('profile') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-user mr-2"></i> Profile
                                </a>
                                @endif
                                @if(Route::has('settings'))
                                <a href="{{ route('settings') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-cog mr-2"></i> Settings
                                </a>
                                @endif
                                <div class="border-t border-gray-100"></div>
                                <a href="{{ route('legal.terms') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-file-contract mr-2"></i> Terms of Service
                                </a>
                                <a href="{{ route('legal.privacy') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-shield-alt mr-2"></i> Privacy Policy
                                </a>
                                <a href="{{ route('legal.acceptable-use') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="fas fa-gavel mr-2"></i> Acceptable Use
                                </a>
                                <div class="border-t border-gray-100"></div>
                                @if(Route::has('logout'))
                                <form method="POST" action="{{ route('logout') }}">
                                    @csrf
                                    <button type="submit" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        <i class="fas fa-sign-out-alt mr-2"></i> Logout
                                    </button>
                                </form>
                                @endif
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    @endif

    <!-- Main Content -->
    <main class="py-6">
        @yield('content')
    </main>

    <!-- Legal Footer -->
    <footer class="bg-gray-800 text-white mt-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- Company Info -->
                <div>
                    <div class="flex items-center mb-4">
                        <i class="fas fa-shield-alt text-primary text-2xl mr-2"></i>
                        <span class="text-xl font-bold">{{ config('app.name') }}</span>
                    </div>
                    <p class="text-gray-300 text-sm">
                        Professional security testing platform with enterprise-grade compliance and legal protection.
                    </p>
                </div>

                <!-- Legal Links -->
                <div>
                    <h3 class="text-lg font-semibold mb-4">Legal</h3>
                    <ul class="space-y-2">
                        <li><a href="{{ route('legal.terms') }}" class="text-gray-300 hover:text-white text-sm">Terms of Service</a></li>
                        <li><a href="{{ route('legal.privacy') }}" class="text-gray-300 hover:text-white text-sm">Privacy Policy</a></li>
                        <li><a href="{{ route('legal.acceptable-use') }}" class="text-gray-300 hover:text-white text-sm">Acceptable Use</a></li>
                        @if(Route::has('legal.compliance'))<li><a href="{{ route('legal.compliance') }}" class="text-gray-300 hover:text-white text-sm">Compliance</a></li>@endif
                    </ul>
                </div>

                <!-- Security -->
                <div>
                    <h3 class="text-lg font-semibold mb-4">Security</h3>
                    <ul class="space-y-2">
                        @if(Route::has('security.features'))<li><a href="{{ route('security.features') }}" class="text-gray-300 hover:text-white text-sm">Security Features</a></li>@endif
                        @if(Route::has('security.compliance'))<li><a href="{{ route('security.compliance') }}" class="text-gray-300 hover:text-white text-sm">Compliance</a></li>@endif
                        @if(Route::has('security.audit'))<li><a href="{{ route('security.audit') }}" class="text-gray-300 hover:text-white text-sm">Audit Reports</a></li>@endif
                        @if(Route::has('security.responsible'))<li><a href="{{ route('security.responsible') }}" class="text-gray-300 hover:text-white text-sm">Responsible Disclosure</a></li>@endif
                    </ul>
                </div>

                <!-- Support -->
                <div>
                    <h3 class="text-lg font-semibold mb-4">Support</h3>
                    <ul class="space-y-2">
                        @if(Route::has('help.docs'))<li><a href="{{ route('help.docs') }}" class="text-gray-300 hover:text-white text-sm">Documentation</a></li>@endif
                        @if(Route::has('help.contact'))<li><a href="{{ route('help.contact') }}" class="text-gray-300 hover:text-white text-sm">Contact Support</a></li>@endif
                        @if(Route::has('help.training'))<li><a href="{{ route('help.training') }}" class="text-gray-300 hover:text-white text-sm">Training</a></li>@endif
                        @if(Route::has('help.status'))<li><a href="{{ route('help.status') }}" class="text-gray-300 hover:text-white text-sm">System Status</a></li>@endif
                    </ul>
                </div>
            </div>

            <!-- Bottom Bar -->
            <div class="border-t border-gray-700 mt-8 pt-8">
                <div class="flex flex-col md:flex-row justify-between items-center">
                    <div class="text-sm text-gray-300">
                        &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
                    </div>
                    <div class="flex items-center space-x-4 mt-4 md:mt-0">
                        <span class="text-sm text-gray-300">
                            <i class="fas fa-shield-alt mr-1"></i>
                            SOC 2 Type II Certified
                        </span>
                        <span class="text-sm text-gray-300">
                            <i class="fas fa-lock mr-1"></i>
                            AES-256 Encrypted
                        </span>
                        <span class="text-sm text-gray-300">
                            <i class="fas fa-check-circle mr-1"></i>
                            GDPR Compliant
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </footer>

    <!-- Legal Disclaimer Modal (shown on first visit) -->
    <div x-data="{ show: !localStorage.getItem('legal-accepted') }" 
         x-show="show" 
         x-transition
         class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
         style="display: none;">
        <div class="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div class="p-6">
                <div class="flex items-center mb-4">
                    <i class="fas fa-exclamation-triangle text-danger text-2xl mr-3"></i>
                    <h2 class="text-2xl font-bold text-gray-900">Important Legal Notice</h2>
                </div>
                
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h3 class="font-semibold text-red-800 mb-2">⚠️ CRITICAL WARNING</h3>
                    <p class="text-red-700 text-sm">
                        Unauthorized security testing is illegal under federal and state laws, including the Computer Fraud and Abuse Act (CFAA). 
                        Violations may result in criminal prosecution, civil liability, and permanent account termination.
                    </p>
                </div>

                <div class="space-y-4 mb-6">
                    <div>
                        <h4 class="font-semibold text-gray-900 mb-2">Before using SecureScout Pro, you MUST:</h4>
                        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
                            <li>Have explicit written authorization from target organizations</li>
                            <li>Verify all testing is within authorized scope</li>
                            <li>Comply with all applicable laws and regulations</li>
                            <li>Maintain proper documentation of all authorizations</li>
                            <li>Follow our Acceptable Use Policy at all times</li>
                        </ul>
                    </div>

                    <div>
                        <h4 class="font-semibold text-gray-900 mb-2">Prohibited Activities:</h4>
                        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
                            <li>Any testing without explicit permission</li>
                            <li>Denial of Service attacks</li>
                            <li>Social engineering or phishing</li>
                            <li>Exploitation without authorization</li>
                            <li>Data theft or destruction</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-lg p-4 mb-6">
                    <p class="text-sm text-gray-600">
                        By clicking "Accept", you acknowledge that you have read, understood, and agree to comply with our 
                        <a href="{{ route('legal.terms') }}" class="text-primary hover:underline">Terms of Service</a>, 
                        <a href="{{ route('legal.privacy') }}" class="text-primary hover:underline">Privacy Policy</a>, and 
                        <a href="{{ route('legal.acceptable-use') }}" class="text-primary hover:underline">Acceptable Use Policy</a>. 
                        You confirm that you will only use this platform for authorized security testing activities.
                    </p>
                </div>

                <div class="flex justify-end space-x-4">
                    @if(Route::has('logout'))<button onclick="window.location.href='{{ route('logout') }}'" 
                            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                        Decline
                    </button>@endif
                    <button @click="localStorage.setItem('legal-accepted', 'true'); show = false" 
                            class="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700">
                        I Accept - Continue
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    @stack('scripts')
    
    <!-- Flash Messages -->
    @if(session()->has('success') || session()->has('error') || session()->has('warning') || session()->has('info'))
        <div x-data="{ show: true }" x-show="show" x-transition class="fixed top-4 right-4 z-50 space-y-2">
            @if(session()->has('success'))
                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg">
                    <div class="flex items-center">
                        <i class="fas fa-check-circle mr-2"></i>
                        <span>{{ session('success') }}</span>
                        <button @click="show = false" class="ml-4 text-green-500 hover:text-green-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            @endif
            
            @if(session()->has('error'))
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        <span>{{ session('error') }}</span>
                        <button @click="show = false" class="ml-4 text-red-500 hover:text-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            @endif
            
            @if(session()->has('warning'))
                <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg shadow-lg">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        <span>{{ session('warning') }}</span>
                        <button @click="show = false" class="ml-4 text-yellow-500 hover:text-yellow-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            @endif
            
            @if(session()->has('info'))
                <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg shadow-lg">
                    <div class="flex items-center">
                        <i class="fas fa-info-circle mr-2"></i>
                        <span>{{ session('info') }}</span>
                        <button @click="show = false" class="ml-4 text-blue-500 hover:text-blue-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            @endif
        </div>
    @endif
</body>
</html>
