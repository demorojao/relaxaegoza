import React from 'react';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import BioClientView from './BioClientView';

interface BioPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BioPage({ params }: BioPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) {
    notFound();
  }

  // 2. Fetch Ad if provider
  const { data: ad } = await supabase
    .from('ads')
    .select('*')
    .eq('user_id', id)
    .maybeSingle();

  // 3. Count VIP media
  const { count: mediaCount } = await supabase
    .from('premium_media')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', id)
    .eq('is_active', true);

  return (
    <BioClientView 
      profile={profile} 
      ad={ad} 
      mediaCount={mediaCount || 0} 
    />
  );
}
