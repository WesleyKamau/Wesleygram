'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, Eye, AlertTriangle } from 'lucide-react';
import { Profile, getImageUrl } from '@/lib/profiles';
import { config } from '@/lib/config';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface ProfileViewProps {
  profile: Profile;
}

export function ProfileView({ profile }: ProfileViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [originalLoaded, setOriginalLoaded] = useState(false);
  const [processedLoaded, setProcessedLoaded] = useState(false);

  const hasProcessed = !!profile.v1_image_r2_key;
  const displayOriginal = showOriginal || !hasProcessed;

  const imageUrl = displayOriginal
    ? getImageUrl(profile.original_image_r2_key)
    : getImageUrl(profile.v1_image_r2_key);

  const currentImageLoaded = displayOriginal ? originalLoaded : processedLoaded;

  // Log which image is being displayed
  if (process.env.NODE_ENV !== 'production') {
    console.log('[ProfileView] Image display state:', {
      username: profile.username,
      hasProcessed,
      displayOriginal,
      showOriginal,
      imageSource: displayOriginal ? 'original_r2' : 'processed_r2',
      imageUrl: imageUrl.substring(0, 100), // Log first 100 chars to avoid sensitive data
      original_image_r2_key: profile.original_image_r2_key,
      v1_image_r2_key: profile.v1_image_r2_key,
    });
  }

  const handleDownload = async () => {
    try {
      const key = displayOriginal ? profile.original_image_r2_key : profile.v1_image_r2_key;
      
      if (!key) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[ProfileView] No image key available');
        }
        return;
      }
      
      const filename = `${profile.username}_${displayOriginal ? 'original' : 'wesleyified'}.png`;
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ProfileView] Starting download for:', {
          username: profile.username,
          displayOriginal,
          key,
          filename,
        });
      }
      
      // Detect if user is on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Check if Web Share API is available (iOS Safari, modern browsers) - only on mobile
      if (isMobile && navigator.share && navigator.canShare) {
        try {
          // Fetch the image as a blob
          const downloadUrl = `/api/download?key=${encodeURIComponent(key)}&filename=${encodeURIComponent(filename)}`;
          const response = await fetch(downloadUrl);
          
          if (!response.ok) {
            throw new Error('Failed to fetch image');
          }
          
          const blob = await response.blob();
          const file = new File([blob], filename, { type: 'image/png' });
          
          // Check if we can share this file
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `${profile.username} - ${displayOriginal ? 'Original' : 'Wesley-ified'}`,
              text: `Photo from Wesleygram`,
            });
            if (process.env.NODE_ENV !== 'production') {
              console.log('[ProfileView] Share completed successfully');
            }
            return;
          }
        } catch (shareError) {
          // If share fails or is cancelled, fall through to download
          if (process.env.NODE_ENV !== 'production') {
            console.log('[ProfileView] Share not available or cancelled, falling back to download');
          }
        }
      }
      
      // Fallback to regular download (desktop or if share not available)
      const downloadUrl = `/api/download?key=${encodeURIComponent(key)}&filename=${encodeURIComponent(filename)}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ProfileView] Download initiated successfully');
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[ProfileView] Download failed:', {
          error: error instanceof Error ? error.message : String(error),
          username: profile.username,
          displayOriginal,
        });
      }
    }
  };

  // Use R2 image for preview photo to avoid Instagram blocking
  const previewImageUrl = profile.original_image_r2_key 
    ? getImageUrl(profile.original_image_r2_key)
    : getImageUrl(profile.v1_image_r2_key);

  return (
    <div className="flex w-full max-w-md flex-col gap-2 sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="relative h-14 w-14 sm:h-20 sm:w-20 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          {!avatarLoaded && (
            <Skeleton
              circle
              height="100%"
              width="100%"
              baseColor="#d6d6d6"
              highlightColor="#e9e9e9"
            />
          )}
          <Image
            src={previewImageUrl}
            alt={profile.username}
            fill
            className={`object-cover ${avatarLoaded ? '' : 'invisible'}`}
            unoptimized
            onLoadingComplete={() => setAvatarLoaded(true)}
          />
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{profile.username}</h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{profile.full_name}</p>
        </div>
      </div>

      {!hasProcessed && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3 sm:p-4 text-yellow-600 dark:text-yellow-500 shrink-0">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          <p className="text-xs sm:text-sm">
            This profile has not been processed yet. Showing original photo.
          </p>
        </div>
      )}

      <div className="relative aspect-square w-full max-h-[50svh] sm:max-h-none overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        {!currentImageLoaded && (
          <div className="absolute inset-0">
            <Skeleton
              height="100%"
              width="100%"
              baseColor="#d6d6d6"
              highlightColor="#e9e9e9"
            />
          </div>
        )}
        {/* Stagger transitions to prevent darkening - incoming image fades in before outgoing fades out */}
        <Image
          src={getImageUrl(profile.original_image_r2_key)}
          alt={profile.username}
          fill
          className={`object-cover transition-all duration-500 ease-in-out ${
            displayOriginal 
              ? `opacity-100 scale-100 blur-0 z-10 delay-0 ${originalLoaded ? '' : 'invisible'}` 
              : 'opacity-0 scale-105 blur-md z-0 delay-150'
          }`}
          unoptimized
          priority
          onLoadingComplete={() => setOriginalLoaded(true)}
        />
        {hasProcessed && (
          <Image
            src={getImageUrl(profile.v1_image_r2_key)}
            alt={profile.username}
            fill
            className={`object-cover transition-all duration-500 ease-in-out ${
              !displayOriginal 
                ? `opacity-100 scale-100 blur-0 z-10 delay-0 ${processedLoaded ? '' : 'invisible'}` 
                : 'opacity-0 scale-105 blur-md z-0 delay-150'
            }`}
            unoptimized
            priority
            onLoadingComplete={() => setProcessedLoaded(true)}
          />
        )}
      </div>

      <div className="flex gap-4 sm:gap-5 shrink-0">
        <button
          onClick={handleDownload}
          className="flex flex-1 items-center justify-center gap-2.5 sm:gap-3 rounded-lg bg-blue-600 py-3.5 sm:py-4 text-base font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Download className="h-5 w-5" />
          Download
        </button>
        {hasProcessed && (
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex flex-1 items-center justify-center gap-2.5 sm:gap-3 rounded-lg bg-neutral-200 py-3.5 sm:py-4 text-base font-semibold text-foreground transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
          >
            <Eye className="h-5 w-5" />
            {showOriginal ? 'Show Wesley-ified' : 'Show Original'}
          </button>
        )}
      </div>

      <div className="rounded-lg bg-neutral-50 p-3.5 sm:p-4 dark:bg-neutral-900 shrink-0 overflow-visible">
        <h3 className="mb-1 sm:mb-2 text-sm sm:text-base font-semibold text-neutral-500 dark:text-neutral-400">Bio</h3>
        <p className="whitespace-pre-wrap text-sm sm:text-base text-foreground leading-relaxed">
          {profile.biography || 'No biography.'}
        </p>
      </div>
      
      {config.features.showProfileStats && (
        <div className="hidden sm:grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-bold text-foreground">{profile.post_count}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Posts</div>
          </div>
          <div>
            <div className="font-bold text-foreground">{profile.follower_count}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Followers</div>
          </div>
          <div>
            <div className="font-bold text-foreground">{profile.following_count}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Following</div>
          </div>
        </div>
      )}
    </div>
  );
}
