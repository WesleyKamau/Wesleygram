import { getProfileById, getProfileByUsername, getProfiles } from '@/lib/profiles';
import { selectProcessedKey } from '@/lib/images';
import { ProfilePageClient } from '@/components/ProfilePageClient';
import { getPresignedUrl } from '@/lib/r2';
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

  // Get the Wesley-ified image (prefer v2→v1), or fallback to original
  const imageKey = selectProcessedKey(profile) || profile.original_image_r2_key;
  const imageUrl = imageKey ? await getPresignedUrl(imageKey) : null;

  // Easter egg for Wesley's profile
  const pageTitle = id === '290944620' 
    ? `@${profile.username}, except it's actually wesley`
    : `@${profile.username}, wesley-ified`;
  const pageDescription =
    profile.biography || `View ${profile.full_name}'s Wesley-ified profile photo`;

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  let profile = getProfileById(id);

  // If not found by ID, check if it's a username and redirect
  if (!profile) {
    const profileByUsername = getProfileByUsername(id);
    if (profileByUsername) {
      redirect(`/${profileByUsername.instagram_id}`);
    }
    redirect('/?error=user-not-found');
  }

  const allProfiles = getProfiles();

  return <ProfilePageClient profile={profile} allProfiles={allProfiles} />;
}
