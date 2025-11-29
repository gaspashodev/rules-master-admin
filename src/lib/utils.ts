import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { LessonSection } from '@/types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Compte le nombre de mots dans un texte
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Calcule le temps de lecture estimé en minutes pour un concept
 * basé sur le contenu de ses sections.
 * 
 * Paramètres de calcul :
 * - Texte : ~200 mots/minute (vitesse de lecture moyenne)
 * - Introduction/Résumé : ~200 mots/minute
 * - Images : ~15 secondes par image (0.25 min)
 * - Vidéos : ~30 secondes par vidéo (0.5 min) - temps d'observation, pas la durée complète
 * - Tips : comme du texte + 10 secondes de réflexion
 * - Examples : comme du texte + 15 secondes d'analyse
 */
export function calculateEstimatedTime(
  sections: LessonSection[],
  introduction?: string,
  summary?: string
): number {
  const WORDS_PER_MINUTE = 200;
  const IMAGE_TIME_MINUTES = 0.10; // 15 secondes
  const VIDEO_TIME_MINUTES = 0.5;  // 30 secondes
  const TIP_EXTRA_TIME = 0.17;     // 10 secondes de réflexion
  const EXAMPLE_EXTRA_TIME = 0.25; // 15 secondes d'analyse

  let totalMinutes = 0;

  // Temps pour l'introduction
  if (introduction) {
    const introWords = countWords(introduction);
    totalMinutes += introWords / WORDS_PER_MINUTE;
  }

  // Temps pour chaque section
  for (const section of sections) {
    // Temps de lecture du contenu texte
    const contentWords = countWords(section.content);
    const titleWords = countWords(section.title || '');
    const textMinutes = (contentWords + titleWords) / WORDS_PER_MINUTE;

    switch (section.section_type) {
      case 'text':
        totalMinutes += textMinutes;
        break;
      
      case 'image':
        totalMinutes += textMinutes + IMAGE_TIME_MINUTES;
        break;
      
      case 'video':
        totalMinutes += textMinutes + VIDEO_TIME_MINUTES;
        break;
      
      case 'tip':
        totalMinutes += textMinutes + TIP_EXTRA_TIME;
        break;
      
      case 'example':
        totalMinutes += textMinutes + EXAMPLE_EXTRA_TIME;
        break;
      
      default:
        totalMinutes += textMinutes;
    }
  }

  // Temps pour le résumé
  if (summary) {
    const summaryWords = countWords(summary);
    totalMinutes += summaryWords / WORDS_PER_MINUTE;
  }

  // Arrondir au minimum à 1 minute, sinon arrondir à l'entier supérieur
  return Math.max(1, Math.ceil(totalMinutes));
}