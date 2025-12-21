'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, Eye, AlertTriangle } from 'lucide-react';
import { Profile, getImageUrl } from '@/lib/profiles';

interface ProfileViewProps {
  profile: Profile;
}

export function ProfileView({ profile }: ProfileViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  const hasProcessed = !!profile.v1_image_r2_key;
  const displayOriginal = showOriginal || !hasProcessed;

  const imageUrl = displayOriginal
    ? profile.original_image_r2_key
      ? getImageUrl(profile.original_image_r2_key)
      : profile.profile_pic_url
    : getImageUrl(profile.v1_image_r2_key);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile.username}_${displayOriginal ? 'original' : 'processed'}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <Image
            src={profile.profile_pic_url}
            alt={profile.username}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-foreground">{profile.username}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{profile.full_name}</p>
        </div>
      </div>

      {!hasProcessed && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-4 text-yellow-600 dark:text-yellow-500">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm">
            This profile has not been processed yet. Showing original photo.
          </p>
        </div>
      )}

      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        <Image
          src={imageUrl}
          alt={profile.username}
          fill
          className="object-cover"
          unoptimized // R2 images might not be optimized by Next.js image optimization without config
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleDownload}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        {hasProcessed && (
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-200 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
          >
            <Eye className="h-4 w-4" />
            {showOriginal ? 'Show Processed' : 'Show Original'}
          </button>
        )}
      </div>

      <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
        <h3 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">Bio</h3>
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {profile.biography || 'No biography.'}
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
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
    </div>
  );
}
