<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name') }} - Professional Security Testing Platform</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-gray-900">{{ config('app.name') }}</h1>
                    </div>
                    <nav class="flex space-x-4">
                        <a href="/dashboard" class="text-gray-600 hover:text-gray-900">Dashboard</a>
                        <a href="/legal/terms" class="text-gray-600 hover:text-gray-900">Legal</a>
                    </nav>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="flex-grow">
            <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <!-- Hero Section -->
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">
                        Professional Security Testing Platform
                    </h1>
                    <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                        Enterprise-grade security testing with comprehensive legal compliance, 
                        evidence preservation, and professional reporting.
                    </p>
                </div>

                <!-- Status Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h3 class="ml-3 text-lg font-semibold text-gray-900">Database</h3>
                        </div>
                        <p class="text-gray-600">All 12 tables created successfully</p>
                    </div>

                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h3 class="ml-3 text-lg font-semibold text-gray-900">Framework</h3>
                        </div>
                        <p class="text-gray-600">Laravel 11.48.0 with PHP 8.5.1</p>
                    </div>

                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h3 class="ml-3 text-lg font-semibold text-gray-900">Security</h3>
                        </div>
                        <p class="text-gray-600">All 18 PHP extensions installed</p>
                    </div>
                </div>

                <!-- Features Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">🔐 Legal Compliance</h3>
                        <p class="text-gray-600">GDPR, PCI-DSS, HIPAA, ISO27001 compliance frameworks</p>
                    </div>

                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">🛡️ Authorization Management</h3>
                        <p class="text-gray-600">Mandatory legal authorization before security testing</p>
                    </div>

                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">🔍 OSINT Collection</h3>
                        <p class="text-gray-600">Legal open-source intelligence from 10+ sources</p>
                    </div>

                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">📊 Evidence Integrity</h3>
                        <p class="text-gray-600">SHA-256 + RFC 3161 timestamping for legal evidence</p>
                    </div>

                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">🎯 Professional Reporting</h3>
                        <p class="text-gray-600">10 enterprise report templates with multi-framework support</p>
                    </div>

                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">🌐 Threat Intelligence</h3>
                        <p class="text-gray-600">Integration with 10+ security ecosystem platforms</p>
                    </div>
                </div>

                <!-- Call to Action -->
                <div class="mt-12 text-center">
                    <a href="/dashboard" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Go to Dashboard
                    </a>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="bg-white border-t border-gray-200">
            <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div class="text-center text-gray-500">
                    <p>&copy; {{ date('Y') }} {{ config('app.name') }}. Professional security testing platform.</p>
                    <p class="mt-2">
                        <a href="/legal/terms" class="text-blue-600 hover:text-blue-800">Terms of Service</a> |
                        <a href="/legal/privacy" class="text-blue-600 hover:text-blue-800">Privacy Policy</a> |
                        <a href="/legal/acceptable-use" class="text-blue-600 hover:text-blue-800">Acceptable Use</a>
                    </p>
                </div>
            </div>
        </footer>
    </div>
</body>
</html>
