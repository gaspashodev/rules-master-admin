import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bold, Italic, Underline, List, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder = 'Écrivez votre contenu...',
  rows = 6,
  maxLength,
  className,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleBold = () => insertMarkdown('**', '**');
  const handleItalic = () => insertMarkdown('*', '*');
  const handleUnderline = () => insertMarkdown('__', '__');
  const handleHighlight = () => insertMarkdown('==', '==');
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-primary"
          onClick={handleHighlight}
          title="Mise en évidence (Ctrl+H)"
        >
          <Sparkles className="h-4 w-4" />
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
              case 'h':
                e.preventDefault();
                handleHighlight();
                break;
            }
          }
        }}
      />

      {/* Message d'erreur */}
      {isOverLimit && (
        <p className="text-xs text-destructive">
          Le contenu dépasse la limite de {maxLength} caractères
        </p>
      )}

      {/* Aide */}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Raccourcis :</span> Ctrl+B (gras), Ctrl+I (italique), Ctrl+U (souligné), Ctrl+H (évidence)
      </p>
    </div>
  );
}