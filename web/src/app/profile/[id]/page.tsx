import { getProfileById } from '@/lib/profiles';
import { ProfileView } from '@/components/ProfileView';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PageTransition } from '@/components/PageTransition';
import { getPresignedUrl } from '@/lib/r2';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = getProfileById(id);

  if (!profile) {
    return {
      title: 'Profile Not Found',
    };
  }

  // Get the Wesley-ified image, or fallback to original
  const imageKey = profile.v1_image_r2_key || profile.original_image_r2_key;
  const imageUrl = imageKey ? await getPresignedUrl(imageKey) : null;

  return {
    title: `Wesleygram - @${profile.username}`,
    description: profile.biography || `View ${profile.full_name}'s Wesley-ified profile photo`,
    openGraph: {
      title: `@${profile.username} - Wesleygram`,
      description: profile.biography || `View ${profile.full_name}'s Wesley-ified profile photo`,
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `@${profile.username} - Wesleygram`,
      description: profile.biography || `View ${profile.full_name}'s Wesley-ified profile photo`,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const profile = getProfileById(id);

  if (!profile) {
    notFound();
  }

  return (
    <PageTransition>
      <div className="flex h-svh flex-col bg-background text-foreground">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-4 sm:py-8 overflow-y-auto">
          <ProfileView profile={profile} />
        </main>
      </div>
    </PageTransition>
  );
}
