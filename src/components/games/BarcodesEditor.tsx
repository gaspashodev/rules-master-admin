import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useGameBarcodes,
  useCreateGameBarcode,
  useUpdateGameBarcode,
  useDeleteGameBarcode,
} from '@/hooks/useGameBarcodes';
import type { GameBarcode, GameBarcodeFormData } from '@/types/database';
import { Plus, Trash2, Pencil, Barcode, Package } from 'lucide-react';

interface BarcodesEditorProps {
  gameId: string;
}

export function BarcodesEditor({ gameId }: BarcodesEditorProps) {
  const { data: barcodes, isLoading } = useGameBarcodes(gameId);
  const createBarcode = useCreateGameBarcode();
  const updateBarcode = useUpdateGameBarcode();
  const deleteBarcode = useDeleteGameBarcode();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBarcode, setEditingBarcode] = useState<GameBarcode | null>(null);
  const [formData, setFormData] = useState<GameBarcodeFormData>({
    barcode: '',
    edition: '',
  });

  const openAddDialog = () => {
    setEditingBarcode(null);
    setFormData({ barcode: '', edition: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (barcode: GameBarcode) => {
    setEditingBarcode(barcode);
    setFormData({
      barcode: barcode.barcode,
      edition: barcode.edition || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const cleanData: GameBarcodeFormData = {
      barcode: formData.barcode.trim(),
      edition: formData.edition?.trim() || null,
    };

    if (editingBarcode) {
      await updateBarcode.mutateAsync({
        id: editingBarcode.id,
        gameId,
        data: cleanData,
      });
    } else {
      await createBarcode.mutateAsync({
        gameId,
        data: cleanData,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteBarcode.mutate({ id, gameId });
  };

  // Valider le format EAN-13 (13 chiffres)
  const isValidBarcode = (code: string) => {
    return /^\d{8,13}$/.test(code.trim());
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Codes-barres ({barcodes?.length || 0})
          </CardTitle>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">Chargement...</div>
          ) : barcodes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Barcode className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Aucun code-barre pour ce jeu
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                Ajoutez les codes-barres des différentes éditions pour permettre l'identification par scan
              </p>
              <Button size="sm" variant="outline" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un code-barre
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
            {barcodes?.map((barcode: GameBarcode) => (
                <div
                  key={barcode.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Barcode className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium">{barcode.barcode}</p>
                    {barcode.edition && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        {barcode.edition}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(barcode)}
                    >
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
                          <AlertDialogTitle>Supprimer ce code-barre ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Le code-barre {barcode.barcode} sera supprimé. Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(barcode.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ajout/Modification */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBarcode ? 'Modifier le code-barre' : 'Nouveau code-barre'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code-barre (EAN-13) *</Label>
              <Input
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value.replace(/\D/g, '') })}
                placeholder="3760146642348"
                maxLength={13}
                className="font-mono"
              />
              {formData.barcode && !isValidBarcode(formData.barcode) && (
                <p className="text-xs text-destructive">
                  Le code-barre doit contenir entre 8 et 13 chiffres
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Code à 13 chiffres situé sous le code-barre de la boîte
              </p>
            </div>

            <div className="space-y-2">
              <Label>Édition (optionnel)</Label>
              <Input
                value={formData.edition || ''}
                onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                placeholder="Ex: Édition de base, Extension, Édition 2024..."
              />
              <p className="text-xs text-muted-foreground">
                Permet d'identifier quelle version du jeu correspond à ce code-barre
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.barcode.trim() ||
                !isValidBarcode(formData.barcode) ||
                createBarcode.isPending ||
                updateBarcode.isPending
              }
            >
              {editingBarcode ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}