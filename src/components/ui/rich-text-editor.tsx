import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bold, Italic, Underline, List, Eye, EyeOff, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  showPreview?: boolean;
}

const textFormats = [
  { value: 'normal', label: 'Texte normal', prefix: '', icon: 'Aa' },
  { value: 'h1', label: 'Titre', prefix: '# ', icon: 'H1' },
  { value: 'h2', label: 'Sous-titre', prefix: '## ', icon: 'H2' },
];

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder = 'Écrivez votre contenu...',
  rows = 6,
  maxLength,
  className,
  showPreview: initialShowPreview = false,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(initialShowPreview);

  const contentLength = value?.length || 0;
  const isOverLimit = maxLength ? contentLength > maxLength : false;

  /**
   * Insère une balise Markdown autour du texte sélectionné
   * ou à la position du curseur
   */
  const insertMarkdown = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let newText: string;
    let newCursorPos: number;

    if (selectedText) {
      // Texte sélectionné : on l'entoure
      newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      newCursorPos = end + prefix.length + suffix.length;
    } else {
      // Pas de sélection : on insère et place le curseur au milieu
      newText = value.substring(0, start) + prefix + suffix + value.substring(end);
      newCursorPos = start + prefix.length;
    }

    onChange(newText);

    // Restaurer le focus et la position du curseur
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  /**
   * Applique un format de paragraphe (titre, sous-titre, normal)
   * sur la ligne courante
   */
  const applyLineFormat = (formatPrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    
    // Récupérer la ligne actuelle
    let currentLine = value.substring(lineStart, actualLineEnd);
    
    // Supprimer les préfixes existants (# ou ##)
    currentLine = currentLine.replace(/^#{1,2}\s*/, '');
    
    // Appliquer le nouveau format
    const newLine = formatPrefix + currentLine;
    
    const newText = value.substring(0, lineStart) + newLine + value.substring(actualLineEnd);
    onChange(newText);

    // Repositionner le curseur
    const newCursorPos = lineStart + formatPrefix.length + (start - lineStart - (value.substring(lineStart, start).match(/^#{1,2}\s*/)?.[0]?.length || 0));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  /**
   * Détecte le format de la ligne courante
   */
  const getCurrentLineFormat = (): string => {
    const textarea = textareaRef.current;
    if (!textarea) return 'normal';

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    const currentLine = value.substring(lineStart, actualLineEnd);

    if (currentLine.startsWith('## ')) return 'h2';
    if (currentLine.startsWith('# ')) return 'h1';
    return 'normal';
  };

  const handleBold = () => insertMarkdown('**', '**');
  const handleItalic = () => insertMarkdown('*', '*');
  const handleUnderline = () => insertMarkdown('__', '__');
  const handleList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    
    // Ajouter "- " au début de la ligne courante
    const newText = value.substring(0, lineStart) + '- ' + value.substring(lineStart);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    }, 0);
  };

  const handleFormatChange = (format: string) => {
    const formatInfo = textFormats.find(f => f.value === format);
    if (formatInfo) {
      applyLineFormat(formatInfo.prefix);
    }
  };

  /**
   * Rendu Markdown simplifié pour l'aperçu
   */
  const renderMarkdown = (text: string): string => {
    if (!text) return '';
    
    return text
      // Titres : # titre et ## sous-titre
      .replace(/^# (.+)$/gm, '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h4 class="text-base font-semibold mt-2 mb-1">$1</h4>')
      // Gras : **texte**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Souligné : __texte__ (traité avant italique)
      .replace(/__(.+?)__/g, '<u>$1</u>')
      // Italique : *texte*
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      // Listes : - item
      .replace(/^- (.+)$/gm, '<div class="flex gap-2"><span>•</span><span>$1</span></div>')
      // Retours à la ligne
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          {maxLength && (
            <span className={cn('text-xs', isOverLimit ? 'text-destructive' : 'text-muted-foreground')}>
              {contentLength}/{maxLength}
            </span>
          )}
        </div>
      )}

      {/* Barre d'outils */}
      <div className="flex items-center gap-1 p-1 border rounded-t-md bg-muted/30 flex-wrap">
        {/* Sélecteur de format */}
        <Select value={getCurrentLineFormat()} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <Type className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            {textFormats.map((format) => (
              <SelectItem key={format.value} value={format.value}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs w-6">{format.icon}</span>
                  <span>{format.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleBold}
          title="Gras (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleItalic}
          title="Italique (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleUnderline}
          title="Souligné (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleList}
          title="Liste à puces"
        >
          <List className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1"
          onClick={() => setShowPreview(!showPreview)}
          title={showPreview ? 'Masquer l\'aperçu' : 'Afficher l\'aperçu'}
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="text-xs hidden sm:inline">Aperçu</span>
        </Button>
      </div>

      {/* Zone de texte */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'rounded-t-none border-t-0 font-mono text-sm',
          isOverLimit && 'border-destructive focus-visible:ring-destructive'
        )}
        onKeyDown={(e) => {
          // Raccourcis clavier
          if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
              case 'b':
                e.preventDefault();
                handleBold();
                break;
              case 'i':
                e.preventDefault();
                handleItalic();
                break;
              case 'u':
                e.preventDefault();
                handleUnderline();
                break;
            }
          }
        }}
      />

      {/* Aperçu */}
      {showPreview && value && (
        <div className="p-3 border rounded-md bg-muted/20">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Aperçu :</p>
          <div
            className="text-sm prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
          />
        </div>
      )}

      {/* Message d'erreur */}
      {isOverLimit && (
        <p className="text-xs text-destructive">
          Le contenu dépasse la limite de {maxLength} caractères
        </p>
      )}

      {/* Aide */}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Raccourcis :</span> Ctrl+B (gras), Ctrl+I (italique), Ctrl+U (souligné)
      </p>
    </div>
  );
}