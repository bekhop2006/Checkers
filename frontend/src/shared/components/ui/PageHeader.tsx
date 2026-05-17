import { cn } from "@/shared/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  centered?: boolean;
}

/** Page title block with optional subtitle. */
export function PageHeader({
  title,
  subtitle,
  className,
  centered = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8 sm:mb-10 animate-slide-up",
        centered && "text-center",
        className
      )}
    >
      <h1 className="section-title">{title}</h1>
      {subtitle ? (
        <p className={cn("section-subtitle mt-2", centered && "mx-auto")}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
