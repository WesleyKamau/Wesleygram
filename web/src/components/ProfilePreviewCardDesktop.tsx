'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Profile, getImageUrl } from '@/lib/profiles';
import { selectProcessedKey } from '@/lib/images';
import { Checkmark } from './Checkmark';
import { useState } from 'react';

interface ProfilePreviewCardDesktopProps {
  profile: Profile;
}

export function ProfilePreviewCardDesktop({ profile }: ProfilePreviewCardDesktopProps) {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const processedKey = selectProcessedKey(profile);
  const imageUrl = processedKey 
    ? getImageUrl(processedKey)
    : profile.profile_pic_url;

  const profileUrl = `/${profile.instagram_id}`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only navigate if it's not a drag operation
    if ((e.target as HTMLElement).closest('.embla__container')) {
      const moveThreshold = 5; // pixels
      const startX = e.clientX;
      const startY = e.clientY;
      
      // Check if mouse moved significantly (indicates drag)
      const handleMouseUp = (upEvent: MouseEvent) => {
        const moveX = Math.abs(upEvent.clientX - startX);
        const moveY = Math.abs(upEvent.clientY - startY);
        
        if (moveX < moveThreshold && moveY < moveThreshold) {
          e.preventDefault();
          router.push(profileUrl);
        }
      };
      
      document.addEventListener('mouseup', handleMouseUp, { once: true });
      return;
    }
    
    e.preventDefault();
    router.push(profileUrl);
  };

  return (
    <a
      href={profileUrl}
      onClick={handleClick}
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
    </a>
  );
}
