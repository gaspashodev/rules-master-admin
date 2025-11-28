import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useConcept, useUpdateConcept, useCreateSection, useUpdateSection, useDeleteSection } from '@/hooks/useConcepts';
import type { SectionFormData, LessonSection } from '@/types/database';
import { ArrowLeft, Save, Plus, GripVertical, Trash2, Pencil, FileText, Image, Video, Lightbulb, Code } from 'lucide-react';

const sectionTypes = [
  { value: 'text', label: 'Texte', icon: FileText, color: 'bg-blue-500' },
  { value: 'image', label: 'Image', icon: Image, color: 'bg-green-500' },
  { value: 'video', label: 'Vidéo', icon: Video, color: 'bg-red-500' },
  { value: 'tip', label: 'Astuce', icon: Lightbulb, color: 'bg-yellow-500' },
  { value: 'example', label: 'Exemple', icon: Code, color: 'bg-purple-500' },
];

export function ConceptFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: concept, isLoading } = useConcept(id);
  const updateConcept = useUpdateConcept();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();

  const [introduction, setIntroduction] = useState('');
  const [summary, setSummary] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<LessonSection | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormData>({
    section_type: 'text',
    order_index: 1,
    title: '',
    content: '',
    image_url: null,
    video_url: null,
    alt_text: null,
  });

  useEffect(() => {
    if (concept) {
      setIntroduction(concept.introduction || '');
      setSummary(concept.summary || '');
    }
  }, [concept]);

  const handleSave = async () => {
    if (!id) return;
    await updateConcept.mutateAsync({
      id,
      data: { introduction, summary },
    });
  };

  const handleAddSection = async () => {
    if (!id) return;
    await createSection.mutateAsync({
      conceptId: id,
      data: {
        ...sectionForm,
        order_index: (concept?.sections?.length || 0) + 1,
      },
    });
    setIsAddDialogOpen(false);
    resetSectionForm();
  };

  const handleEditSection = async () => {
    if (!id || !editingSection) return;
    await updateSection.mutateAsync({
      id: editingSection.id,
      conceptId: id,
      data: sectionForm,
    });
    setEditingSection(null);
    resetSectionForm();
  };

  const resetSectionForm = () => {
    setSectionForm({
      section_type: 'text',
      order_index: 1,
      title: '',
      content: '',
      image_url: null,
      video_url: null,
      alt_text: null,
    });
  };

  const openEditDialog = (section: LessonSection) => {
    setEditingSection(section);
    setSectionForm({
      section_type: section.section_type,
      order_index: section.order_index,
      title: section.title || '',
      content: section.content,
      image_url: section.image_url,
      video_url: section.video_url,
      alt_text: section.alt_text,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!concept) {
    return <div>Concept non trouvé</div>;
  }

  const getSectionTypeInfo = (type: string) => {
    return sectionTypes.find(t => t.value === type) || sectionTypes[0];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/games/${concept.game_id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{concept.name}</h1>
            <p className="text-muted-foreground">{concept.description}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateConcept.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Contenu</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                rows={4}
                placeholder="Texte d'introduction..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sections ({concept.sections?.length || 0})</CardTitle>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {concept.sections?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune section. Cliquez sur "Ajouter" pour créer du contenu.
                </div>
              ) : (
                <div className="space-y-2">
                  {concept.sections?.map((section) => {
                    const typeInfo = getSectionTypeInfo(section.section_type);
                    const Icon = typeInfo.icon;
                    return (
                      <div
                        key={section.id}
                        className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors group"
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                        <div className={`p-2 rounded ${typeInfo.color}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{typeInfo.label}</Badge>
                            {section.title && <span className="font-medium">{section.title}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {section.content.substring(0, 80)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(section)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cette section ?</AlertDialogTitle>
                                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSection.mutate({ id: section.id, conceptId: concept.id })}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                placeholder="Résumé de fin de leçon..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du concept</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ordre</Label>
                  <Input type="number" value={concept.order_index} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Durée estimée (min)</Label>
                  <Input type="number" value={concept.estimated_time} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Difficulté</Label>
                <div className="text-2xl">{'★'.repeat(concept.difficulty)}{'☆'.repeat(3 - concept.difficulty)}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quiz">
          <Card>
            <CardHeader>
              <CardTitle>Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                La gestion des quiz sera disponible dans une prochaine version.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Section Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle section</DialogTitle>
          </DialogHeader>
          <SectionForm form={sectionForm} setForm={setSectionForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddSection} disabled={createSection.isPending}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier la section</DialogTitle>
          </DialogHeader>
          <SectionForm form={sectionForm} setForm={setSectionForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>Annuler</Button>
            <Button onClick={handleEditSection} disabled={updateSection.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionForm({ form, setForm }: { form: SectionFormData; setForm: (f: SectionFormData) => void }) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Type de section</Label>
        <Select value={form.section_type} onValueChange={(v: any) => setForm({ ...form, section_type: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sectionTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Titre (optionnel)</Label>
        <Input
          value={form.title || ''}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Titre de la section"
        />
      </div>
      <div className="space-y-2">
        <Label>Contenu *</Label>
        <Textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={6}
          placeholder="Contenu de la section..."
        />
      </div>
      {(form.section_type === 'image') && (
        <>
          <div className="space-y-2">
            <Label>URL de l'image</Label>
            <Input
              value={form.image_url || ''}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Texte alternatif</Label>
            <Input
              value={form.alt_text || ''}
              onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
              placeholder="Description de l'image"
            />
          </div>
        </>
      )}
      {(form.section_type === 'video') && (
        <>
          <div className="space-y-2">
            <Label>URL de la vidéo</Label>
            <Input
              value={form.video_url || ''}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              placeholder="https://youtube.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label>Texte alternatif</Label>
            <Input
              value={form.alt_text || ''}
              onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
              placeholder="Description de la vidéo"
            />
          </div>
        </>
      )}
    </div>
  );
}