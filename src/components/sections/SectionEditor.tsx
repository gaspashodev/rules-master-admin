import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { 
  LessonSection, 
  SectionBlock, 
  BlockFormData, 
  BlockType,
  BlockMetadata,
  HeadingMetadata,
  InfoBarMetadata,
  InfoBarItem,
  ListItemsMetadata,
  FloatingImageMetadata,
  ListItem,
} from '@/types/database';
import {
  Plus,
  GripVertical,
  Trash2,
  FileText,
  Image,
  Video,
  Lightbulb,
  Code,
  Quote,
  Info,
  List,
  ImageIcon,
  Heading,
  Smartphone,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

// ============ CONSTANTES ============

const TEXTUAL_BLOCK_TYPES: BlockType[] = ['text', 'tip', 'example', 'quote', 'heading'];
const COMPLEX_BLOCK_TYPES: BlockType[] = ['image', 'video', 'info_bar', 'list_items', 'floating_image'];

interface BlockTypeConfig {
  value: BlockType;
  label: string;
  icon: React.ElementType;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const blockTypeConfigs: BlockTypeConfig[] = [
  { value: 'text', label: 'Texte', icon: FileText, bgColor: 'bg-slate-50 dark:bg-slate-900/30', borderColor: 'border-slate-200 dark:border-slate-800', textColor: 'text-slate-600' },
  { value: 'tip', label: 'Astuce', icon: Lightbulb, bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', borderColor: 'border-yellow-200 dark:border-yellow-800', textColor: 'text-yellow-700' },
  { value: 'example', label: 'Exemple', icon: Code, bgColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-200 dark:border-purple-800', textColor: 'text-purple-700' },
  { value: 'quote', label: 'Citation', icon: Quote, bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', borderColor: 'border-indigo-200 dark:border-indigo-800', textColor: 'text-indigo-700' },
  { value: 'heading', label: 'Titre', icon: Heading, bgColor: 'bg-slate-100 dark:bg-slate-800/50', borderColor: 'border-slate-300 dark:border-slate-700', textColor: 'text-slate-800' },
  { value: 'image', label: 'Image', icon: Image, bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800', textColor: 'text-green-700' },
  { value: 'video', label: 'Vidéo', icon: Video, bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-800', textColor: 'text-red-700' },
  { value: 'info_bar', label: 'Infos rapides', icon: Info, bgColor: 'bg-cyan-50 dark:bg-cyan-900/20', borderColor: 'border-cyan-200 dark:border-cyan-800', textColor: 'text-cyan-700' },
  { value: 'list_items', label: 'Liste visuelle', icon: List, bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-200 dark:border-orange-800', textColor: 'text-orange-700' },
  { value: 'floating_image', label: 'Image flottante', icon: ImageIcon, bgColor: 'bg-teal-50 dark:bg-teal-900/20', borderColor: 'border-teal-200 dark:border-teal-800', textColor: 'text-teal-700' },
];

const getBlockConfig = (type: BlockType): BlockTypeConfig => {
  return blockTypeConfigs.find((c) => c.value === type) || blockTypeConfigs[0];
};

const MAX_BLOCKS_PER_SECTION = 6;
const MAX_CONTENT_LENGTH = 1500;

// ============ HELPERS LECTURE METADATA ============

function getBlockInfoBar(block: SectionBlock): InfoBarMetadata {
  return (block.metadata as InfoBarMetadata) || { items: [] };
}

function getBlockListItems(block: SectionBlock): ListItemsMetadata {
  return (block.metadata as ListItemsMetadata) || { items: [] };
}

function getBlockFloatingImage(block: SectionBlock): FloatingImageMetadata {
  return (block.metadata as FloatingImageMetadata) || { position: 'bottom-right', height: 50 };
}

function getBlockHeading(block: SectionBlock): { text: string; emoji?: string } {
  const meta = block.metadata as HeadingMetadata | null;
  return { text: block.content || '', emoji: meta?.emoji };
}

function getBlockQuote(block: SectionBlock): string {
  return block.content || '';
}

// ============ INLINE EDITOR COMPONENT ============

interface InlineBlockEditorProps {
  block: SectionBlock;
  onBlockChange: (data: Partial<BlockFormData>) => void;
  onTypeChange: (newType: BlockType) => void;
  isSelected: boolean;
  onSelect: () => void;
}

function InlineBlockEditor({
  block,
  onBlockChange,
  onTypeChange,
  isSelected,
  onSelect,
}: InlineBlockEditorProps) {
  const config = getBlockConfig(block.block_type);

  // Pour heading: texte dans content, emoji dans metadata
  const headingData = getBlockHeading(block);
  const [headingText, setHeadingText] = useState(headingData.text);
  const [headingEmoji, setHeadingEmoji] = useState(headingData.emoji || '');
  
  // Pour quote: texte directement dans content
  const [quoteText, setQuoteText] = useState(getBlockQuote(block));

  // Synchroniser quand le bloc change
  useEffect(() => {
    if (block.block_type === 'heading') {
      const data = getBlockHeading(block);
      setHeadingText(data.text);
      setHeadingEmoji(data.emoji || '');
    } else if (block.block_type === 'quote') {
      setQuoteText(getBlockQuote(block));
    }
  }, [block.block_type, block.content, block.metadata]);

  const handleHeadingChange = (text: string, emoji: string) => {
    setHeadingText(text);
    setHeadingEmoji(emoji);
    const metadata: HeadingMetadata | null = emoji ? { emoji } : null;
    onBlockChange({ 
      content: text || null,
      metadata 
    });
  };

  const handleQuoteChange = (text: string) => {
    setQuoteText(text);
    onBlockChange({ content: text || null, metadata: null });
  };

  const isTextualType = TEXTUAL_BLOCK_TYPES.includes(block.block_type);

  if (!isTextualType) {
    return null; // Les blocs complexes ne sont pas édités inline
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 transition-all cursor-text',
        config.bgColor,
        config.borderColor,
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onSelect}
    >
      {/* Header avec type et actions */}
      <div className={cn('flex items-center gap-2 px-3 py-2 border-b', config.borderColor)}>
        <div className={cn('flex items-center gap-1.5', config.textColor)}>
          <config.icon className="h-4 w-4" />
          <span className="text-xs font-medium">{config.label}</span>
        </div>
        
        {/* Sélecteur de type */}
        {isSelected && (
          <Select
            value={block.block_type}
            onValueChange={(v) => onTypeChange(v as BlockType)}
          >
            <SelectTrigger className="h-7 w-[140px] text-xs ml-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEXTUAL_BLOCK_TYPES.map((type) => {
                const typeConfig = getBlockConfig(type);
                const TypeIcon = typeConfig.icon;
                return (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-3 w-3" />
                      {typeConfig.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Zone d'édition inline */}
      <div className="p-3">
        {block.block_type === 'heading' ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={headingEmoji}
                onChange={(e) => handleHeadingChange(headingText, e.target.value)}
                placeholder="🎯"
                className="w-14 text-center text-lg"
              />
              <Input
                value={headingText}
                onChange={(e) => handleHeadingChange(e.target.value, headingEmoji)}
                placeholder="Titre de la section..."
                className="flex-1 font-semibold"
              />
            </div>
          </div>
        ) : block.block_type === 'quote' ? (
          <Textarea
            value={quoteText}
            onChange={(e) => handleQuoteChange(e.target.value)}
            placeholder="Texte de la citation..."
            rows={3}
            className="resize-none border-0 bg-transparent focus-visible:ring-0 italic"
          />
        ) : (
          <RichTextEditor
            value={block.content || ''}
            onChange={(value) => onBlockChange({ content: value || null, metadata: null })}
            placeholder={
              block.block_type === 'tip'
                ? '💡 Astuce ou conseil utile...'
                : block.block_type === 'example'
                ? '📝 Exemple concret ou cas pratique...'
                : 'Écrivez votre contenu...'
            }
            rows={4}
            maxLength={MAX_CONTENT_LENGTH}
          />
        )}
      </div>
    </div>
  );
}

// ============ COMPLEX BLOCK PREVIEW COMPONENT ============

interface ComplexBlockPreviewProps {
  block: SectionBlock;
  onClick: () => void;
}

function ComplexBlockPreview({ block, onClick }: ComplexBlockPreviewProps) {
  const config = getBlockConfig(block.block_type);

  const renderPreview = () => {
    switch (block.block_type) {
      case 'image':
        return (
          <div className="flex items-center gap-3">
            {block.image_url ? (
              <img
                src={block.image_url}
                alt={block.alt_text || ''}
                className="h-16 w-24 object-cover rounded"
              />
            ) : (
              <div className="h-16 w-24 bg-muted rounded flex items-center justify-center">
                <Image className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{block.alt_text || 'Image sans description'}</p>
              {block.content && (
                <p className="text-xs text-muted-foreground truncate">{block.content}</p>
              )}
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center gap-3">
            <div className="h-16 w-24 bg-muted rounded flex items-center justify-center">
              <Video className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{block.alt_text || 'Vidéo'}</p>
              {block.video_url && (
                <p className="text-xs text-muted-foreground truncate">{block.video_url}</p>
              )}
            </div>
          </div>
        );

      case 'info_bar': {
        const infoData = getBlockInfoBar(block);
        const items = infoData.items || [];
        return (
          <div className="flex items-center gap-4 text-sm">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
                  <span className="text-muted-foreground">{item.label}:</span> {item.value || '—'}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">Aucune info configurée</span>
            )}
          </div>
        );
      }

      case 'list_items': {
        const listData = getBlockListItems(block);
        return (
          <div className="space-y-1">
            {listData.title && (
              <p className="text-sm font-medium">{listData.title}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {listData.items.length} élément{listData.items.length > 1 ? 's' : ''}
            </p>
            {listData.items.slice(0, 2).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span>{item.icon || '•'}</span>
                <span className="truncate">{item.name}</span>
              </div>
            ))}
            {listData.items.length > 2 && (
              <p className="text-xs text-muted-foreground">
                + {listData.items.length - 2} autre{listData.items.length > 3 ? 's' : ''}
              </p>
            )}
          </div>
        );
      }

      case 'floating_image': {
        const floatData = getBlockFloatingImage(block);
        return (
          <div className="flex items-center gap-3">
            {block.image_url ? (
              <img
                src={block.image_url}
                alt=""
                className="h-16 w-16 object-contain rounded bg-muted"
              />
            ) : (
              <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="text-sm">
              <p>Position: {floatData.position === 'bottom-right' ? 'Bas droite' : 'Bas gauche'}</p>
              <p className="text-xs text-muted-foreground">Hauteur: {floatData.height}%</p>
            </div>
          </div>
        );
      }

      default:
        return <p className="text-sm text-muted-foreground">Bloc non reconnu</p>;
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-primary/50',
        config.bgColor,
        config.borderColor
      )}
      onClick={onClick}
    >
      <div className={cn('flex items-center gap-2 mb-2', config.textColor)}>
        <config.icon className="h-4 w-4" />
        <span className="text-xs font-medium">{config.label}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          Cliquer pour éditer
        </Badge>
      </div>
      {renderPreview()}
    </div>
  );
}

// ============ SORTABLE BLOCK WRAPPER ============

interface SortableBlockWrapperProps {
  block: SectionBlock;
  children: React.ReactNode;
  onDelete: (id: string) => void;
  isSelected: boolean;
}

function SortableBlockWrapper({
  block,
  children,
  onDelete,
  isSelected,
}: SortableBlockWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Actions flottantes */}
      <div
        className={cn(
          'absolute -left-10 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
          isSelected && 'opacity-100'
        )}
      >
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce bloc ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(block.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {children}
    </div>
  );
}

// ============ INSERT BLOCK BUTTON ============

interface InsertBlockButtonProps {
  onInsert: (type: BlockType) => void;
  disabled?: boolean;
}

function InsertBlockButton({ onInsert, disabled }: InsertBlockButtonProps) {
  return (
    <div className="flex justify-center py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
            disabled={disabled}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Blocs textuels
          </div>
          {TEXTUAL_BLOCK_TYPES.map((type) => {
            const config = getBlockConfig(type);
            const Icon = config.icon;
            return (
              <DropdownMenuItem key={type} onClick={() => onInsert(type)}>
                <Icon className="h-4 w-4 mr-2" />
                {config.label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Blocs médias
          </div>
          {COMPLEX_BLOCK_TYPES.map((type) => {
            const config = getBlockConfig(type);
            const Icon = config.icon;
            return (
              <DropdownMenuItem key={type} onClick={() => onInsert(type)}>
                <Icon className="h-4 w-4 mr-2" />
                {config.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============ INFO BAR EDITOR ============

interface InfoBarEditorProps {
  metadata: InfoBarMetadata;
  onChange: (m: InfoBarMetadata) => void;
}

function InfoBarEditor({ metadata, onChange }: InfoBarEditorProps) {
  const items = metadata.items || [];
  const canAddMore = items.length < 3;
  const canRemove = items.length > 2;

  const addItem = () => {
    if (!canAddMore) return;
    onChange({
      items: [...items, { icon: '', label: '', value: '' }],
    });
  };

  const removeItem = (index: number) => {
    if (!canRemove) return;
    onChange({
      items: items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, updates: Partial<InfoBarItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({ items: newItems });
  };

  // Initialiser avec 2 items par défaut si vide
  if (items.length === 0) {
    onChange({
      items: [
        { icon: '⏱', label: 'Durée', value: '' },
        { icon: '👥', label: 'Joueurs', value: '' },
      ],
    });
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Champs ({items.length}/3)</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addItem}
          disabled={!canAddMore}
        >
          <Plus className="h-3 w-3 mr-1" />
          Ajouter un champ
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="p-3 border rounded-lg bg-muted/30">
            <div className="flex gap-2 items-end">
              <div className="space-y-1 w-16">
                <Label className="text-xs">Icône</Label>
                <Input
                  value={item.icon || ''}
                  onChange={(e) => updateItem(index, { icon: e.target.value })}
                  placeholder="⏱"
                  className="text-center"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Libellé *</Label>
                <Input
                  value={item.label}
                  onChange={(e) => updateItem(index, { label: e.target.value })}
                  placeholder="Durée"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Valeur *</Label>
                <Input
                  value={item.value}
                  onChange={(e) => updateItem(index, { value: e.target.value })}
                  placeholder="30 min"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive h-9 w-9"
                onClick={() => removeItem(index)}
                disabled={!canRemove}
                title={canRemove ? 'Supprimer' : 'Minimum 2 champs'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Affiche 2 ou 3 infos sous forme de petites cartes horizontales
      </p>
    </div>
  );
}

// ============ LIST ITEMS EDITOR ============

interface ListItemsEditorProps {
  metadata: ListItemsMetadata;
  onChange: (m: ListItemsMetadata) => void;
}

function ListItemsEditor({ metadata, onChange }: ListItemsEditorProps) {
  const colors: Array<ListItem['color']> = ['yellow', 'blue', 'green', 'purple', 'red', 'orange', 'pink', 'cyan'];

  const addItem = () => {
    onChange({
      ...metadata,
      items: [...metadata.items, { name: '', icon: '📌', color: 'blue' }],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...metadata,
      items: metadata.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, updates: Partial<ListItem>) => {
    const newItems = [...metadata.items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({ ...metadata, items: newItems });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Titre de la liste (optionnel)</Label>
        <Input
          value={metadata.title || ''}
          onChange={(e) => onChange({ ...metadata, title: e.target.value || undefined })}
          placeholder="🎯 3 chemins vers la victoire"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Éléments ({metadata.items.length})</Label>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>

        {metadata.items.map((item, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
            <div className="flex gap-2">
              <div className="space-y-1 w-16">
                <Label className="text-xs">Emoji</Label>
                <Input
                  value={item.icon || ''}
                  onChange={(e) => updateItem(index, { icon: e.target.value })}
                  placeholder="⚡"
                  className="text-center"
                />
              </div>
              <div className="space-y-1 w-24">
                <Label className="text-xs">Couleur</Label>
                <Select
                  value={item.color || 'blue'}
                  onValueChange={(v) => updateItem(index, { color: v as ListItem['color'] })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map((c) => (
                      <SelectItem key={c} value={c!}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded bg-${c}-500`} />
                          {c}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Titre *</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  placeholder="Victoire absolue"
                />
              </div>
              <div className="space-y-1 w-16">
                <Label className="text-xs">Badge</Label>
                <Input
                  value={item.badge || ''}
                  onChange={(e) => updateItem(index, { badge: e.target.value })}
                  placeholder="3="
                  className="text-center"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="mt-5 text-destructive"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optionnel)</Label>
              <Input
                value={item.description || ''}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                placeholder="3 disques de la même planète"
              />
            </div>
          </div>
        ))}

        {metadata.items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun élément. Cliquez sur "Ajouter" pour commencer.
          </p>
        )}
      </div>
    </div>
  );
}

// ============ COMPLEX BLOCK MODAL ============

interface ComplexBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: SectionBlock | null;
  onSave: (data: BlockFormData) => void;
  conceptId: string;
  gameSlug?: string;
}

function ComplexBlockModal({
  isOpen,
  onClose,
  block,
  onSave,
  conceptId,
  gameSlug,
}: ComplexBlockModalProps) {
  const [form, setForm] = useState<BlockFormData>({
    block_type: 'image',
    order_index: 1,
    content: null,
    image_url: null,
    video_url: null,
    alt_text: null,
    metadata: null,
  });

  // États pour les métadonnées structurées (nouveau format)
  const [listMetadata, setListMetadata] = useState<ListItemsMetadata>({ items: [] });
  const [infoBarMetadata, setInfoBarMetadata] = useState<InfoBarMetadata>({ items: [] });
  const [floatingMetadata, setFloatingMetadata] = useState<FloatingImageMetadata>({
    position: 'bottom-right',
    height: 50,
  });

  // Initialiser le formulaire quand le bloc change
  useEffect(() => {
    if (block) {
      setForm({
        block_type: block.block_type,
        order_index: block.order_index,
        content: block.content,
        image_url: block.image_url,
        video_url: block.video_url,
        alt_text: block.alt_text,
        metadata: block.metadata,
      });

      // Charger les métadonnées (avec rétrocompatibilité)
      if (block.block_type === 'list_items') {
        setListMetadata(getBlockListItems(block));
      } else if (block.block_type === 'info_bar') {
        setInfoBarMetadata(getBlockInfoBar(block));
      } else if (block.block_type === 'floating_image') {
        setFloatingMetadata(getBlockFloatingImage(block));
      }
    }
  }, [block]);

  const handleSave = () => {
    let content: string | null = form.content;
    let metadata: BlockMetadata | null = null;

    switch (form.block_type) {
      case 'list_items':
        content = null; // Plus de content pour list_items
        metadata = listMetadata;
        break;
      case 'info_bar':
        content = null; // Plus de content pour info_bar
        // Ne sauvegarder que si au moins un champ est rempli
        const hasInfoData = infoBarMetadata.items?.some(item => item.value);        metadata = hasInfoData ? infoBarMetadata : null;
        break;
      case 'floating_image':
        content = null; // Plus de content pour floating_image
        metadata = floatingMetadata;
        break;
      default:
        // Pour image et video, content reste utilisé normalement
        metadata = null;
    }

    onSave({ ...form, content, metadata });
    onClose();
  };

  if (!block) return null;

  const config = getBlockConfig(block.block_type);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <config.icon className="h-5 w-5" />
            Éditer - {config.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* IMAGE */}
          {form.block_type === 'image' && (
            <>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                bucket="lesson-images"
                folder={conceptId}
                filePrefix={gameSlug}
                label="Image"
                aspectRatio="video"
                showUrlInput={true}
              />
              <div className="space-y-2">
                <Label>Texte alternatif</Label>
                <Input
                  value={form.alt_text || ''}
                  onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
                  placeholder="Description de l'image pour l'accessibilité"
                />
              </div>
              <RichTextEditor
                value={form.content || ''}
                onChange={(value) => setForm({ ...form, content: value || null })}
                label="Légende (optionnel)"
                placeholder="Texte explicatif pour accompagner l'image..."
                rows={3}
                maxLength={MAX_CONTENT_LENGTH}
              />
            </>
          )}

          {/* VIDEO */}
          {form.block_type === 'video' && (
            <>
              <div className="space-y-2">
                <Label>URL de la vidéo</Label>
                <Input
                  value={form.video_url || ''}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground">
                  Supporte YouTube, Vimeo et les liens vidéo directs
                </p>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.alt_text || ''}
                  onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
                  placeholder="Description de la vidéo"
                />
              </div>
              <RichTextEditor
                value={form.content || ''}
                onChange={(value) => setForm({ ...form, content: value || null })}
                label="Texte associé (optionnel)"
                placeholder="Texte explicatif pour accompagner la vidéo..."
                rows={3}
                maxLength={MAX_CONTENT_LENGTH}
              />
            </>
          )}

          {/* INFO_BAR */}
          {form.block_type === 'info_bar' && (
            <InfoBarEditor metadata={infoBarMetadata} onChange={setInfoBarMetadata} />
          )}

          {/* LIST_ITEMS */}
          {form.block_type === 'list_items' && (
            <ListItemsEditor metadata={listMetadata} onChange={setListMetadata} />
          )}

          {/* FLOATING_IMAGE */}
          {form.block_type === 'floating_image' && (
            <>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                bucket="lesson-images"
                folder={conceptId}
                filePrefix={gameSlug}
                label="Image flottante (PNG transparent recommandé)"
                showUrlInput={true}
                noCrop={true}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select
                    value={floatingMetadata.position}
                    onValueChange={(v: 'bottom-right' | 'bottom-left') =>
                      setFloatingMetadata({ ...floatingMetadata, position: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bas droite</SelectItem>
                      <SelectItem value="bottom-left">Bas gauche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hauteur ({floatingMetadata.height}% de l'écran)</Label>
                  <Input
                    type="number"
                    min={20}
                    max={80}
                    value={floatingMetadata.height}
                    onChange={(e) =>
                      setFloatingMetadata({ ...floatingMetadata, height: parseInt(e.target.value) || 50 })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Image en position absolue qui flotte par-dessus le contenu avec animation
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN SECTION EDITOR COMPONENT ============

export interface SectionEditorProps {
  section: LessonSection;
  conceptId: string;
  gameSlug?: string;
  onUpdateBlock: (blockId: string, data: Partial<BlockFormData>) => void;
  onCreateBlock: (sectionId: string, data: BlockFormData, insertIndex?: number) => void;
  onDeleteBlock: (blockId: string) => void;
  onReorderBlocks: (sectionId: string, blocks: SectionBlock[]) => void;
  onPreview: () => void;
}

export function SectionEditor({
  section,
  conceptId,
  gameSlug,
  onUpdateBlock,
  onCreateBlock,
  onDeleteBlock,
  onReorderBlocks,
  onPreview,
}: SectionEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingComplexBlock, setEditingComplexBlock] = useState<SectionBlock | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && section.blocks) {
      const oldIndex = section.blocks.findIndex((b) => b.id === active.id);
      const newIndex = section.blocks.findIndex((b) => b.id === over.id);
      const reordered = arrayMove(section.blocks, oldIndex, newIndex);
      onReorderBlocks(section.id, reordered);
    }
  };

  const handleInsertBlock = (type: BlockType, insertIndex: number) => {
    // Nouveau format: content contient le texte, metadata contient les données structurées
    let content: string | null = null;
    let metadata: BlockMetadata | null = null;
    
    switch (type) {
      case 'heading':
        content = ''; // Texte vide par défaut
        metadata = null; // Pas d'emoji par défaut
        break;
      case 'quote':
        content = ''; // Texte vide par défaut
        metadata = null;
        break;
      case 'text':
      case 'tip':
      case 'example':
        content = ''; // Texte vide par défaut
        metadata = null;
        break;
      case 'info_bar':
        content = null;
        metadata = {}; // InfoBarMetadata vide
        break;
      case 'list_items':
        content = null;
        metadata = { items: [] }; // ListItemsMetadata vide
        break;
      case 'floating_image':
        content = null;
        metadata = { position: 'bottom-right', height: 50 };
        break;
      default:
        content = null;
        metadata = null;
    }
    
    const newBlockData: BlockFormData = {
      block_type: type,
      order_index: insertIndex + 1,
      content,
      image_url: null,
      video_url: null,
      alt_text: null,
      metadata,
    };

    onCreateBlock(section.id, newBlockData, insertIndex);
  };

  const handleBlockChange = useCallback(
    (blockId: string, data: Partial<BlockFormData>) => {
      onUpdateBlock(blockId, data);
    },
    [onUpdateBlock]
  );

  const handleTypeChange = useCallback(
    (blockId: string, newType: BlockType) => {
      // Réinitialiser content et metadata selon le nouveau type
      let newContent: string | null = null;
      let newMetadata: BlockMetadata | null = null;
      
      switch (newType) {
        case 'heading':
          newContent = '';
          newMetadata = null;
          break;
        case 'quote':
        case 'text':
        case 'tip':
        case 'example':
          newContent = '';
          newMetadata = null;
          break;
        default:
          newContent = null;
          newMetadata = null;
      }
      
      onUpdateBlock(blockId, { block_type: newType, content: newContent, metadata: newMetadata });
    },
    [onUpdateBlock]
  );

  const handleComplexBlockSave = (data: BlockFormData) => {
    if (editingComplexBlock) {
      onUpdateBlock(editingComplexBlock.id, data);
    }
  };

  const blocksCount = section.blocks?.length || 0;
  const canAddMoreBlocks = blocksCount < MAX_BLOCKS_PER_SECTION;

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header de la section */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium">
              {section.title || `Section ${section.order_index}`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {blocksCount} bloc{blocksCount > 1 ? 's' : ''} • Max {MAX_BLOCKS_PER_SECTION}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onPreview}>
            <Smartphone className="h-4 w-4 mr-1" />
            Aperçu
          </Button>
        </div>
      </div>

      {/* Contenu avec blocs */}
      <div className="p-6 pl-14">
        {blocksCount === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">Aucun bloc dans cette section</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un bloc
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Blocs textuels
                </div>
                {TEXTUAL_BLOCK_TYPES.map((type) => {
                  const config = getBlockConfig(type);
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem key={type} onClick={() => handleInsertBlock(type, 0)}>
                      <Icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Blocs médias
                </div>
                {COMPLEX_BLOCK_TYPES.map((type) => {
                  const config = getBlockConfig(type);
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem key={type} onClick={() => handleInsertBlock(type, 0)}>
                      <Icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={section.blocks?.map((b) => b.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {section.blocks?.map((block, index) => {
                  const isTextual = TEXTUAL_BLOCK_TYPES.includes(block.block_type);
                  const isSelected = selectedBlockId === block.id;

                  return (
                    <div key={block.id}>
                      <SortableBlockWrapper
                        block={block}
                        onDelete={onDeleteBlock}
                        isSelected={isSelected}
                      >
                        {isTextual ? (
                          <InlineBlockEditor
                            block={block}
                            onBlockChange={(data) => handleBlockChange(block.id, data)}
                            onTypeChange={(newType) => handleTypeChange(block.id, newType)}
                            isSelected={isSelected}
                            onSelect={() => setSelectedBlockId(block.id)}
                          />
                        ) : (
                          <ComplexBlockPreview
                            block={block}
                            onClick={() => setEditingComplexBlock(block)}
                          />
                        )}
                      </SortableBlockWrapper>

                      {/* Bouton d'insertion entre les blocs */}
                      {canAddMoreBlocks && (
                        <InsertBlockButton
                          onInsert={(type) => handleInsertBlock(type, index + 1)}
                          disabled={!canAddMoreBlocks}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modal d'édition des blocs complexes */}
      <ComplexBlockModal
        isOpen={!!editingComplexBlock}
        onClose={() => setEditingComplexBlock(null)}
        block={editingComplexBlock}
        onSave={handleComplexBlockSave}
        conceptId={conceptId}
        gameSlug={gameSlug}
      />
    </div>
  );
}
