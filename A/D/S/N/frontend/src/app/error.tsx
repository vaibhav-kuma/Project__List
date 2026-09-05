'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-6">
      <div className="max-w-md w-full">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => reset()}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
            <a
              href="/"
              className="w-full block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-center transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
        {process.env.NODE_ENV === 'development' && error.digest && (
          <div className="mt-4 p-3 bg-slate-800 rounded text-xs text-slate-400 font-mono break-all">
            Error ID: {error.digest}
          </div>
        )}
      </div>
    </div>
  )
}
