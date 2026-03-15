'use client';

export function LoadingScreen() {
  return (
    <div className="flex min-h-svh min-w-0 items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-muted-foreground">Connecting...</p>
      </div>
    </div>
  );
}
