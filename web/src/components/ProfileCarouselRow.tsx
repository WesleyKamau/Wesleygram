'use client';

import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { Profile } from '@/lib/profiles';
import { ProfilePreviewCard } from './ProfilePreviewCard';
import { CAROUSEL_SCROLL_SPEED } from '@/lib/constants';
import { useEffect } from 'react';

interface ProfileCarouselRowProps {
  profiles: Profile[];
  direction?: 'forward' | 'backward';
  keyPrefix: string;
  className?: string;
}

export function ProfileCarouselRow({ profiles, direction = 'forward', keyPrefix, className = '' }: ProfileCarouselRowProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      align: 'start',
      dragFree: true,
    },
    [
      AutoScroll({ 
        speed: CAROUSEL_SCROLL_SPEED,
        startDelay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        direction: direction,
      })
    ]
  );

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (emblaApi) {
        emblaApi.destroy();
      }
    };
  }, []);

  return (
    <div className={`w-full ${className}`} ref={emblaRef}>
      <div className="flex gap-4 pl-4 pr-4">
        {profiles.map((profile, index) => (
          <div key={`${keyPrefix}-${profile.instagram_id}-${index}`} className="flex-[0_0_auto]">
            <ProfilePreviewCard profile={profile} />
          </div>
        ))}
      </div>
    </div>
  );
}
