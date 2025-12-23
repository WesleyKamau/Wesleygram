'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Eye, AlertTriangle, Star, EyeOff } from 'lucide-react';
import { Profile, getImageUrl } from '@/lib/profiles';
import { selectProcessedKey } from '@/lib/images';
import { Checkmark } from './Checkmark';
import { config } from '@/lib/config';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const isDev = process.env.NODE_ENV !== 'production';

interface ProfileViewProps {
  profile: Profile;
}

export function ProfileView({ profile }: ProfileViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [originalLoaded, setOriginalLoaded] = useState(false);
  const [processedLoaded, setProcessedLoaded] = useState(false);
  const [isFeatured, setIsFeatured] = useState(profile.featured || false);
  const [isHidden, setIsHidden] = useState(profile.hidden || false);
  const [metadataUpdating, setMetadataUpdating] = useState(false);

  // Update state when profile changes (e.g., navigation)
  useEffect(() => {
    setIsFeatured(profile.featured || false);
    setIsHidden(profile.hidden || false);
    
    if (isDev) {
      console.log('[ProfileView] Loaded profile metadata:', {
        instagram_id: profile.instagram_id,
        username: profile.username,
        featured: profile.featured,
        hidden: profile.hidden,
      });
    }
  }, [profile.instagram_id, profile.featured, profile.hidden]);

  const processedKey = selectProcessedKey(profile);
  const hasProcessed = !!processedKey;
  const displayOriginal = showOriginal || !hasProcessed;
  const imageUrl = displayOriginal
    ? getImageUrl(profile.original_image_r2_key)
    : getImageUrl(processedKey);

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
      v2_image_r2_key: profile.v2_image_r2_key,
    });
  }

  const handleDownload = async () => {
    try {
      const key = displayOriginal ? profile.original_image_r2_key : processedKey;
      
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

  const handleMetadataUpdate = async (field: 'featured' | 'hidden', value: boolean) => {
    if (!isDev) return;
    
    setMetadataUpdating(true);
    try {
      const response = await fetch('/api/profile/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagram_id: profile.instagram_id,
          field,
          value,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update metadata');
      }

      const result = await response.json();
      
      if (field === 'featured') {
        setIsFeatured(value);
      } else {
        setIsHidden(value);
      }

      console.log('[ProfileView] Metadata updated:', result);
      alert(`Successfully ${value ? 'set' : 'removed'} ${field} flag. Refresh the homepage to see changes.`);
    } catch (error) {
      console.error('[ProfileView] Failed to update metadata:', error);
      alert('Failed to update metadata. Check console for details.');
    } finally {
      setMetadataUpdating(false);
    }
  };

  // Use R2 image for preview photo to avoid Instagram blocking
  const previewImageUrl = profile.original_image_r2_key
    ? getImageUrl(profile.original_image_r2_key)
    : (processedKey ? getImageUrl(processedKey) : profile.profile_pic_url);

  const instagramUrl = `https://www.instagram.com/${profile.username}`;

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex items-center gap-4 shrink-0">
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative h-20 w-20 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 cursor-pointer transition-transform active:scale-95 lg:hover:scale-105"
        >
          {!avatarLoaded && (
            <Skeleton
              height="100%"
              width="100%"
              baseColor="#d6d6d6"
              highlightColor="#e9e9e9"
              containerClassName="absolute inset-0 block h-full w-full leading-none"
              className="block h-full w-full"
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
        </a>
        <div className="flex flex-col min-w-0 flex-1">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-col w-fit py-1 px-2 -ml-2 rounded-lg active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors cursor-pointer no-underline"
          >
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground flex-wrap">
              <span className="break-all">{profile.username}</span>
              {profile.is_verified && (
                <Checkmark size={20} className="shrink-0" />
              )}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 break-words">{profile.full_name}</p>
          </a>
        </div>
      </div>

      {!hasProcessed && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-4 text-yellow-600 dark:text-yellow-500 shrink-0">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm">
            This profile has not been processed yet. Showing original photo.
          </p>
        </div>
      )}

      <div className="relative aspect-square w-full max-h-[50svh] sm:max-h-none overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        {!currentImageLoaded && (
          <Skeleton
            height="100%"
            width="100%"
            baseColor="#d6d6d6"
            highlightColor="#e9e9e9"
            containerClassName="absolute inset-0 block h-full w-full leading-none"
            className="block h-full w-full"
          />
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
            src={getImageUrl(processedKey)}
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

      <div className="flex gap-4 shrink-0">
        <button
          onClick={handleDownload}
          className="flex flex-1 items-center justify-center gap-3 rounded-lg bg-blue-600 py-4 text-base font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Download className="h-5 w-5" />
          Download
        </button>
        {hasProcessed && (
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex flex-1 items-center justify-center gap-3 rounded-lg bg-neutral-200 py-4 text-base font-semibold text-foreground transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
          >
            <Eye className="h-5 w-5" />
            {showOriginal ? 'Show Wesley-ified' : 'Show Original'}
          </button>
        )}
      </div>

      {profile.instagram_id === '290944620' && (
        <a
          href="https://wesleykamau.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-neutral-200 py-4 text-base font-semibold text-foreground transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
        >
          Visit Website
        </a>
      )}

      <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900 shrink-0 overflow-visible">
        <h3 className="mb-2 text-base font-semibold text-neutral-500 dark:text-neutral-400">Bio</h3>
        <p className="whitespace-pre-wrap text-base text-foreground leading-relaxed">
          {profile.biography || 'No biography.'}
        </p>
      </div>

      {isDev && (
        <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-4 shrink-0 border-2 border-purple-500">
          <h3 className="mb-3 text-base font-semibold text-purple-700 dark:text-purple-300">
            Dev Tools (Hidden in Production)
          </h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleMetadataUpdate('featured', !isFeatured)}
              disabled={metadataUpdating}
              className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors ${
                isFeatured
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : 'bg-neutral-200 text-foreground hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Star className={`h-4 w-4 ${isFeatured ? 'fill-current' : ''}`} />
              {isFeatured ? 'Remove Featured' : 'Mark as Featured'}
            </button>
            <button
              onClick={() => handleMetadataUpdate('hidden', !isHidden)}
              disabled={metadataUpdating}
              className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors ${
                isHidden
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-neutral-200 text-foreground hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <EyeOff className="h-4 w-4" />
              {isHidden ? 'Unhide Profile' : 'Hide Profile'}
            </button>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Featured: Show on homepage. Hidden: Exclude from homepage. Changes require homepage refresh.
            </p>
          </div>
        </div>
      )}
      
      {config.features.showProfileStats && (
        <div className="hidden sm:grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-bold text-foreground">{profile.post_count.toLocaleString()}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Posts</div>
          </div>
          <div>
            <div className="font-bold text-foreground">{profile.follower_count.toLocaleString()}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Followers</div>
          </div>
          <div>
            <div className="font-bold text-foreground">{profile.following_count.toLocaleString()}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Following</div>
          </div>
        </div>
      )}
    </div>
  );
}
