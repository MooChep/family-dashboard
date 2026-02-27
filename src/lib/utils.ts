import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// cn() = utilitaire pour combiner des classes Tailwind conditionnellement
// sans risque de conflits (ex: p-2 et p-4 → garde uniquement p-4)
// clsx gère les conditions, twMerge résout les conflits Tailwind
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Formate une date en français
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

// Formate une date courte (ex: "27 fév. 2026")
export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

// Capitalise la première lettre d'une chaîne
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Tronque une chaîne à une longueur maximale
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}