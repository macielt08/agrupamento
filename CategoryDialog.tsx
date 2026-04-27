import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategories } from 'zite-endpoints-sdk';
import type { Category } from '@/types';
import { Permissions } from '@/utils/permissions';

type CategoryDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (categoria: string, subCategoria: string, seccao: string) => void;
  category?: Category;
  perms: Permissions;
};

export default function CategoryDialog({ open, onClose, onSave, category, perms }: CategoryDialogProps) {
  const isAdmin = perms.isCA;
  const isSubAdmin = perms.isTA;
  const userSection = perms.userSeccao;
  const [categoria, setCategoria] = useState('');
  const [subCategoria, setSubCategoria] = useState('');
  const [seccao, setSeccao] = useState('');
  const [existingCategories, setExistingCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (open) {
      loadCategories();
      
      if (category) {
        // Editing existing category
        setCategoria(category.categoria || '');
        setSubCategoria(category.subCategoria || '');
        setSeccao(category.seccao || '');
      } else {
        // Creating new category
        setCategoria('');
        setSubCategoria('');
        // Set default section for non-admin users
        if (!isAdmin && !isSubAdmin && userSection) {
          setSeccao(userSection);
        } else {
          setSeccao('');
        }
      }
    }
  }, [open, category, isAdmin, isSubAdmin, userSection, perms]);

  const loadCategories = async () => {
    try {
      const data = await getCategories({});
      setExistingCategories(data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Get unique category names from existing categories, excluding DELETED ones
  const uniqueCategories = Array.from(new Set(
    existingCategories
      .filter(c => c.categoria !== 'DELETED' && c.subCategoria !== 'DELETED' && c.seccao !== 'DELETED')
      .map(c => c.categoria)
      .filter(Boolean)
  ));

  // Determine available sections based on user role
  const availableSections = () => {
    if (isAdmin) {
      return ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Agrupamento'];
    } else if (isSubAdmin && userSection) {
      return [userSection, 'Agrupamento'];
    } else if (userSection) {
      return [userSection];
    }
    return [];
  };

  const handleSubmit = () => {
    if (categoria && seccao) {
      onSave(categoria, subCategoria, seccao);
      setCategoria('');
      setSubCategoria('');
      setSeccao('');
      onClose();
    }
  };

  const sections = availableSections();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar SubCategoria' : 'Nova SubCategoria'}</DialogTitle>
          <DialogDescription>
            {category ? 'Edite a subcategoria existente.' : 'Crie uma nova subcategoria para organizar os seus movimentos.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Secção</Label>
            <Select value={seccao} onValueChange={setSeccao}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma secção" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {uniqueCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subcategoria (Opcional)</Label>
            <Input 
              value={subCategoria} 
              onChange={(e) => setSubCategoria(e.target.value)}
              placeholder="Ex: Restaurante (opcional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!categoria || !seccao}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
