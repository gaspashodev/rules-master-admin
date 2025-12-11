// components/preview/MobilePreview.tsx
// Aperçu du rendu mobile d'une section avec ses blocs
// Reproduit fidèlement le style de l'app React Native

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LessonSection, SectionBlock } from '@/types/database';
import { Moon, Sun } from 'lucide-react';

// ============================================
// COULEURS DU THÈME MOBILE (depuis Colors.ts)
// ============================================

const mobileColors = {
  light: {
    background: '#ffffff',
    backgroundSecondary: '#f5f5f5',
    text: '#000000',
    textSecondary: '#4b5563',
    textTertiary: '#6b7280',
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    cardBackground: 'rgba(0, 0, 0, 0.03)',
    cardBorder: 'rgba(0, 0, 0, 0.08)',
    success: '#10b981',
  },
  dark: {
    background: '#000000',
    backgroundSecondary: '#0a0a0a',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    textTertiary: '#6b7280',
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    cardBackground: 'rgba(255, 255, 255, 0.03)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    success: '#10b981',
  },
};

// Couleurs d'accent par type de bloc
const blockAccentColors: Record<string, string> = {
  intro: '#8b5cf6',
  text: '#8b5cf6',
  tip: '#f59e0b',
  example: '#8b5cf6',
  image: '#10b981',
  video: '#ef4444',
  summary: '#10b981',
};

// ============================================
// TYPES
// ============================================

interface MobilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conceptName: string;
  section: LessonSection & { blocks: SectionBlock[] };
  introduction?: string;
  summary?: string;
}

type ThemeMode = 'light' | 'dark';

// ============================================
// MARKDOWN PARSER (identique à l'app mobile)
// ============================================

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

interface ParsedLine {
  type: 'h1' | 'h2' | 'paragraph' | 'listItem';
  segments: TextSegment[];
}

function parseInlineStyles(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(__(.+?)__)|(_(.+?)_)|(~~(.+?)~~)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      segments.push({ text: match[2], bold: true });
    } else if (match[3]) {
      segments.push({ text: match[4], italic: true });
    } else if (match[5]) {
      segments.push({ text: match[6], underline: true });
    } else if (match[7]) {
      segments.push({ text: match[8], italic: true });
    } else if (match[9]) {
      segments.push({ text: match[10], strikethrough: true });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ text });
  }

  return segments;
}

function parseMarkdown(text: string): ParsedLine[] {
  const lines = text.split('\n');
  const parsedLines: ParsedLine[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith('## ')) {
      parsedLines.push({
        type: 'h2',
        segments: parseInlineStyles(trimmedLine.slice(3)),
      });
    } else if (trimmedLine.startsWith('# ')) {
      parsedLines.push({
        type: 'h1',
        segments: parseInlineStyles(trimmedLine.slice(2)),
      });
    } else if (trimmedLine.startsWith('- ')) {
      parsedLines.push({
        type: 'listItem',
        segments: parseInlineStyles(trimmedLine.slice(2)),
      });
    } else {
      parsedLines.push({
        type: 'paragraph',
        segments: parseInlineStyles(trimmedLine),
      });
    }
  }

  return parsedLines;
}

// ============================================
// COMPOSANTS DE RENDU
// ============================================

function MarkdownRenderer({ content, color }: { content: string; color: string }) {
  const parsedLines = parseMarkdown(content);

  return (
    <div className="space-y-0">
      {parsedLines.map((line, index) => {
        const baseStyle: React.CSSProperties = { color };
        
        let className = '';
        let style: React.CSSProperties = { ...baseStyle };

        switch (line.type) {
          case 'h1':
            className = 'text-[17px] font-bold leading-[22px]';
            if (index > 0) style.marginTop = '14px';
            break;
          case 'h2':
            className = 'text-[15px] font-semibold leading-[20px]';
            if (index > 0) style.marginTop = '12px';
            break;
          case 'listItem':
            className = 'text-[13px] leading-[20px] flex gap-1.5';
            if (index > 0) style.marginTop = '5px';
            break;
          default:
            className = 'text-[13px] leading-[20px]';
            if (index > 0) style.marginTop = '8px';
        }

        if (line.type === 'listItem') {
          return (
            <div key={index} className={className} style={style}>
              <span>•</span>
              <span>{renderSegments(line.segments)}</span>
            </div>
          );
        }

        return (
          <p key={index} className={className} style={style}>
            {renderSegments(line.segments)}
          </p>
        );
      })}
    </div>
  );
}

