import { cn } from "@/lib/utils/cn";

export function TechTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("tech-chip", className)}>{children}</span>;
}
