import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
);

export const SkeletonLine: React.FC<{ width?: string; height?: string }> = ({ 
  width = 'w-full', 
  height = 'h-4' 
}) => (
  <div className={`${height} ${width} bg-gray-200 rounded animate-pulse`}></div>
);

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`${sizeClasses[size]} bg-gray-200 rounded-full animate-pulse`}></div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 p-3 border-b">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div 
            key={colIndex} 
            className="h-4 bg-gray-200 rounded animate-pulse flex-1"
            style={{ 
              width: colIndex === 0 ? '120px' : colIndex === columns - 1 ? '60px' : '100%' 
            }}
          ></div>
        ))}
      </div>
    ))}
  </div>
);
