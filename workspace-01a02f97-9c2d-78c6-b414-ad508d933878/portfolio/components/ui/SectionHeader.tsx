import { cn } from "@/lib/utils/cn";

interface SectionHeaderProps {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-10 md:mb-14", align === "center" && "text-center", className)}>
      <p className="eyebrow mb-3">
        <span className="text-slate-500">{index} /</span> {eyebrow}
      </p>
      <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className={cn("mt-4 max-w-2xl text-sm leading-relaxed text-dim md:text-base", align === "center" && "mx-auto")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
