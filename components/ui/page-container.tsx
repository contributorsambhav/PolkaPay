'use client';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function PageContainer({ children, title, description, className = '' }: PageContainerProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          )}
          {description && (
            <p className="text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
