"use client";

interface LoadingProps {
  loadMsg?: string;
}

export function Loading(props: LoadingProps) {
  const { loadMsg = "Loading" } = props;
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <p className="text-sm text-muted-foreground">{loadMsg}...</p>
    </div>
  );
}
