interface LoadingCardProps {
  className?: string;
}

export function LoadingCard({ className = '' }: LoadingCardProps) {
  return (
    <div
      className={`bg-white/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 min-w-[280px] flex flex-col p-4 ${className}`}
    >
      {/* Header: Pokemon Number centered */}
      <div className="text-center mb-2">
        <div className="bg-gray-300/50 backdrop-blur-sm rounded-full w-12 h-6 mx-auto animate-pulse"></div>
      </div>

      {/* Pokemon Image - centered */}
      <div className="flex items-center justify-center h-36 mb-3">
        <div className="bg-gray-200/50 backdrop-blur-sm rounded-lg w-24 h-24 animate-pulse"></div>
      </div>

      {/* Pokemon Name - centered */}
      <div className="text-center mb-3">
        <div className="bg-gray-300/50 backdrop-blur-sm rounded w-24 h-6 mx-auto animate-pulse"></div>
      </div>

      {/* Pokemon Types - centered */}
      <div className="flex gap-1 mb-4 justify-center">
        <div className="bg-gray-300/50 backdrop-blur-sm rounded-full w-16 h-6 animate-pulse"></div>
        <div className="bg-gray-300/50 backdrop-blur-sm rounded-full w-16 h-6 animate-pulse"></div>
      </div>

      {/* Purchase Section */}
      <div className="flex items-center justify-between bg-white/30 backdrop-blur-sm rounded-lg p-3 border border-white/20">
        <div className="text-left">
          <div className="bg-gray-300/50 backdrop-blur-sm rounded w-8 h-3 mb-1 animate-pulse"></div>
          <div className="bg-gray-300/50 backdrop-blur-sm rounded w-12 h-5 animate-pulse"></div>
        </div>
        <div className="bg-gray-300/50 backdrop-blur-sm rounded-lg w-20 h-8 animate-pulse"></div>
      </div>
    </div>
  );
}