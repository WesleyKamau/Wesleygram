'use client';

import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { HomeProfile } from '@/lib/profiles';
import { ProfilePreviewCardDesktop } from './ProfilePreviewCardDesktop';
import { CAROUSEL_SCROLL_SPEED } from '@/lib/constants';
import { useCallback, useEffect, useRef } from 'react';

interface ProfileCarouselRowDesktopProps {
  profiles: HomeProfile[];
  direction?: 'forward' | 'backward';
  keyPrefix: string;
}

export function ProfileCarouselRowDesktop({ profiles, direction = 'forward', keyPrefix }: ProfileCarouselRowDesktopProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      align: 'start',
      dragFree: true,
    },
    [
      AutoScroll({ 
        speed: CAROUSEL_SCROLL_SPEED * 0.8,
        startDelay: 0,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
        direction: direction,
      })
    ]
  );

  const emblaApiRef = useRef<typeof emblaApi>(undefined);

  useEffect(() => {
    emblaApiRef.current = emblaApi;
  }, [emblaApi]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (emblaApiRef.current) {
        emblaApiRef.current.destroy();
      }
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!emblaApi) return;
    const autoScroll = emblaApi.plugins().autoScroll;
    if (autoScroll && !autoScroll.isPlaying()) {
      autoScroll.play();
    }
  }, [emblaApi]);

  return (
    <div className="w-full" ref={emblaRef} onMouseLeave={handleMouseLeave}>
      <div className="flex gap-6 pl-6 pr-6">
        {profiles.map((profile, index) => (
          <div key={`${keyPrefix}-${profile.instagram_id}-${index}`} className="flex-[0_0_auto]">
            <ProfilePreviewCardDesktop profile={profile} />
          </div>
        ))}
      </div>
    </div>
  );
}