function renderSegments(segments: TextSegment[]): React.ReactNode {
  return segments.map((segment, index) => {
    const classes: string[] = [];
    
    if (segment.bold) classes.push('font-bold');
    if (segment.italic) classes.push('italic');
    if (segment.underline) classes.push('underline');
    if (segment.strikethrough) classes.push('line-through');

    if (classes.length > 0) {
      return (
        <span key={index} className={classes.join(' ')}>
          {segment.text}
        </span>
      );
    }

    return <span key={index}>{segment.text}</span>;
  });
}

// ============================================
// COMPOSANT BLOC
// ============================================

interface BlockRendererProps {
  block: SectionBlock;
  colors: typeof mobileColors.dark;
}

function BlockRenderer({ block, colors }: BlockRendererProps) {
  const hasAccentBar = block.block_type === 'tip' || block.block_type === 'example';
  const accentColor = blockAccentColors[block.block_type] || colors.primary;

  return (
    <div className="mb-3">
      <div className="flex">
        {/* Barre d'accent pour tips/examples */}
        {hasAccentBar && (
          <div
            className="w-[3px] rounded-sm mr-3 flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />
        )}

        {/* Contenu du bloc */}
        <div className="flex-1 min-w-0">
          {/* Image */}
          {block.image_url && (
            <div className="w-full h-[120px] rounded-xl overflow-hidden mb-3 bg-gray-800">
              <img
                src={block.image_url}
                alt={block.alt_text || ''}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Video placeholder */}
          {block.video_url && (
            <div 
              className="w-full h-[110px] rounded-xl overflow-hidden mb-3 flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8))',
                backgroundColor: '#1a1a2e'
              }}
            >
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-1">
                  <span className="text-white text-sm ml-0.5">▶</span>
                </div>
                <span className="text-white text-[10px] font-semibold">Regarder la vidéo</span>
              </div>
            </div>
          )}

          {/* Texte */}
          {block.content && (
            <MarkdownRenderer content={block.content} color={colors.text} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT CARTE (style mobile)
// ============================================

interface CardPreviewProps {
  conceptName: string;
  title: string | null;
  blocks: SectionBlock[];
  colors: typeof mobileColors.dark;
  theme: ThemeMode;
}

function CardPreview({ conceptName, title, blocks, colors, theme }: CardPreviewProps) {
  const gradientColors = theme === 'dark'
    ? 'from-white/[0.03] to-white/[0.01]'
    : 'from-black/[0.03] to-black/[0.01]';

  return (
    <div
      className="flex-1 rounded-[20px] border overflow-hidden"
      style={{ 
        borderColor: colors.cardBorder,
        backgroundColor: colors.cardBackground,
      }}
    >
      {/* Simule le BlurView + Gradient */}
      <div 
        className={cn(
          "h-full bg-gradient-to-b backdrop-blur-sm",
          gradientColors
        )}
      >
        <div className="p-5 pb-6 h-full overflow-y-auto">
          {/* Badge du concept */}
          <div className="flex justify-start items-center mb-4">
            <div
              className="flex items-center px-3 py-1.5 rounded-[12px] border"
              style={{
                backgroundColor: colors.primary + '20',
                borderColor: colors.primary + '40',
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wide"
                style={{ color: colors.primary }}
              >
                {conceptName}
              </span>
            </div>
          </div>

          {/* Titre de la section */}
          {title && (
            <p 
              className="text-[18px] font-bold leading-[24px] mb-4"
              style={{ color: colors.text }}
            >
              {title}
            </p>
          )}

          {/* Blocs */}
          {blocks.map((block, index) => (
            <BlockRenderer key={block.id || index} block={block} colors={colors} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT FRAME IPHONE
// ============================================

interface IPhoneFrameProps {
  children: React.ReactNode;
  theme: ThemeMode;
}

function IPhoneFrame({ children, theme }: IPhoneFrameProps) {
  const colors = mobileColors[theme];
  
  return (
    <div className="relative">
      {/* Cadre du téléphone */}
      <div 
        className="relative w-[340px] h-[680px] rounded-[48px] border-[12px] border-gray-800 shadow-2xl overflow-hidden"
        style={{ backgroundColor: colors.background }}
      >
        {/* Dynamic Island / Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[110px] h-[32px] bg-black rounded-full z-20" />
        
        {/* Contenu */}
        <div className="absolute inset-0 pt-11 pb-5 px-0 flex flex-col">
          {children}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-[5px] bg-gray-600 rounded-full" />
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT HEADER MOBILE
// ============================================

interface MobileHeaderProps {
  progress: number;
  current: number;
  total: number;
  colors: typeof mobileColors.dark;
}

function MobileHeader({ progress, current, total, colors }: MobileHeaderProps) {
  return (
    <div className="flex items-center px-4 pt-1 pb-3 gap-3">
      {/* Bouton fermer */}
      <span 
        className="text-[24px] font-light"
        style={{ color: colors.textSecondary }}
      >
        ✕
      </span>

      {/* Barre de progression */}
      <div className="flex-1 space-y-1">
        <div 
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: colors.cardBorder }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${progress}%`,
              backgroundColor: colors.primary 
            }}
          />
        </div>
        <p 
          className="text-[10px] text-right"
          style={{ color: colors.textSecondary }}
        >
          {current} / {total}
        </p>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT NAVIGATION MOBILE
// ============================================

interface MobileNavigationProps {
  colors: typeof mobileColors.dark;
  isLastCard: boolean;
}

function MobileNavigation({ colors, isLastCard }: MobileNavigationProps) {
  return (
    <div className="flex items-center justify-between px-4 pb-3 gap-2">
      {/* Bouton précédent */}
      <div
        className="w-[44px] h-[44px] rounded-full border flex items-center justify-center"
        style={{
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
        }}
      >
        <span className="text-[18px] font-medium" style={{ color: colors.text }}>←</span>
      </div>

      {/* Bouton principal */}
      <div
        className="flex-1 h-[48px] rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(to right, ${colors.primary}, ${colors.primary}DD)`,
        }}
      >
        <span className="text-white text-[14px] font-bold">
          {isLastCard ? 'Passer au Quiz 🎯' : 'Continuer'}
        </span>
      </div>

      {/* Bouton suivant */}
      <div
        className="w-[44px] h-[44px] rounded-full border flex items-center justify-center"
        style={{
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          opacity: isLastCard ? 0.3 : 1,
        }}
      >
        <span className="text-[18px] font-medium" style={{ color: colors.text }}>→</span>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT DOTS
// ============================================

interface MobileDotsProps {
  total: number;
  current: number;
  colors: typeof mobileColors.dark;
}

function MobileDots({ total, current, colors }: MobileDotsProps) {
  // Limiter l'affichage à 7 dots max pour la lisibilité
  const maxDots = 7;
  const showDots = Math.min(total, maxDots);
  
  return (
    <div className="flex justify-center items-center py-2 gap-1.5">
      {Array.from({ length: showDots }).map((_, index) => (
        <div
          key={index}
          className="h-[7px] rounded-full transition-all duration-200"
          style={{
            backgroundColor: index === current ? colors.primary : colors.cardBorder,
            width: index === current ? 22 : 7,
          }}
        />
      ))}
      {total > maxDots && (
        <span className="text-[9px] ml-1" style={{ color: colors.textSecondary }}>
          +{total - maxDots}
        </span>
      )}
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function MobilePreview({
  open,
  onOpenChange,
  conceptName,
  section,
  introduction,
  summary,
}: MobilePreviewProps) {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const colors = mobileColors[theme];

  // Simuler plusieurs cartes (intro + section actuelle + summary)
  const totalCards = (introduction ? 1 : 0) + 1 + (summary ? 1 : 0);
  const currentCard = introduction ? 2 : 1; // La section est toujours au milieu
  const progress = (currentCard / totalCards) * 100;

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit p-8 bg-gray-900">
        <DialogHeader className="sr-only">
          <DialogTitle>Aperçu mobile</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 items-start">
          {/* iPhone Frame */}
          <IPhoneFrame theme={theme}>
            {/* Header */}
            <MobileHeader
              progress={progress}
              current={currentCard}
              total={totalCards}
              colors={colors}
            />

            {/* Card Container */}
            <div className="flex-1 px-4 min-h-0">
              <CardPreview
                conceptName={conceptName}
                title={section.title}
                blocks={section.blocks || []}
                colors={colors}
                theme={theme}
              />
            </div>

            {/* Dots */}
            <MobileDots total={totalCards} current={currentCard - 1} colors={colors} />

            {/* Navigation */}
            <MobileNavigation colors={colors} isLastCard={currentCard === totalCards} />
          </IPhoneFrame>

          {/* Contrôles */}
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  Mode clair
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Mode sombre
                </>
              )}
            </Button>
            
            <div className="text-xs text-gray-400 mt-4 space-y-1">
              <p className="font-medium text-gray-300">Légende :</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#f59e0b]" />
                <span>Astuce (tip)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#8b5cf6]" />
                <span>Exemple</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MobilePreview;