export interface Specialty {
  name: string;
}

export interface ProfileSpecialty {
  specialties: Specialty;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  city: string;
  price_per_hour: number;
  avatar_url: string | null;
  subscription_tier?: 'free' | 'pro' | 'gold';
  is_available_now?: boolean;
  is_space_verified?: boolean;
  verification_status?: 'none' | 'pending' | 'verified' | 'rejected';
  specialties?: ProfileSpecialty[];
  avg_rating?: number;
  reviews_count?: number;
  bio?: string;
  whatsapp?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  amenities?: string[];
  role?: string;
  target_audience?: string[]; // Homens, Mulheres, Casais, etc.
  gender?: 'Feminino' | 'Masculino' | 'Trans' | string;
  boost_expires_at?: string | null;
  last_free_boost_at?: string | null;
  available_until?: string | null;
  created_at?: string;
  ad_title?: string;
  ad_description?: string;
  ad_price?: number;
  ad_photos?: string[];
  ad_videos?: string[];
}

export interface Story {
  id: string;
  photo_url: string;
  media_type?: string;
}
