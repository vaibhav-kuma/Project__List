import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { featuredProjects, getFeaturedProject } from "@/lib/data/featured-projects";
import { CaseStudy } from "@/components/project/CaseStudy";
import { profile } from "@/lib/data/profile";

export function generateStaticParams() {
  return featuredProjects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getFeaturedProject(slug);
  if (!project) return { title: "Project not found" };
  const title = `${project.name} — Case Study`;
  const description = `${project.tagline}. Engineering case study from the portfolio of Vaibhav Kumar: problem, architecture, stack, and verifiable capabilities.`;
  return {
    title,
    description,
    alternates: { canonical: `${profile.siteUrl}/projects/${project.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${profile.siteUrl}/projects/${project.slug}`,
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getFeaturedProject(slug);
  if (!project) notFound();
  return <CaseStudy project={project} />;
}
