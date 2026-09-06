import type { MetadataRoute } from "next";
import { featuredProjects } from "@/lib/data/featured-projects";
import { profile } from "@/lib/data/profile";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: profile.siteUrl,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...featuredProjects.map((p) => ({
      url: `${profile.siteUrl}/projects/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
