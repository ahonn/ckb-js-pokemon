import { LoadingCard } from './LoadingCard';

interface LoadingGridProps {
  count?: number;
  className?: string;
}

export function LoadingGrid({ count = 12, className = '' }: LoadingGridProps) {
  // Extract gap class if provided in className, otherwise use default
  const gapMatch = className.match(/gap-\d+/);
  const gapClass = gapMatch ? gapMatch[0] : 'gap-6';
  
  // Check if we should include px-4 (default true unless explicitly disabled)
  const noPadding = className.includes('no-padding');
  const paddingClass = noPadding ? '' : 'px-4';
  
  const remainingClasses = className.replace(/gap-\d+/, '').replace('no-padding', '').trim();
  
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${gapClass} ${paddingClass} ${remainingClasses}`}>
      {Array.from({ length: count }, (_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}