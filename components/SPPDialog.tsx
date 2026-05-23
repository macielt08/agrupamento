import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { getElementos, getSppGeral } from 'zite-endpoints-sdk';
type SPPRecord = {
  id: number;
  seccao?: string;
  elemento?: string;
  area?: string;
  sigla?: string;
  objetivo?: string;
  descricao?: string;
  observacoes?: string;
  estado?: string;
  dataProposta?: string;
  dataConcluido?: string;
};
type SPPDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (record: Partial<SPPRecord>) => void;
  record?: SPPRecord;
  selectedSection: string;
  userSection?: string;
  userName?: string;
  userCategoria?: string;
  isAdmin: boolean;
  isProgramer: boolean;
};
export default function SPPDialog({
  open,
  onClose,
  onSave,
  record,
  selectedSection,
  userSection,
  userName,
  userCategoria,
  isAdmin,
  isProgramer
}: SPPDialogProps) {
  const [formData, setFormData] = useState<Partial<SPPRecord>>({
    seccao: selectedSection,
    elemento: '',
    area: '',
    sigla: '',
    objetivo: '',
    descricao: '',
    observacoes: '',
    estado: 'Proposto',
    dataProposta: '',
    dataConcluido: ''
  });
  const [elementos, setElementos] = useState<any[]>([]);
  const [sppGeral, setSppGeral] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };
  useEffect(() => {
    const loadData = async () => {
      if (!open || !selectedSection) return;
      try {
        setLoading(true);
        const [elementosData, sppGeralData] = await Promise.all([getElementos({}), getSppGeral({})]);
        setElementos(elementosData.records);
        setSppGeral(sppGeralData.records);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [open, selectedSection]);
  useEffect(() => {
    if (record && record.id > 0) {
      setFormData({
        ...record,
        observacoes: record.observacoes || '',
        dataProposta: formatDateForInput(record.dataProposta),
        dataConcluido: formatDateForInput(record.dataConcluido)
      });
    } else if (record && record.id === 0) {
      // Novo registo pré-preenchido a partir da matriz
      setFormData({
        seccao: record.seccao || selectedSection,
        elemento: record.elemento || (userCategoria === 'User' ? userName : ''),
        area: record.area || '',
        sigla: '',
        objetivo: record.objetivo || '',
        descricao: '',
        observacoes: '',
        estado: 'Proposto',
        dataProposta: '',
        dataConcluido: ''
      });
    } else {
      setFormData({
        seccao: selectedSection,
        elemento: userCategoria === 'User' ? userName : '',
        area: '',
        sigla: '',
        objetivo: '',
        descricao: '',
        observacoes: '',
        estado: 'Proposto',
        dataProposta: '',
        dataConcluido: ''
      });
    }
  }, [record, open, selectedSection]);
  const filteredElementos = useMemo(() => {
    return elementos.filter(e => e.seccao === selectedSection && e.nome !== 'DELETED' && e.estado !== 'DELETED');
  }, [elementos, selectedSection]);
  const availableAreas = useMemo(() => {
    const areas = sppGeral.filter(s => s.seccao === selectedSection && s.area).map(s => s.area);
    return Array.from(new Set(areas));
  }, [sppGeral, selectedSection]);
  const availableObjetivos = useMemo(() => {
    if (!formData.area) return [];
    return sppGeral.filter(s => s.seccao === selectedSection && s.area === formData.area && s.objetivo).map(s => s.objetivo);
  }, [sppGeral, selectedSection, formData.area]);
  useEffect(() => {
    if (formData.area && formData.objetivo) {
      const matchingRecord = sppGeral.find(s => s.seccao === selectedSection && s.area === formData.area && s.objetivo === formData.objetivo);
      if (matchingRecord) {
        setFormData(prev => ({
          ...prev,
          sigla: matchingRecord.sigla || '',
          descricao: matchingRecord.descricao || ''
        }));
      }
    }
  }, [formData.area, formData.objetivo, sppGeral, selectedSection]);
  const handleAreaChange = (area: string) => {
    setFormData({
      ...formData,
      area,
      objetivo: '',
      sigla: '',
      descricao: '',
      observacoes: formData.observacoes
    });
  };

  // Campos Estado e Data Concluído bloqueados quando:
  // - é edição de registo existente (id > 0)
  // - o estado ORIGINAL do registo era "Proposto"
  // - o utilizador NÃO é Admin/CA nem Dirigente
  const isManagement = isAdmin || userCategoria === 'Dirigente';
  const originalStateIsProposto = record && record.id > 0 && record.estado === 'Proposto';
  const estadoLocked = !!originalStateIsProposto && !isManagement;
  const dataConcluídoLocked = !isManagement;
  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record && record.id > 0 ? 'Editar Registo SPP' : 'Novo Registo SPP'}</DialogTitle>
          <DialogDescription>
            {record && record.id > 0 ? 'Edite o registo do Sistema de Progressão Pessoal.' : 'Crie um novo registo do Sistema de Progressão Pessoal.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div> : <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Elemento</Label>
              <Select value={formData.elemento} onValueChange={v => setFormData({
            ...formData,
            elemento: v
          })} disabled={userCategoria === 'User'}>
                <SelectTrigger className={userCategoria === 'User' ? "bg-muted cursor-not-allowed" : ""}>
                  <SelectValue placeholder="Selecione um elemento" />
                </SelectTrigger>
                <SelectContent>
                  {userCategoria === 'User' ? <SelectItem value={userName || ''}>{userName}</SelectItem> : filteredElementos.map(e => <SelectItem key={e.id} value={e.nome || ''}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {userCategoria === 'User' && <p className="text-[10px] text-muted-foreground">O registo será gravado em teu nome.</p>}
            </div>

            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={formData.area} onValueChange={handleAreaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma área" />
                </SelectTrigger>
                <SelectContent>
                  {availableAreas.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trilho</Label>
              <Select value={formData.objetivo} onValueChange={v => setFormData({
            ...formData,
            objetivo: v
          })} disabled={!formData.area}>
                <SelectTrigger>
                  <SelectValue placeholder={formData.area ? "Selecione um objetivo" : "Selecione uma área primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {availableObjetivos.map((objetivo, idx) => <SelectItem key={idx} value={objetivo}>{objetivo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sigla</Label>
              <Input value={formData.sigla} placeholder="Sigla do objetivo" disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} placeholder="Descrição detalhada do objetivo" rows={3} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>Compromissos</Label>
              <Textarea value={formData.observacoes} onChange={e => setFormData({
            ...formData,
            observacoes: e.target.value
          })} placeholder="Observações adicionais..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={v => setFormData({
              ...formData,
              estado: v
            })} disabled={estadoLocked}>
                  <SelectTrigger className={estadoLocked ? 'bg-muted cursor-not-allowed opacity-60' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proposto">Proposto</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
                {estadoLocked && <p className="text-[10px] text-muted-foreground">Apenas Dirigentes e CA podem alterar o estado.</p>}
              </div>
              <div className="space-y-2">
                <Label>Data Proposta</Label>
                <Input type="date" value={formData.dataProposta} onChange={e => setFormData({
              ...formData,
              dataProposta: e.target.value
            })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data Concluído</Label>
              <Input type="date" value={formData.dataConcluido} onChange={e => setFormData({
            ...formData,
            dataConcluido: e.target.value
          })} disabled={dataConcluídoLocked} className={dataConcluídoLocked ? 'bg-muted cursor-not-allowed opacity-60' : ''} />
            </div>
          </div>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.elemento || !formData.area || !formData.objetivo}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}
