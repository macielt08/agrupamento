import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, Calculator, Info } from 'lucide-react';
import TransferSectionDialog from '@/components/TransferSectionDialog';
import { formattedStringToInputDate } from '@/utils/dateUtils';

type ElementoRecord = {
  id: number;
  seccao?: string;
  nome?: string;
  estado?: string;
  bandoPatrulhaEquipa?: string;
  promessa?: string;
  categoria?: string;
  etapa?: string;
  entradaSeccao?: string;
  saidaSeccao?: string;
  noitesCampo?: number;
  saldoInicialNoites?: number;
  dataSaldoInicial?: string;
};

type ElementoDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (record: Partial<ElementoRecord>) => void;
  onTransfer?: (currentRecord: ElementoRecord, newSection: string) => void;
  record?: ElementoRecord;
  selectedSection: string;
  userSection?: string;
  isAdmin: boolean;
  isProgramer: boolean;
};

export default function ElementoDialog({ open, onClose, onSave, onTransfer, record, selectedSection, userSection, isAdmin, isProgramer }: ElementoDialogProps) {
  const [formData, setFormData] = useState<Partial<ElementoRecord>>({
    seccao: selectedSection,
    nome: '',
    estado: 'Ativo',
    bandoPatrulhaEquipa: '',
    promessa: '',
    categoria: '',
    etapa: '',
    entradaSeccao: '',
    saidaSeccao: '',
    noitesCampo: 0,
    saldoInicialNoites: 0,
    dataSaldoInicial: ''
  });
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  useEffect(() => {
    if (record) {
      setFormData({
        seccao: record.seccao || selectedSection,
        nome: record.nome || '',
        estado: record.estado || 'Ativo',
        bandoPatrulhaEquipa: record.bandoPatrulhaEquipa || '',
        promessa: formattedStringToInputDate(record.promessa) || '',
        categoria: record.categoria || '',
        etapa: record.etapa || '',
        entradaSeccao: formattedStringToInputDate(record.entradaSeccao) || '',
        saidaSeccao: formattedStringToInputDate(record.saidaSeccao) || '',
        noitesCampo: record.noitesCampo || 0,
        saldoInicialNoites: record.saldoInicialNoites || 0,
        dataSaldoInicial: formattedStringToInputDate(record.dataSaldoInicial) || ''
      });
    } else {
      setFormData({
        seccao: selectedSection,
        nome: '',
        estado: 'Ativo',
        bandoPatrulhaEquipa: '',
        promessa: '',
        categoria: '',
        etapa: '',
        entradaSeccao: '',
        saidaSeccao: '',
        noitesCampo: 0,
        saldoInicialNoites: 0,
        dataSaldoInicial: new Date().toISOString().split('T')[0]
      });
    }
  }, [record, open, selectedSection]);

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  const handleTransferClick = () => setTransferDialogOpen(true);

  const handleTransferConfirm = (newSection: string) => {
    if (record && onTransfer && formData.saidaSeccao) {
      const updatedRecord: ElementoRecord = { ...record, ...formData, id: record.id };
      onTransfer(updatedRecord, newSection);
    }
    setTransferDialogOpen(false);
    onClose();
  };

  const getBandoPatrulhaEquipaLabel = () => {
    if (formData.seccao === 'Lobitos') return 'Bando';
    if (formData.seccao === 'Exploradores') return 'Patrulha';
    return 'Equipa';
  };

  const getEtapaOptions = () => {
    switch (formData.seccao) {
      case 'Lobitos': return ['Pata Tenra', 'Lobo Valente', 'Lobo Cortês', 'Lobo Amigo'];
      case 'Exploradores': return ['Apelo', 'Aliança', 'Rumo', 'Descoberta'];
      case 'Pioneiros': return ['Desprendimento', 'Conhecimento', 'Vontade', 'Construção'];
      case 'Caminheiros': return ['Caminho', 'Comunidade', 'Serviço', 'Partida'];
      default: return [];
    }
  };

  const getCategoriaOptions = () => {
    switch (formData.seccao) {
      case 'Lobitos': return ['Pata Tenra', 'Lobito'];
      case 'Exploradores': return ['Aspirante a Explorador', 'Noviço a Explorador', 'Explorador'];
      case 'Pioneiros': return ['Aspirante a Pioneiro', 'Noviço a Pioneiro', 'Pioneiro'];
      case 'Caminheiros': return ['Aspirante a Caminheiro', 'Noviço a Caminheiro', 'Caminheiro'];
      case 'Dirigentes': return ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros'];
      default: return [];
    }
  };

  const showEtapaField = formData.seccao !== 'Dirigentes';

  const isFormValid = () => {
    return !!formData.nome;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{record ? 'Editar Elemento' : 'Novo Elemento'}</DialogTitle>
            <DialogDescription>
              {record ? 'Edite as informações do elemento.' : 'Preencha os dados para criar um novo elemento.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Secção</Label>
                <Select value={formData.seccao} onValueChange={v => setFormData({ ...formData, seccao: v, etapa: '', categoria: '' })} disabled={!!record}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Dirigentes'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showEtapaField && (
                <div className="space-y-2">
                  <Label>Etapa</Label>
                  <Select value={formData.etapa} onValueChange={v => setFormData({ ...formData, etapa: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {getEtapaOptions().map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* SECÇÃO DE SALDO DE NOITES */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Calculator className="h-3.5 w-3.5" /> Histórico de Noites
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Saldo Inicial</Label>
                  <Input type="number" value={formData.saldoInicialNoites} onChange={e => setFormData({ ...formData, saldoInicialNoites: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de Corte</Label>
                  <Input type="date" value={formData.dataSaldoInicial} onChange={e => setFormData({ ...formData, dataSaldoInicial: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 bg-blue-50 p-2 rounded text-[10px] text-blue-700">
                <Info className="h-3 w-3 shrink-0" />
                O total será: Saldo + atividades após a data de corte.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.categoria} onValueChange={v => setFormData({ ...formData, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getCategoriaOptions().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Promessa</Label>
                <Input type="date" value={formData.promessa} onChange={e => setFormData({ ...formData, promessa: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={formData.estado} onValueChange={v => setFormData({ ...formData, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!isFormValid()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {record && (
        <TransferSectionDialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} onConfirm={handleTransferConfirm} currentSection={record.seccao || ''} />
      )}
    </>
  );
}
