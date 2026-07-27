import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cacheLife, cacheTag } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import BioClientView from './BioClientView';

interface BioPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getCachedBioProfile(id: string) {
  'use cache';
  cacheLife('hours');
  cacheTag(`profile-${id}`);
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

async function getCachedBioAd(userId: string) {
  'use cache';
  cacheLife('hours');
  cacheTag(`profile-${userId}`);
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('ads')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

async function getCachedBioMediaCount(profileId: string) {
  'use cache';
  cacheLife('hours');
  cacheTag(`profile-${profileId}`);
  const supabase = getSupabaseServerClient();
  const { count } = await supabase
    .from('premium_media')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_active', true);
  return count || 0;
}

async function BioPageContent({ params }: BioPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const [profile, ad, mediaCount] = await Promise.all([
    getCachedBioProfile(id),
    getCachedBioAd(id),
    getCachedBioMediaCount(id),
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <BioClientView 
      profile={profile} 
      ad={ad} 
      mediaCount={mediaCount} 
    />
  );
}

const BioPageSkeleton = () => (
  <div className="w-full min-h-screen flex flex-col justify-center items-center bg-black">
    <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
  </div>
);

export default function BioPage({ params }: BioPageProps) {
  return (
    <Suspense fallback={<BioPageSkeleton />}>
      <BioPageContent params={params} />
    </Suspense>
  );
}
