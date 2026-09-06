import Link from "next/link";

export default function NotFound() {
  return (
    <div className="section-shell flex min-h-screen flex-col items-center justify-center py-32 text-center">
      <p className="eyebrow">404 · route not found</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-white">
        This node doesn&apos;t exist
      </h1>
      <p className="mt-3 max-w-md text-sm text-dim">
        The page you&apos;re looking for isn&apos;t part of the lab. Head back to the core.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Return home
      </Link>
    </div>
  );
}
