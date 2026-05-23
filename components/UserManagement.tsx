import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Check, X, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Permissions } from '@/utils/permissions';

type User = {
  id: number;
  nome?: string;
  pin?: number;
  email?: string;
  seccao?: string;
  admin?: string;
  subAdmin?: string;
  programer?: string;
  categoria?: string;
  estado?: string;
  menuFinancas?: string;
  menuElemento?: string;
  menuSpp?: string;
  menuAtividades?: string;
  menuNoitesCampo?: string;
  menuInventario?: string;
  menuAdmin?: string;
  ca?: number;
  caa?: number;
  ta?: number;
  tas?: number;
  cu?: number;
  dirigente?: number;
  escuteiro?: number;
};

type UserManagementProps = {
  users: User[];
  perms: Permissions;
  onRefresh: () => void;
  onUpdateUser: (id: number, userData: Partial<User>) => Promise<void>;
  onCreateUser: (userData: Omit<User, 'id'>) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
};

const ALL_SECTIONS = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros', 'Agrupamento'];

export default function UserManagement({ users, perms, onRefresh, onUpdateUser, onCreateUser, onDeleteUser }: UserManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // If section-only admin, lock the available sections to their own
  const availableSections = perms.isAdminSectionOnly
    ? ALL_SECTIONS.filter(s => s === perms.userSeccao)
    : ALL_SECTIONS;

  const [formData, setFormData] = useState({
    nome: '', pin: '', email: '',
    seccao: perms.isAdminSectionOnly ? perms.userSeccao : '',
    programer: false,
    menuFinancas: false, menuElemento: false, menuSpp: false,
    menuAtividades: false, menuNoitesCampo: false,
    menuInventario: false, menuAdmin: false,
    estado: 'Inativo',
    ca: false, caa: false, ta: false, ts: false, cu: false, dirigente: false, escuteiro: false,
  });

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const isNotDeleted = user.nome !== 'DELETED';
      // Section-only admin sees only their section
      const sectionAllowed = perms.isAdminSectionOnly
        ? user.seccao === perms.userSeccao
        : filterSection === 'all' || user.seccao === filterSection;
      const matchesSearch =
        (user.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      return isNotDeleted && sectionAllowed && matchesSearch;
    });
  }, [users, filterSection, searchTerm, perms]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
    toast.info('Lista atualizada');
  };

  const handleEdit = (user: User) => {
    // Section-only admin cannot edit users from other sections
    if (perms.isAdminSectionOnly && user.seccao !== perms.userSeccao) {
      toast.error('Não tem permissão para editar utilizadores de outras secções');
      return;
    }
    setEditingUser(user);
    setFormData({
      nome: user.nome || '',
      pin: user.pin?.toString() || '',
      email: user.email || '',
      seccao: user.seccao || '',
      programer: user.programer === 'Sim',
      menuFinancas: user.menuFinancas === 'Sim',
      menuElemento: user.menuElemento === 'Sim',
      menuSpp: user.menuSpp === 'Sim',
      menuAtividades: user.menuAtividades === 'Sim',
      menuNoitesCampo: user.menuNoitesCampo === 'Sim',
      menuInventario: user.menuInventario === 'Sim',
      menuAdmin: user.menuAdmin === 'Sim',
      estado: user.estado || 'Inativo',
      ca: (user.ca ?? 0) > 0,
      caa: (user.caa ?? 0) > 0,
      ta: (user.ta ?? 0) > 0,
      ts: (user.tas ?? 0) > 0,
      cu: (user.cu ?? 0) > 0,
      dirigente: (user.dirigente ?? 0) > 0,
      escuteiro: (user.escuteiro ?? 0) > 0,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingUser(null);
    setFormData({
      nome: '', pin: '', email: '',
      seccao: perms.isAdminSectionOnly ? perms.userSeccao : '',
      programer: false,
      menuFinancas: false, menuElemento: false, menuSpp: false,
      menuAtividades: false, menuNoitesCampo: false,
      menuInventario: false, menuAdmin: false,
      estado: 'Inativo',
      ca: false, caa: false, ta: false, ts: false, cu: false, dirigente: false, escuteiro: false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.pin || !formData.seccao) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    // Section-only admin can only save users in their section
    if (perms.isAdminSectionOnly && formData.seccao !== perms.userSeccao) {
      toast.error('Só pode gerir utilizadores da sua secção');
      return;
    }
    try {
      const userData = {
        nome: formData.nome,
        pin: parseInt(formData.pin),
        email: formData.email,
        seccao: formData.seccao,
        programer: formData.programer ? 'Sim' : 'Não',
        menuFinancas: formData.menuFinancas ? 'Sim' : 'Não',
        menuElemento: formData.menuElemento ? 'Sim' : 'Não',
        menuSpp: formData.menuSpp ? 'Sim' : 'Não',
        menuAtividades: formData.menuAtividades ? 'Sim' : 'Não',
        menuNoitesCampo: formData.menuNoitesCampo ? 'Sim' : 'Não',
        menuInventario: formData.menuInventario ? 'Sim' : 'Não',
        menuAdmin: formData.menuAdmin ? 'Sim' : 'Não',
        estado: formData.estado,
        ca: formData.ca ? 1 : 0,
        caa: formData.caa ? 1 : 0,
        ta: formData.ta ? 1 : 0,
        tas: formData.ts ? 1 : 0,
        cu: formData.cu ? 1 : 0,
        dirigente: formData.dirigente ? 1 : 0,
        escuteiro: formData.escuteiro ? 1 : 0,
      };

      if (editingUser) {
        await onUpdateUser(editingUser.id, userData);
        toast.success('Utilizador atualizado');
      } else {
        await onCreateUser(userData);
        toast.success('Utilizador criado');
      }
      setDialogOpen(false);
      onRefresh();
    } catch (error) {
      toast.error('Erro ao guardar');
    }
  };

  const handleDelete = async (user: User) => {
    if (perms.isAdminSectionOnly && user.seccao !== perms.userSeccao) {
      toast.error('Não tem permissão para eliminar utilizadores de outras secções');
      return;
    }
    if (!confirm('Eliminar utilizador?')) return;
    try {
      await onDeleteUser(user.id);
      toast.success('Eliminado');
      onRefresh();
    } catch (error) {
      toast.error('Erro ao eliminar');
    }
  };

  const CheckIcon = ({ value }: { value?: string }) => (
    value === 'Sim'
      ? <Check className="h-4 w-4 text-green-600 mx-auto" />
      : <X className="h-4 w-4 text-muted-foreground mx-auto" />
  );

  const NumCell = ({ value }: { value?: number }) => (
    (value != null && value !== 0)
      ? <Check className="h-4 w-4 text-green-600 mx-auto" />
      : <X className="h-4 w-4 text-muted-foreground mx-auto" />
  );

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">Gestão de Utilizadores</h2>
          {perms.isAdminSectionOnly && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              {perms.userSeccao}
            </Badge>
          )}
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Utilizador
        </Button>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-card p-4 border rounded-lg shadow-sm">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar nome ou email..."
            className="pl-9 pr-9"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Section filter only shown to full admins */}
        {!perms.isAdminSectionOnly && (
          <Select value={filterSection} onValueChange={(val) => { setFilterSection(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Secção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Secções</SelectItem>
              {ALL_SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="shrink-0">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
          <CardTitle className="text-sm font-medium">
            {filteredUsers.length} resultados encontrados
          </CardTitle>
          <div className="text-xs text-muted-foreground uppercase">
            Página {currentPage} de {totalPages || 1}
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Secção</TableHead>
                  <TableHead className="text-center">CA</TableHead>
                  <TableHead className="text-center">CAA</TableHead>
                  <TableHead className="text-center">TA</TableHead>
                  <TableHead className="text-center">TS</TableHead>
                  <TableHead className="text-center">CU</TableHead>
                  <TableHead className="text-center">Dirig.</TableHead>
                  <TableHead className="text-center">Scout</TableHead>
                  <TableHead className="text-center">Prog</TableHead>
                  <TableHead className="text-center">Finanças</TableHead>
                  <TableHead className="text-center">Elem.</TableHead>
                  <TableHead className="text-center">SPP</TableHead>
                  <TableHead className="text-center">Ativid.</TableHead>
                  <TableHead className="text-center">Noites</TableHead>
                  <TableHead className="text-center">Inven.</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium whitespace-nowrap">{user.nome}</TableCell>
                      <TableCell>{user.seccao}</TableCell>
                      <TableCell><NumCell value={user.ca} /></TableCell>
                      <TableCell><NumCell value={user.caa} /></TableCell>
                      <TableCell><NumCell value={user.ta} /></TableCell>
                      <TableCell><NumCell value={user.tas} /></TableCell>
                      <TableCell><NumCell value={user.cu} /></TableCell>
                      <TableCell><NumCell value={user.dirigente} /></TableCell>
                      <TableCell><NumCell value={user.escuteiro} /></TableCell>
                      <TableCell><CheckIcon value={user.programer} /></TableCell>
                      <TableCell><CheckIcon value={user.menuFinancas} /></TableCell>
                      <TableCell><CheckIcon value={user.menuElemento} /></TableCell>
                      <TableCell><CheckIcon value={user.menuSpp} /></TableCell>
                      <TableCell><CheckIcon value={user.menuAtividades} /></TableCell>
                      <TableCell><CheckIcon value={user.menuNoitesCampo} /></TableCell>
                      <TableCell><CheckIcon value={user.menuInventario} /></TableCell>
                      <TableCell><CheckIcon value={user.menuAdmin} /></TableCell>
                      <TableCell>{user.estado}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(user)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={19} className="h-32 text-center text-muted-foreground italic">
                      Nenhum utilizador encontrado com os critérios selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-4">
            {paginatedUsers.map((user) => (
              <div key={user.id} className="p-4 border rounded-lg bg-card space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{user.nome}</h3>
                    <p className="text-xs text-muted-foreground">{user.seccao} • {user.estado}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(user)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t mt-6 gap-4">
            <span className="text-sm text-muted-foreground">
              Mostrando {paginatedUsers.length} de {filteredUsers.length} utilizadores
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline" size="sm"
                onClick={() => { setCurrentPage(p => Math.max(p - 1, 1)); window.scrollTo(0, 0); }}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm font-medium">{currentPage} / {totalPages || 1}</span>
              <Button
                variant="outline" size="sm"
                onClick={() => { setCurrentPage(p => Math.min(p + 1, totalPages)); window.scrollTo(0, 0); }}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Utilizador' : 'Novo Utilizador'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Atualize as informações do utilizador.'
                : 'Preencha os dados para criar um novo utilizador.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>PIN *</Label>
                <Input type="number" value={formData.pin} onChange={(e) => setFormData({ ...formData, pin: e.target.value })} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Secção *</Label>
                {perms.isAdminSectionOnly ? (
                  <Input value={perms.userSeccao} disabled />
                ) : (
                  <Select value={formData.seccao} onValueChange={(v) => setFormData({ ...formData, seccao: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableSections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permissões de Administração */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-sm">Permissões de Administração</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Role checkboxes — only full admins can assign these */}
                {perms.isAdminFullAccess && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formData.ca} onCheckedChange={(c) => setFormData({ ...formData, ca: !!c })} />
                      <span className="text-sm">Chefe Agrupamento</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formData.caa} onCheckedChange={(c) => setFormData({ ...formData, caa: !!c })} />
                      <span className="text-sm">Chefe Agr. Adjunto</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formData.ta} onCheckedChange={(c) => setFormData({ ...formData, ta: !!c })} />
                      <span className="text-sm">Tesoureiro Agrupamento</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formData.ts} onCheckedChange={(c) => setFormData({ ...formData, ts: !!c })} />
                      <span className="text-sm">Tesoureiro Seção</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formData.cu} onCheckedChange={(c) => setFormData({ ...formData, cu: !!c })} />
                      <span className="text-sm">Chefe Unidade</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formData.dirigente} onCheckedChange={(c) => setFormData({ ...formData, dirigente: !!c })} />
                      <span className="text-sm">Dirigente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formData.escuteiro} onCheckedChange={(c) => setFormData({ ...formData, escuteiro: !!c })} />
                      <span className="text-sm">Escuteiro</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={formData.programer} onCheckedChange={(c) => setFormData({ ...formData, programer: !!c })} />
                      <span className="text-sm">Programer</span>
                    </label>
                  </>
                )}
                {/* Menu Admin — full admins can assign to anyone; section admins cannot assign this */}
                {perms.isAdminFullAccess && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={formData.menuAdmin} onCheckedChange={(c) => setFormData({ ...formData, menuAdmin: !!c })} />
                    <span className="text-sm">Menu Admin</span>
                  </label>
                )}
              </div>
            </div>

            {/* Acesso aos Menus */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-sm">Acesso aos Menus</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formData.menuFinancas} onCheckedChange={(c) => setFormData({ ...formData, menuFinancas: !!c })} />
                  <span className="text-sm">Finanças</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formData.menuElemento} onCheckedChange={(c) => setFormData({ ...formData, menuElemento: !!c })} />
                  <span className="text-sm">Elemento</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formData.menuSpp} onCheckedChange={(c) => setFormData({ ...formData, menuSpp: !!c })} />
                  <span className="text-sm">SPP</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formData.menuAtividades} onCheckedChange={(c) => setFormData({ ...formData, menuAtividades: !!c })} />
                  <span className="text-sm">Atividades</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formData.menuNoitesCampo} onCheckedChange={(c) => setFormData({ ...formData, menuNoitesCampo: !!c })} />
                  <span className="text-sm">Noites Campo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formData.menuInventario} onCheckedChange={(c) => setFormData({ ...formData, menuInventario: !!c })} />
                  <span className="text-sm">Inventario</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
