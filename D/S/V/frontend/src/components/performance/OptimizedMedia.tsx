'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAASABQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC4gAAf/9k=';

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  priority = false,
  quality = 85,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  loading,
  fallbackSrc,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const lazy = loading || (priority ? 'eager' : 'lazy');

  useEffect(() => {
    setImgSrc(src);
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    setHasError(true);
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
    onError?.();
  };

  const commonProps = {
    alt,
    className: `transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`,
    onLoad: () => {
      setIsLoaded(true);
      onLoad?.();
    },
    onError: handleError,
    quality,
    sizes,
    loading: lazy as any,
  };

  if (fill) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <Image
          ref={imgRef}
          src={imgSrc}
          fill
          placeholder={priority ? undefined : 'blur'}
          blurDataURL={BLUR_DATA_URL}
          {...commonProps}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden inline-block ${className}`}>
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      <Image
        ref={imgRef}
        src={imgSrc}
        width={width}
        height={height}
        placeholder={priority ? undefined : 'blur'}
        blurDataURL={BLUR_DATA_URL}
        {...commonProps}
      />
    </div>
  );
}

export function OptimizedVideo({
  src,
  poster,
  className = '',
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  playsInline = true,
  width,
  height,
  onCanPlay,
}: {
  src: string;
  poster?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  width?: number;
  height?: number;
  onCanPlay?: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && videoRef.current) {
            if (autoPlay && !muted) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
            observer.disconnect();
          }
        }
      },
      { rootMargin: '200px' }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, [autoPlay, muted]);

  return (
    <div className={`relative overflow-hidden bg-gray-900 ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
          {poster ? (
            <OptimizedImage
              src={poster}
              alt="Video poster"
              fill
              className="absolute inset-0"
              priority
            />
          ) : (
            <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        width={width}
        height={height}
        className={`w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onCanPlay={() => {
          setIsLoaded(true);
          onCanPlay?.();
        }}
        preload="none"
      />
    </div>
  );
}
