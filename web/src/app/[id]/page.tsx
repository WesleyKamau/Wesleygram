import { getProfileById, getProfileByUsername } from '@/lib/profiles';
import { selectProcessedKey, WESLEY_ID } from '@/lib/images';
import { getPresignedUrl } from '@/lib/r2';
import { ProfilePageClient } from '@/components/ProfilePageClient';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  let profile = getProfileById(id);

  // If not found by ID, try username as fallback
  if (!profile) {
    profile = getProfileByUsername(id);
  }

  if (!profile) {
    return {
      title: 'Profile Not Found',
    };
  }

  // Easter egg for Wesley's profile
  const pageTitle = id === '290944620'
    ? `@${profile.username}, except it's actually wesley`
    : `@${profile.username}, wesley-ified`;
  const pageDescription =
    profile.biography || `View ${profile.full_name}'s Wesley-ified profile photo`;

  // og:image / twitter:image come from the segment's opengraph-image.tsx
  // (a branded share card served as real bytes — crawlers don't reliably
  // follow the old 302-to-R2 redirect this used to point at).
  return {
    title: pageTitle,
    description: pageDescription,
    // Username URLs (/wesleykamau) render the same page; point crawlers at
    // the canonical ID URL that the sitemap lists.
    alternates: {
      canonical: `/${profile.instagram_id}`,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const profile = getProfileById(id);

  // If not found by ID, check if it's a username and redirect
  if (!profile) {
    const profileByUsername = getProfileByUsername(id);
    if (profileByUsername) {
      redirect(`/${profileByUsername.instagram_id}`);
    }
    redirect('/?error=user-not-found');
  }

  // Resolve presigned R2 URLs on the server so the profile images load
  // directly from R2 on first paint, skipping the /api/image redirect hop.
  // Presigning is a local crypto op (cached in-memory) — no extra round trip.
  let resolvedUrls: { original: string | null; processed: string | null } | undefined;
  let blur: { original: string | null; processed: string | null } | undefined;
  if (profile.instagram_id !== WESLEY_ID) {
    const processedKey = selectProcessedKey(profile);
    const [original, processed] = await Promise.all([
      profile.original_image_r2_key ? getPresignedUrl(profile.original_image_r2_key) : null,
      processedKey ? getPresignedUrl(processedKey) : null,
    ]);
    resolvedUrls = { original, processed };
    // Blur-up placeholders mirror the processed-key selection (prefer v2).
    blur = {
      original: profile.original_blur ?? null,
      processed: (profile.v2_image_r2_key ? profile.v2_blur : profile.v1_blur) ?? null,
    };
  }

  return <ProfilePageClient profile={profile} resolvedUrls={resolvedUrls} blur={blur} />;
}
