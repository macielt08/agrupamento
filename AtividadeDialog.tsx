import { useState, useEffect, useMemo } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { createAtividade, updateAtividade, CreateAtividadeInputType } from 'zite-endpoints-sdk';
import { formattedStringToInputDate, inputDateToFormattedString } from '@/utils/dateUtils';
import { GetAtividadesOutputType } from 'zite-endpoints-sdk';

type Atividade = GetAtividadesOutputType['atividades'][0];

type AtividadeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atividade?: Atividade;
  onSuccess: () => void;
  userSection?: string;
  isAdmin: boolean;
  isProgramer: boolean;
  selectedSection: string;
};

export default function AtividadeDialog({ open, onOpenChange, atividade, onSuccess, userSection, isAdmin, isProgramer, selectedSection }: AtividadeDialogProps) {
  const [coordInput, setCoordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateAtividadeInputType> & { lat?: string; lng?: string }>({
    seccao: '',
    nome: '',
    local: '',
    dataInicio: '',
    dataFim: '',
    totalNoites: 0,
    contaNoites: '',
    ano: '',
    lat: '',
    lng: '',
  });

  // Helper to convert Excel serial date to DD/MM/YYYY
  const excelSerialToFormattedString = (serial?: number | string): string => {
    if (!serial) return '';
    
    // If it's already a string, return as is
    if (typeof serial === 'string') return serial;
    
    // If it's a number (Excel serial), convert to DD/MM/YYYY
    if (typeof serial === 'number') {
      const date = new Date((serial - 25569) * 86400 * 1000);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    return '';
  };

  // --- NOVA FUNÇÃO PARA GPS ---
  const handleGetLocation = () => {
      if (!navigator.geolocation) {
        toast.error("O seu dispositivo não suporta geolocalização");
        return;
      }

      setIsGettingLocation(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            lat: latitude.toString(),
            lng: longitude.toString()
          }));
          setIsGettingLocation(false);
          toast.success("Coordenadas obtidas!");
        },
        (error) => {
          setIsGettingLocation(false);
          let msg = "Erro ao obter localização";
          if (error.code === 1) msg = "Por favor, autorize o acesso ao GPS nas definições.";
          toast.error(msg);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

  useEffect(() => {
    if (atividade) {
      // Convert dates from Excel serial or DD/MM/YYYY to YYYY-MM-DD for input
      const dataInicioFormatted = excelSerialToFormattedString(atividade.dataInicio);
      const dataFimFormatted = excelSerialToFormattedString(atividade.dataFim);
      
      setFormData({
        seccao: atividade.seccao || '',
        nome: atividade.nome || '',
        local: atividade.local || '',
        dataInicio: formattedStringToInputDate(dataInicioFormatted),
        dataFim: formattedStringToInputDate(dataFimFormatted),
        totalNoites: atividade.totalNoites || 0,
        contaNoites: atividade.contaNoites || 'Não',
        lat: atividade.lat || '',
        lng: atividade.lng || '',
      });
    } else {
      setFormData({
        seccao: !isAdmin && !isProgramer ? (userSection || selectedSection || '') : (selectedSection || ''),
        nome: '',
        local: '',
        dataInicio: '',
        dataFim: '',
        totalNoites: 0,
        contaNoites: 'Não',
        lat: '',
        lng: '',
      });
    }
  }, [atividade, open, userSection, isAdmin, isProgramer, selectedSection]);

  // Calculate total nights automatically based on date range
  const calculatedTotalNoites = useMemo(() => {
    if (!formData.dataInicio || !formData.dataFim) return 0;
    
    const startDate = new Date(formData.dataInicio);
    const endDate = new Date(formData.dataFim);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
    
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Number of nights is the difference in days (can be 0 if same day)
    return diffDays >= 0 ? diffDays : 0;
  }, [formData.dataInicio, formData.dataFim]);

  // Calcula o ano automaticamente com base na dataFim
  const calculatedAno = useMemo(() => {
    if (!formData.dataFim) return '';
    
    const endDate = new Date(formData.dataFim);
    if (isNaN(endDate.getTime())) return '';
    
    return endDate.getFullYear().toString();
  }, [formData.dataFim]);

  // Update totalNoites in formData when it changes
  useEffect(() => {
    setFormData(prev => ({ 
      ...prev, 
      totalNoites: calculatedTotalNoites,
      ano: calculatedAno
    }));
  }, [calculatedTotalNoites, calculatedAno]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.seccao || !formData.nome) {
      toast.error('Por favor preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // Convert dates from YYYY-MM-DD to DD/MM/YYYY before sending to backend
      const dataToSend = {
        ...formData,
        ano: calculatedAno,
        dataInicio: formData.dataInicio ? inputDateToFormattedString(formData.dataInicio) : '',
        dataFim: formData.dataFim ? inputDateToFormattedString(formData.dataFim) : '',
        lat: formData.lat?.toString() || '',
        lng: formData.lng?.toString() || '',
      };

      if (atividade) {
        await updateAtividade({
          id: atividade.id,
          ...dataToSend,
        });
        toast.success('Atividade atualizada com sucesso');
      } else {
        await createAtividade(dataToSend as CreateAtividadeInputType);
        toast.success('Atividade criada com sucesso');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao guardar atividade');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCoordPaste = (value: string) => {
    setCoordInput(value);
    const coords = value.split(/[ ,]+/).map(s => s.trim());
    if (coords.length >= 2) {
      const lat = coords[0].replace(/[^0-9.-]/g, '');
      const lng = coords[1].replace(/[^0-9.-]/g, '');
      
      // Verifica se são números válidos antes de atualizar
      if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
        setFormData(prev => ({ ...prev, lat, lng }));
        // Opcional: Limpar o campo de ajuda para feedback visual de sucesso
        setTimeout(() => setCoordInput(''), 1000); 
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{atividade ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
          <DialogDescription>
            {atividade ? 'Edite os detalhes da atividade.' : 'Preencha os campos para criar uma nova atividade.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seccao">Secção *</Label>
            <Select 
              value={formData.seccao} 
              onValueChange={(value) => setFormData({ ...formData, seccao: value })} 
              disabled={(isAdmin || isProgramer) ? false : !!atividade}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a secção" />
              </SelectTrigger>
              <SelectContent>
                {(isAdmin || isProgramer) ? (
                  <>
                    <SelectItem value="Lobitos">Lobitos</SelectItem>
                    <SelectItem value="Exploradores">Exploradores</SelectItem>
                    <SelectItem value="Pioneiros">Pioneiros</SelectItem>
                    <SelectItem value="Caminheiros">Caminheiros</SelectItem>
                    <SelectItem value="Agrupamento">Agrupamento</SelectItem>
                  </>
                ) : (
                  <>
                    {userSection && <SelectItem value={userSection}>{userSection}</SelectItem>}
                    <SelectItem value="Agrupamento">Agrupamento</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome da atividade"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="local">Local</Label>
            <Input
              id="local"
              value={formData.local}
              onChange={(e) => setFormData({ ...formData, local: e.target.value })}
              placeholder="Local da atividade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataInicio">Data Início</Label>
            <Input
              id="dataInicio"
              type="date"
              value={formData.dataInicio}
              onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataFim">Data Fim</Label>
            <Input
              id="dataFim"
              type="date"
              value={formData.dataFim}
              onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalNoites">Total Noites</Label>
            <Input
              id="totalNoites"
              value={formData.totalNoites}
              disabled
              placeholder="Calculado automaticamente"
              className="bg-muted"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="contaNoites"
              checked={formData.contaNoites === 'Sim'}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, contaNoites: checked ? 'Sim' : 'Não' })
              }
            />
            <Label htmlFor="contaNoites" className="cursor-pointer">
              Contabilizar noites desta atividade
            </Label>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex justify-between items-end">
              <Label htmlFor="helper-coords" className="text-sm font-medium text-primary">
                Localização Geográfica
              </Label>
              {/* BOTÃO DE GPS ADICIONADO AQUI */}
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-8 text-[11px] text-blue-600 hover:text-blue-700 p-0 gap-1"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                Usar localização atual (GPS)
              </Button>
            </div>

            <Input
              id="helper-coords"
              placeholder="Cole aqui ou use o botão GPS acima"
              value={coordInput}
              onChange={(e) => handleCoordPaste(e.target.value)}
              className="w-full bg-blue-50/30 border-blue-200 focus:border-blue-500"
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat" className="text-xs text-muted-foreground uppercase">Latitude</Label>
                <Input
                  id="lat"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  placeholder="0.0000"
                  className="h-8 text-sm bg-muted/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng" className="text-xs text-muted-foreground uppercase">Longitude</Label>
                <Input
                  id="lng"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  placeholder="0.0000"
                  className="h-8 text-sm bg-muted/20"
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Dica: Clica com o botão direito no local no Google Maps para obter estas coordenadas.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
