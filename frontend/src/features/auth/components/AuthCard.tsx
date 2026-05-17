interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Centered card wrapper for auth pages. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md mx-auto animate-slide-up px-1 sm:px-0">
      <div className="glass-card p-6 sm:p-8 md:p-10 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-stone-900 dark:text-stone-50">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-stone-600 dark:text-stone-400 text-sm mb-6 sm:mb-8">{subtitle}</p>
        ) : (
          <div className="mb-6 sm:mb-8" />
        )}
        {children}
      </div>
      {footer ? (
        <div className="mt-6 text-center text-sm text-stone-600 dark:text-stone-400">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
