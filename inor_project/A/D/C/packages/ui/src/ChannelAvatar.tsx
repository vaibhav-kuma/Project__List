'use client';
import { cn } from '@yt/shared';
import { Verified, Circle } from 'lucide-react';

interface ChannelAvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isVerified?: boolean;
  isLive?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-20 w-20 text-3xl',
};

const verifiedSizeMap = { xs: 10, sm: 12, md: 14, lg: 16, xl: 22 };

export function ChannelAvatar({
  src,
  alt = '',
  size = 'md',
  isVerified,
  isLive,
  className,
}: ChannelAvatarProps) {
  const initials = alt
    ? alt.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn('rounded-full object-cover', sizeMap[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-[#272727] flex items-center justify-center text-gray-400 font-medium',
            sizeMap[size],
          )}
        >
          {initials}
        </div>
      )}
      {isVerified && (
        <Verified
          className="absolute -bottom-0.5 -right-0.5 text-blue-500 fill-blue-500"
          size={verifiedSizeMap[size]}
        />
      )}
      {isLive && (
        <Circle
          className="absolute -bottom-0.5 -right-0.5 text-red-600 fill-red-600"
          size={verifiedSizeMap[size] * 0.6}
        />
      )}
    </div>
  );
}
