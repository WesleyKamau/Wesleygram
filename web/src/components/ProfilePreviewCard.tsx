'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Profile, getImageUrl } from '@/lib/profiles';
import { selectProcessedKey } from '@/lib/images';
import { Checkmark } from './Checkmark';
import { useState } from 'react';

interface ProfilePreviewCardProps {
  profile: Profile;
}

export function ProfilePreviewCard({ profile }: ProfilePreviewCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const processedKey = selectProcessedKey(profile);
  const imageUrl = processedKey 
    ? getImageUrl(processedKey)
    : profile.profile_pic_url;

  const handleClick = () => {
    try {
      sessionStorage.setItem('from-search', '1');
    } catch (e) {
      // no-op if storage unavailable
    }
  };

  return (
    <Link
      href={`/${profile.instagram_id}`}
      onClick={handleClick}
      className="group flex flex-shrink-0 flex-col items-center gap-1 transition-transform hover:scale-105 w-40 tall-width no-underline"
    >
      <div className="relative h-40 w-40 tall-size overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
        <Image
          src={imageUrl}
          alt={profile.username}
          fill
          className={`object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          unoptimized={!!processedKey}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
      <div className="flex w-full flex-col items-center text-center gap-0.5">
        <div className="flex items-center justify-center gap-0.5 w-full px-1">
          <p className="truncate text-sm tall-text font-semibold text-foreground">@{profile.username}</p>
          {profile.is_verified && (
            <Checkmark size={14} className="flex-shrink-0 tall-icon" />
          )}
        </div>
        <p className="hidden md:block w-full truncate text-[11px] text-neutral-500 dark:text-neutral-400 sm:text-[10px]">{profile.full_name}</p>
      </div>
    </Link>
  );
}
