'use client';

import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { Profile } from '@/lib/profiles';
import { ProfilePreviewCardDesktop } from './ProfilePreviewCardDesktop';
import { CAROUSEL_SCROLL_SPEED } from '@/lib/constants';

interface ProfileCarouselRowDesktopProps {
  profiles: Profile[];
  direction?: 'forward' | 'backward';
  keyPrefix: string;
}

export function ProfileCarouselRowDesktop({ profiles, direction = 'forward', keyPrefix }: ProfileCarouselRowDesktopProps) {
  const [emblaRef] = useEmblaCarousel(
    { 
      loop: true,
      align: 'start',
      dragFree: true,
    },
    [
      AutoScroll({ 
        speed: CAROUSEL_SCROLL_SPEED * 0.8,
        startDelay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        direction: direction,
      })
    ]
  );

  return (
    <div className="w-full" ref={emblaRef}>
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
