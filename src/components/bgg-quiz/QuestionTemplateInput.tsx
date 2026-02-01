import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  useQuestionTemplates,
  useCreateQuestionTemplate,
  useIncrementTemplateUsage,
} from '@/hooks/useBggQuiz';
import { toast } from 'sonner';
import { Save, ChevronDown, History, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionTemplateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function QuestionTemplateInput({
  value,
  onChange,
  placeholder = 'Entrez votre question...',
  className,
}: QuestionTemplateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: templates = [], isLoading } = useQuestionTemplates();
  const createTemplate = useCreateQuestionTemplate();
  const incrementUsage = useIncrementTemplateUsage();

  // Filter templates based on input
  const filteredTemplates = templates.filter((t) =>
    t.question.toLowerCase().includes(value.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (e.target.value && templates.length > 0) {
      setIsOpen(true);
    }
  };

  const handleSelectTemplate = async (template: { id: string; question: string }) => {
    onChange(template.question);
    setIsOpen(false);
    // Increment usage count
    await incrementUsage.mutateAsync(template.id);
  };

  const handleSaveAsTemplate = async () => {
    if (!value.trim()) {
      toast.error('Veuillez saisir une question');
      return;
    }

    // Check if template already exists
    const exists = templates.some(
      (t) => t.question.toLowerCase() === value.toLowerCase()
    );
    if (exists) {
      toast.error('Ce template existe déjà');
      return;
    }

    await createTemplate.mutateAsync(value.trim());
  };

  const canSaveAsTemplate =
    value.trim().length > 0 &&
    !templates.some((t) => t.question.toLowerCase() === value.toLowerCase());

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            onFocus={() => {
              if (templates.length > 0) {
                setIsOpen(true);
              }
            }}
            className="pr-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-8 hover:bg-transparent"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSaveAsTemplate}
          disabled={!canSaveAsTemplate || createTemplate.isPending}
          title="Sauvegarder comme template"
        >
          {createTemplate.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Aucun template trouvé
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between gap-2 border-b last:border-0"
                >
                  <span className="flex-1 truncate">{template.question}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <History className="h-3 w-3" />
                    {template.usage_count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {templates.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {templates.length} template{templates.length > 1 ? 's' : ''} disponible{templates.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
