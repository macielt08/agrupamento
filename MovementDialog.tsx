import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Movement, Category } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Lock, Upload, Camera, X } from 'lucide-react';
import { uploadFile } from 'zite-file-upload-sdk';
import { toast } from 'sonner';
import { inputDateToFormattedString, formattedStringToInputDate, parseUserInput, getTodayInputDate } from '@/utils/dateUtils';
import { getElementos, getAtividades, GetElementosOutputType, GetAtividadesOutputType } from 'zite-endpoints-sdk';
import { Permissions } from '@/utils/permissions';

type MovementDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (movement: Partial<Movement>) => void;
  movement?: Movement;
  categories: Category[];
  sections?: string[];
  onCreateCategory: (categoria: string, subCategoria: string, seccao: string) => Promise<void>;
  perms: Permissions;
};

const SECTIONS = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Agrupamento'];

export default function MovementDialog({
  open,
  onClose,
  onSave,
  movement,
  categories,
  onCreateCategory,
  perms
}: MovementDialogProps) {
  const isAdmin = perms.isCA;
  const userSection = perms.userSeccao;
  const [dateString, setDateString] = useState<string>(getTodayInputDate());
  const [formData, setFormData] = useState<Partial<Movement>>(({
    tipo: 'Receita',
    data: '',
    valor: undefined,
    seccao: isAdmin ? '' : (userSection || ''),
    categoria: '',
    subCategoria: '',
    descricao: '',
    tipoPagamento: '',
    entregueTesouraria: 'Não',
    pendenteSeccao: 'Não',
    elemento: '',
    atividade: ''
  }) as any);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [addElemento, setAddElemento] = useState(false);
  const [elementos, setElementos] = useState<GetElementosOutputType['records']>([]);
  const [atividades, setAtividades] = useState<GetAtividadesOutputType['atividades']>([]);
  const [loadingElementos, setLoadingElementos] = useState(false);

  useEffect(() => {
    if (movement) {
      setFormData(movement as any);
      // Convert DD/MM/YYYY to YYYY-MM-DD for input field
      setDateString(formattedStringToInputDate(movement.data) || getTodayInputDate());
      // Set checkbox based on existing data
      setAddElemento(!!(movement as any).elemento);
    } else {
      // Reset to defaults when creating new movement
      setDateString(getTodayInputDate());
      setFormData({
        tipo: 'Receita',
        data: '',
        valor: undefined,
        seccao: isAdmin ? '' : (userSection || ''),
        categoria: '',
        subCategoria: '',
        descricao: '',
        tipoPagamento: '',
        entregueTesouraria: 'Não',
        pendenteSeccao: 'Não',
        elemento: '',
        atividade: ''
      } as any);
      setAddElemento(false);
    }
  }, [movement, open, isAdmin, userSection, perms]);

  // Load elementos when checkbox is checked or section changes
  useEffect(() => {
    if (addElemento && formData.seccao) {
      loadElementosData();
    }
  }, [addElemento, formData.seccao]);

  // Load atividades when categoria is "Atividades"
  useEffect(() => {
    if (formData.categoria === 'Atividades' && formData.seccao) {
      loadAtividadesData();
    }
  }, [formData.seccao, formData.categoria]);

  const loadElementosData = async () => {
    setLoadingElementos(true);
    try {
      const data = await getElementos({});
      setElementos(data.records);
    } catch (error) {
      toast.error('Erro ao carregar elementos');
      console.error(error);
    } finally {
      setLoadingElementos(false);
    }
  };

  const loadAtividadesData = async () => {
    try {
      const data = await getAtividades({});
      setAtividades(data.atividades);
    } catch (error) {
      toast.error('Erro ao carregar atividades');
      console.error(error);
    }
  };

  const handleSubmit = () => {
    // Convert valor to number for backend storage
    const normalizedValor = parseUserInput(formData.valor);

    // Remove the old 'data' property from formData to avoid conflicts
    const { data: _, ...restFormData } = formData;

    // Convert dateString (YYYY-MM-DD) to formatted string (DD/MM/YYYY)
    const formattedDate = inputDateToFormattedString(dateString);

    // Set atividade based on categoria
    const atividadeValue = formData.categoria === 'Atividades' ? (formData.subCategoria || '') : '';

    // Always include elemento and atividade fields
    const finalData = {
      ...restFormData,
      elemento: addElemento ? (formData.elemento || '') : '',
      atividade: atividadeValue,
      valor: normalizedValor as any,
      data: formattedDate as any // Send formatted date string (cast to any for type compatibility)
    };

    onSave(finalData);
    onClose();
  };

  const handleCreateNewCategory = async () => {
    if (newCategoryName && formData.seccao) {
      await onCreateCategory(newCategoryName, newSubcategoryName, formData.seccao);
      setFormData({
        ...formData,
        categoria: newCategoryName,
        subCategoria: newSubcategoryName
      });
      setNewCategoryName('');
      setNewSubcategoryName('');
      setShowNewCategory(false);
    }
  };

  const handleCreateNewSubcategory = async () => {
    if (formData.categoria && newSubcategoryName && formData.seccao) {
      await onCreateCategory(formData.categoria, newSubcategoryName, formData.seccao);
      setFormData({
        ...formData,
        subCategoria: newSubcategoryName
      });
      setNewSubcategoryName('');
      setShowNewSubcategory(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      // Generate unique filename for camera captures
      let filename = file.name;
      
      // Check if it's a camera capture (typically has generic names or blob URLs)
      const isCameraCapture = file.name.startsWith('image') || 
                              file.name.includes('tmp') || 
                              file.name.includes('camera') ||
                              !file.name.includes('.');
      
      if (isCameraCapture || e.target.accept === 'image/*') {
        // Generate descriptive filename: movimento_YYYYMMDD_HHMMSS.jpg
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // Get file extension from mime type or original filename
        let extension = 'jpg';
        if (file.type) {
          extension = file.type.split('/')[1] || 'jpg';
        } else if (file.name.includes('.')) {
          extension = file.name.split('.').pop() || 'jpg';
        }
        
        filename = `movimento_${year}${month}${day}_${hours}${minutes}${seconds}.${extension}`;
      }
      
      const {
        fileUrl
      } = await uploadFile({
        data: file,
        filename: filename
      });
      setFormData({
        ...formData,
        foto: fileUrl
      });
      toast.success('Ficheiro carregado com sucesso');
    } catch (error) {
      toast.error('Erro ao carregar ficheiro');
      console.error(error);
    } finally {
      setUploadingFile(false);
    }
  };

  const removePhoto = () => {
    setFormData({
      ...formData,
      foto: ''
    });
  };

  // Filter categories based on user role
  // Admin users: filter by selected section in dropdown
  // Non-admin users: filter by their assigned section
  const sectionToFilter = isAdmin ? formData.seccao : userSection;
  const filteredCategories = categories.filter(c => c.seccao === sectionToFilter);
  const uniqueCategories = Array.from(new Set(filteredCategories.map(c => c.categoria).filter(Boolean)));
  
  // Filter subcategories by selected categoria
  const filteredSubcategories = filteredCategories.filter(c => c.categoria === formData.categoria);
  const uniqueSubcategories = Array.from(new Set(filteredSubcategories.map(c => c.subCategoria).filter(Boolean)));

  // Filter elementos and atividades by section
  const filteredElementos = elementos.filter(e => {
    // Validações de existência
    const isValid = e.estado !== 'DELETED' && e.nome && e.nome.trim() !== '';
    if (!isValid) return false;

    // Critério 1: O elemento pertence à secção selecionada (Lobitos, Exploradores, etc)
    const pertenceASeccao = e.seccao === formData.seccao;

    // Critério 2: É um Dirigente e está alocado a essa secção
    const eDirigenteDaSeccao = e.categoria === formData.seccao && e.seccao === 'Dirigentes';

    // Se a secção for Agrupamento, talvez queiras ver todos os Dirigentes de todas as secções
    const eDirigenteGeral = formData.seccao === 'Dirigentes';

    return pertenceASeccao || eDirigenteDaSeccao || eDirigenteGeral;
  });
  
  // Filter atividades by section (include selected section + Agrupamento)
  const filteredAtividades = atividades.filter(a => 
    (a.seccao === formData.seccao || a.seccao === 'Agrupamento') && 
    a.nome !== 'DELETED' &&
    a.nome && 
    a.nome.trim() !== ''
  );

  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{movement ? 'Editar Movimento' : 'Novo Movimento'}</DialogTitle>
          <DialogDescription>
            {movement ? 'Edite os detalhes do movimento financeiro.' : 'Crie um novo movimento financeiro preenchendo os campos abaixo.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.tipo} onValueChange={v => setFormData({
              ...formData,
              tipo: v
            })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Pagamento">Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={dateString} onChange={e => setDateString(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={formData.descricao} onChange={e => setFormData({
            ...formData,
            descricao: e.target.value
          })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (€)</Label>
              <Input type="text" inputMode="decimal" value={formData.valor ?? ''} onChange={e => setFormData({
              ...formData,
              valor: e.target.value as any
            })} placeholder="0,00 ou 0.00" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pagamento</Label>
              <Select value={formData.tipoPagamento} onValueChange={v => setFormData({
              ...formData,
              tipoPagamento: v
            })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-2">
              <Label>Secção *</Label>
              <Select value={formData.seccao} onValueChange={v => setFormData({
                ...formData,
                seccao: v,
                categoria: '',
                subCategoria: '',
                elemento: '',
                atividade: ''
              })} disabled={!isAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma secção" />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin ? (
                    SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                  ) : (
                    userSection && <SelectItem value={userSection}>{userSection}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!isAdmin && <p className="text-xs text-muted-foreground">A sua secção é atribuída automaticamente</p>}
            </div>
            <div className="space-y-2 pt-7">
              <div className="flex items-center space-x-2">
                <Checkbox id="movAgrupamento" checked={formData.movAgrupamento === 'Sim'} onCheckedChange={checked => setFormData({
                ...formData,
                movAgrupamento: checked ? 'Sim' : 'Não'
              })} />
                <Label htmlFor="movAgrupamento" className="cursor-pointer whitespace-nowrap">Mov. Agrupamento</Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData.categoria} onValueChange={v => setFormData({
              ...formData,
              categoria: v,
              subCategoria: ''
            })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCategories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subcategoria *</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewSubcategory(!showNewSubcategory)} disabled={!formData.categoria || !formData.seccao || formData.categoria === 'Atividades'}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {showNewSubcategory ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Nova subcategoria"
                    value={newSubcategoryName}
                    onChange={e => setNewSubcategoryName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateNewSubcategory}>
                      Criar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewSubcategory(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Select
                  value={formData.subCategoria}
                  onValueChange={v =>
                    setFormData({
                      ...formData,
                      subCategoria: v
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.categoria === 'Atividades'
                      ? filteredAtividades.map(a => (
                          <SelectItem key={a.id} value={a.nome!}>
                            {a.nome}
                          </SelectItem>
                        ))
                      : uniqueSubcategories.map(sc => (
                          <SelectItem key={sc} value={sc!}>
                            {sc}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Elemento Section */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="addElemento" 
                checked={addElemento} 
                onCheckedChange={checked => {
                  setAddElemento(!!checked);
                  if (!checked) {
                    setFormData({ ...formData, elemento: '' });
                  }
                }}
                disabled={!formData.seccao}
              />
              <Label htmlFor="addElemento" className="cursor-pointer">Adicionar Elemento</Label>
            </div>
            {addElemento && (
              <div className="ml-6">
                <Select 
                  value={(formData as any).elemento || ''} 
                  onValueChange={v => setFormData({ ...formData, elemento: v } as any)}
                  disabled={loadingElementos || !formData.seccao}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingElementos ? "A carregar..." : "Selecione um elemento"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredElementos.map(e => (
                      <SelectItem key={e.id} value={e.nome!}>
                        <div className="flex items-center justify-between w-full min-w-[200px] gap-2">
                          <span>{e.nome}</span>
                          {e.seccao === 'Dirigentes' && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold uppercase border border-blue-200">
                              Dirigente
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Foto/Documento</Label>
            <div className="flex flex-col gap-3">
              {formData.foto ? <div className="relative border rounded-lg p-3 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <a href={formData.foto} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                      Ver ficheiro
                    </a>
                    <Button type="button" size="sm" variant="ghost" onClick={removePhoto}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div> : <div className="flex gap-2">
                  {/* Desktop: File upload */}
                  <div className="hidden md:block flex-1">
                    <Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} disabled={uploadingFile} className="cursor-pointer" />
                  </div>
                  {/* Mobile: Camera + File upload */}
                  <div className="md:hidden flex gap-2 w-full">
                    <label className="flex-1">
                      <Input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" id="camera-input" />
                      <Button type="button" variant="outline" className="w-full" disabled={uploadingFile} onClick={() => document.getElementById('camera-input')?.click()}>
                        <Camera className="h-4 w-4 mr-2" />
                        Câmara
                      </Button>
                    </label>
                    <label className="flex-1">
                      <Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" id="file-input" />
                      <Button type="button" variant="outline" className="w-full" disabled={uploadingFile} onClick={() => document.getElementById('file-input')?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Ficheiro
                      </Button>
                    </label>
                  </div>
                </div>}
              {uploadingFile && <p className="text-sm text-muted-foreground">A carregar ficheiro...</p>}
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox id="entregue" checked={formData.entregueTesouraria === 'Sim'} onCheckedChange={checked => {
              if (checked) {
                setFormData({
                  ...formData,
                  entregueTesouraria: 'Sim',
                  pendenteSeccao: 'Não'
                });
              } else {
                setFormData({
                  ...formData,
                  entregueTesouraria: 'Não'
                });
              }
            }} />
              <Label htmlFor="entregue" className="cursor-pointer">Entregue à Tesouraria</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="pendente" checked={formData.pendenteSeccao === 'Sim'} onCheckedChange={checked => {
              if (checked) {
                setFormData({
                  ...formData,
                  pendenteSeccao: 'Sim',
                  entregueTesouraria: 'Não'
                });
              } else {
                setFormData({
                  ...formData,
                  pendenteSeccao: 'Não'
                });
              }
            }} />
              <Label htmlFor="pendente" className="cursor-pointer">Pendente na Secção</Label>
            </div>
          </div>

          {movement && isAdmin && <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
              <Checkbox id="bloqueado" checked={formData.bloqueado === 'Sim'} onCheckedChange={checked => setFormData({
            ...formData,
            bloqueado: checked ? 'Sim' : 'Não'
          })} />
              <Label htmlFor="bloqueado" className="cursor-pointer font-semibold">
                <Lock className="h-4 w-4 inline mr-1" />
                Bloquear Movimento
              </Label>
            </div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!formData.seccao || !formData.categoria || !formData.subCategoria}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}
