'use client';
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-yt-bg flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="text-gray-400 text-center max-w-md">{error.message || 'An unexpected error occurred'}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
