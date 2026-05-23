import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type TransferSectionDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (newSection: string) => void;
  currentSection: string;
};

const SECTIONS = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Dirigentes'];

export default function TransferSectionDialog({ open, onClose, onConfirm, currentSection }: TransferSectionDialogProps) {
  const [selectedSection, setSelectedSection] = useState<string>('');

  const handleConfirm = () => {
    if (selectedSection) {
      onConfirm(selectedSection);
      setSelectedSection('');
    }
  };

  const handleClose = () => {
    setSelectedSection('');
    onClose();
  };

  const availableSections = SECTIONS.filter(s => s !== currentSection);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir de Secção</DialogTitle>
          <DialogDescription>
            Selecione a nova secção para transferir o elemento.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <Label>Nova Secção</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma secção" />
              </SelectTrigger>
              <SelectContent>
                {availableSections.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedSection}>
            Confirmar Transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
