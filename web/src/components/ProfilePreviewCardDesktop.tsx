'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Profile, getImageUrl } from '@/lib/profiles';
import { selectProcessedKey } from '@/lib/images';
import { Checkmark } from './Checkmark';
import { useState, useRef } from 'react';

interface ProfilePreviewCardDesktopProps {
  profile: Profile;
}

export function ProfilePreviewCardDesktop({ profile }: ProfilePreviewCardDesktopProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  
  const processedKey = selectProcessedKey(profile);
  const imageUrl = processedKey 
    ? getImageUrl(processedKey)
    : profile.profile_pic_url;

  const profileUrl = `/${profile.instagram_id}`;

  const handleMouseDown = (e: React.MouseEvent) => {
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const moveThreshold = 5; // pixels
    const moveX = Math.abs(e.clientX - startPos.current.x);
    const moveY = Math.abs(e.clientY - startPos.current.y);
    
    // If moved significantly, it's a drag, so prevent navigation
    if (moveX > moveThreshold || moveY > moveThreshold) {
      e.preventDefault();
      return;
    }
  };

  return (
    <Link
      href={profileUrl}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      prefetch={true}
      className="group flex flex-shrink-0 flex-col items-center gap-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 no-underline"
      style={{ width: '180px' }}
    >
      <div className="relative h-[180px] w-[180px] overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800 shadow-md group-hover:shadow-xl transition-shadow duration-300">
        <Image
          src={imageUrl}
          alt={profile.username}
          fill
          className={`object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          unoptimized={!!processedKey}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
      </div>
      <div className="flex w-full flex-col items-center text-center gap-1">
        <div className="flex items-center justify-center gap-1 w-full px-2">
          <p className="truncate text-base font-semibold text-foreground">@{profile.username}</p>
          {profile.is_verified && (
            <Checkmark size={16} className="flex-shrink-0" />
          )}
        </div>
        <p className="w-full truncate text-sm text-neutral-500 dark:text-neutral-400">{profile.full_name}</p>
      </div>
    </Link>
  );
}
