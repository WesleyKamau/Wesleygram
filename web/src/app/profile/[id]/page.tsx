import { getProfileById } from '@/lib/profiles';
import { ProfileView } from '@/components/ProfileView';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
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

  return {
    title: `@${profile.username}`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const profile = getProfileById(id);

  if (!profile) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <ProfileView profile={profile} />
      </main>
      <Footer />
    </div>
  );
}
