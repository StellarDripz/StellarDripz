"use client";

import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { SkeletonCard } from "./Skeleton";

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, info: { componentStack: string }) => void;
}

/**
 * Combines ErrorBoundary + Suspense for a complete async-safe component wrapper.
 * Shows skeleton loading state during Suspense and error fallback on error.
 */
export function AsyncBoundary({ children, fallback, errorFallback, onError }: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={errorFallback} onError={onError}>
      <Suspense fallback={fallback || <SkeletonCard />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

/** AsyncBoundary with a custom loading skeleton */
export function AsyncCard({
  children,
  errorFallback,
}: {
  children: ReactNode;
  errorFallback?: ReactNode;
}) {
  return (
    <AsyncBoundary fallback={<SkeletonCard />} errorFallback={errorFallback}>
      {children}
    </AsyncBoundary>
  );
}
