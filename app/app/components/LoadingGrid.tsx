import { LoadingCard } from './LoadingCard';

interface LoadingGridProps {
  count?: number;
  className?: string;
}

export function LoadingGrid({ count = 12, className = '' }: LoadingGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 px-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}