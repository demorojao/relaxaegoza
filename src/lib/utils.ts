import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  
  // Se já começar com 55 e tiver 12 ou 13 dígitos, assume que o DDI (55) já está incluso
  const finalPhone = (digits.startsWith('55') && digits.length >= 12) ? digits : `55${digits}`;
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}
