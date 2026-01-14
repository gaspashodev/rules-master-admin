import { icons } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconRendererProps {
  icon: string | undefined;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Détecte si une chaîne est une URL d'image
 */
function isImageUrl(icon: string): boolean {
  return icon.startsWith('http://') || 
         icon.startsWith('https://') || 
         icon.startsWith('data:image/') ||
         /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(icon);
}

/**
 * Détecte si une chaîne est un emoji ou une icône Lucide
 * Les icônes Lucide sont en PascalCase ou kebab-case (ex: "Clock", "arrow-right")
 */
function isLucideIcon(icon: string): boolean {
  // Si c'est une URL, ce n'est pas une icône Lucide
  if (isImageUrl(icon)) return false;
  
  // Si c'est court (1-2 chars) c'est probablement un emoji
  if (icon.length <= 2) return false;
  
  // Si ça contient des caractères non-ASCII, c'est un emoji
  if (/[^\x00-\x7F]/.test(icon)) return false;
  
  // Si ça commence par une majuscule ou contient des tirets, c'est une icône Lucide
  return /^[A-Z]/.test(icon) || icon.includes('-');
}

/**
 * Convertit kebab-case en PascalCase pour les icônes Lucide
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Composant qui rend soit un emoji, une icône Lucide, ou une image
 */
export function IconRenderer({ icon, className, size = 16, style }: IconRendererProps) {
  if (!icon) return null;

  // C'est une URL d'image
  if (isImageUrl(icon)) {
    return (
      <img 
        src={icon} 
        alt="" 
        className={cn('object-contain', className)}
        style={{ width: size, height: size, ...style }}
      />
    );
  }

  // C'est une icône Lucide
  if (isLucideIcon(icon)) {
    const iconName = icon.includes('-') ? toPascalCase(icon) : icon;
    const LucideIcon = icons[iconName as keyof typeof icons];
    
    if (LucideIcon) {
      return <LucideIcon className={className} size={size} style={style} />;
    }
    
    // Fallback si l'icône n'existe pas
    return <span className={className} style={style}>{icon}</span>;
  }

  // C'est un emoji
  return <span className={cn('inline-flex items-center justify-center', className)} style={{ fontSize: size, ...style }}>{icon}</span>;
}

/**
 * Liste des icônes Lucide suggérées pour l'interface
 */
export const suggestedIcons = [
  // Temps & Durée
  { name: 'Clock', label: 'Horloge' },
  { name: 'Timer', label: 'Minuteur' },
  { name: 'Hourglass', label: 'Sablier' },
  
  // Joueurs
  { name: 'Users', label: 'Joueurs' },
  { name: 'User', label: 'Joueur' },
  { name: 'UserPlus', label: 'Ajouter joueur' },
  
  // Jeu
  { name: 'Dices', label: 'Dés' },
  { name: 'Trophy', label: 'Trophée' },
  { name: 'Target', label: 'Cible' },
  { name: 'Flag', label: 'Drapeau' },
  { name: 'Crown', label: 'Couronne' },
  { name: 'Medal', label: 'Médaille' },
  { name: 'Star', label: 'Étoile' },
  { name: 'Zap', label: 'Éclair' },
  
  // Cartes & Objets
  { name: 'CreditCard', label: 'Carte' },
  { name: 'Layers', label: 'Pile' },
  { name: 'LayoutGrid', label: 'Grille' },
  { name: 'Coins', label: 'Pièces' },
  { name: 'Gem', label: 'Gemme' },
  { name: 'Gift', label: 'Cadeau' },
  { name: 'Package', label: 'Paquet' },
  
  // Actions
  { name: 'Play', label: 'Jouer' },
  { name: 'Pause', label: 'Pause' },
  { name: 'RotateCcw', label: 'Recommencer' },
  { name: 'Shuffle', label: 'Mélanger' },
  { name: 'ArrowRight', label: 'Suivant' },
  { name: 'ArrowLeft', label: 'Précédent' },
  { name: 'Check', label: 'Validé' },
  { name: 'X', label: 'Annuler' },
  { name: 'Plus', label: 'Plus' },
  { name: 'Minus', label: 'Moins' },
  
  // Information
  { name: 'Info', label: 'Info' },
  { name: 'HelpCircle', label: 'Aide' },
  { name: 'AlertTriangle', label: 'Attention' },
  { name: 'AlertCircle', label: 'Alerte' },
  { name: 'Lightbulb', label: 'Astuce' },
  { name: 'BookOpen', label: 'Règles' },
  
  // Divers
  { name: 'Heart', label: 'Cœur' },
  { name: 'Flame', label: 'Flamme' },
  { name: 'Shield', label: 'Bouclier' },
  { name: 'Sword', label: 'Épée' },
  { name: 'Wand', label: 'Baguette' },
  { name: 'Sparkles', label: 'Étincelles' },
  { name: 'CircleDot', label: 'Point' },
  { name: 'Square', label: 'Carré' },
  { name: 'Circle', label: 'Cercle' },
  { name: 'Triangle', label: 'Triangle' },
];

export { icons };
