import Link from 'next/link';
import { Youtube } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-yt-bg flex flex-col items-center justify-center gap-4 px-4">
      <Youtube size={48} className="text-red-600" />
      <h1 className="text-4xl font-bold text-white">404</h1>
      <p className="text-gray-400 text-center max-w-md">
        This page isn&apos;t available. The link may be broken or the page may have been removed.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
