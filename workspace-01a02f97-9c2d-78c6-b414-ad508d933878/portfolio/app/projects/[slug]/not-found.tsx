import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div className="section-shell flex min-h-screen flex-col items-center justify-center py-32 text-center">
      <p className="eyebrow">404 · signal lost</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-white">
        Project not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-dim">
        This case study doesn&apos;t exist in the lab. Return to the project universe.
      </p>
      <Link href="/#projects" className="btn-primary mt-8">
        Back to Projects
      </Link>
    </div>
  );
}
