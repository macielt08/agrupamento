import { useMemo, useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Lock, CheckCircle, Clock, TrendingUp, TrendingDown, ArrowLeftRight, Paperclip, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, List, LayoutList } from 'lucide-react';
import { Movement } from '@/types';
import { toast } from 'sonner';
import { Permissions } from '@/utils/permissions';
import { formatCurrency, formatDateForDisplay } from '@/utils/dateUtils';
import FilePreviewDialog from '@/components/FilePreviewDialog';

type MovementsTableProps = {
  movements: Movement[];
  onEdit: (movement: Movement) => void;
  onDelete: (id: number) => void;
  perms: Permissions;
  multiSelectMode?: boolean;
  selectedMovements?: Set<number>;
  onSelectionChange?: (selected: Set<number>) => void;
};

export default function MovementsTable({ movements, onEdit, onDelete, perms, multiSelectMode = false, selectedMovements = new Set(), onSelectionChange }: MovementsTableProps) {
  const isAdmin = perms.isCA;
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [compactView, setCompactView] = useState(() => {
    const saved = localStorage.getItem('movements_compact_view');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('movements_compact_view', compactView.toString());
  }, [compactView]);

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => {
      const getTime = (dateValue: any) => {
        if (!dateValue) return 0;
        if (dateValue instanceof Date) return dateValue.getTime();
        const s = String(dateValue).trim();
        
        const ptMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ptMatch) {
          const [, d, m, y] = ptMatch.map(Number);
          return new Date(y, m - 1, d).getTime();
        }

        const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          const [, y, m, d] = isoMatch.map(Number);
          return new Date(y, m - 1, d).getTime();
        }

        const timestamp = Date.parse(s);
        return isNaN(timestamp) ? 0 : timestamp;
      };

      const timeA = getTime(a.data);
      const timeB = getTime(b.data);

      // Se as datas forem diferentes, ordena pela direção escolhida
      if (timeA !== timeB) {
        return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
      }

      // Se as datas forem iguais, desempata pelo ID (sempre acompanhando a lógica da data)
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return sortDirection === 'desc' ? idB - idA : idA - idB;
    });
  }, [movements, sortDirection]); // Adicionado sortDirection às dependências

  // Pagination calculations
  const totalItems = sortedMovements.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedMovements = sortedMovements.slice(startIndex, endIndex);

  // Reset to page 1 when items per page changes or movements change
  useMemo(() => {
    setCurrentPage(1);
  }, [itemsPerPage, movements.length]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
  };

  const isLocked = (movement: Movement) => {
    return movement.bloqueado === 'Sim';
  };

  const isTransfer = (movement: Movement) => {
    return movement.tipo === 'Transferencia';
  };

  const isDeliveredToTreasury = (movement: Movement) => {
    return movement.entregueTesouraria === 'Sim';
  };

  const canEdit = (movement: Movement) => {
    if (isTransfer(movement)) return false;
    if (isAdmin && movement.pendenteSeccao === 'Sim') return false;
    if (isLocked(movement) && isDeliveredToTreasury(movement)) {
      return isAdmin;
    }
    if (isLocked(movement)) {
      return isAdmin;
    }
    return true;
  };

  const canDelete = (movement: Movement) => {
    if (isTransfer(movement)) return false;
    if (isAdmin && movement.pendenteSeccao === 'Sim') return false;
    if (isDeliveredToTreasury(movement)) {
      return false;
    }
    if (isLocked(movement)) {
      return isAdmin;
    }
    return true;
  };

  const getStatusIcon = (movement: Movement) => {
    if (movement.entregueTesouraria === 'Sim') {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    if (movement.pendenteSeccao === 'Sim') {
      return <Clock className="h-4 w-4 text-orange-600" />;
    }
    return null;
  };

  const getTipoIcon = (movement: Movement) => {
    if (movement.tipo === 'Transferencia') {
      return <ArrowLeftRight className="h-4 w-4 text-info" />;
    }
    if (movement.tipo === 'Receita') {
      return <TrendingUp className="h-4 w-4 text-success" />;
    }
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const isMovementSelectable = (movement: Movement) => {
    return movement.pendenteSeccao !== 'Sim' && 
           movement.entregueTesouraria !== 'Sim' && 
           movement.bloqueado !== 'Sim';
  };

  const handleToggleSelection = (id: number) => {
    if (!onSelectionChange) return;
    
    const movement = movements.find(m => m.id === id);
    if (!movement) return;

    const newSelected = new Set(selectedMovements);
    
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (newSelected.size > 0) {
        const firstSelectedId = Array.from(newSelected)[0];
        const firstSelectedMovement = movements.find(m => m.id === firstSelectedId);
        
        if (firstSelectedMovement && firstSelectedMovement.subCategoria !== movement.subCategoria) {
          toast.error('Não é permitido selecionar movimentos com SubCategorias diferentes');
          return;
        }
      }
      
      newSelected.add(id);
    }
    
    onSelectionChange(newSelected);
  };

  const handleFilePreview = (fileUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewFileUrl(fileUrl);
  };

  const handleDeleteClick = (id: number) => {
    const movement = movements.find(m => m.id === id);
    
    if (movement && isDeliveredToTreasury(movement)) {
      toast.error('Movimentos entregues à tesouraria não podem ser eliminados');
      return;
    }
    
    setMovementToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (movementToDelete !== null) {
      onDelete(movementToDelete);
    }
    setDeleteDialogOpen(false);
    setMovementToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setMovementToDelete(null);
  };

  if (sortedMovements.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Nenhum movimento encontrado
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="border rounded-lg">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {multiSelectMode && <TableHead className="w-10"></TableHead>}
                  <TableHead className="w-10"></TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  >
                    <div className="flex items-center gap-2">
                      Data
                      {sortDirection === 'desc' ? (
                        <TrendingDown className="h-4 w-4 text-primary" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Elemento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Secção</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>SubCategoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    {multiSelectMode && (
                      <TableCell>
                        <Checkbox
                          checked={selectedMovements.has(movement.id)}
                          onCheckedChange={() => handleToggleSelection(movement.id)}
                          disabled={!isMovementSelectable(movement)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {getTipoIcon(movement)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        {isLocked(movement) && (
                          <Lock className="h-4 w-4 text-muted-foreground mt-1" />
                        )}
                        <div className="flex flex-col">
                          <span>
                            {/* Usar APENAS a função utilitária atualizada */}
                            {formatDateForDisplay(movement.data)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {movement.utilizador}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{movement.elemento}</TableCell>
                    <TableCell>{movement.descricao}</TableCell>
                    <TableCell>{movement.seccao}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {movement.foto && (
                          <button
                            onClick={(e) => handleFilePreview(movement.foto!, e)}
                            className="text-primary hover:text-primary/80 transition-colors"
                            title="Ver ficheiro anexado"
                          >
                            <Paperclip className="h-4 w-4" />
                          </button>
                        )}
                        <span>{movement.categoria}</span>
                      </div>
                    </TableCell>
                    <TableCell>{movement.subCategoria}</TableCell>
                    <TableCell className={movement.tipo === 'Receita' ? 'text-success' : 'text-destructive'}>
                      €{formatCurrency(movement.valor)}
                    </TableCell>
                    <TableCell>
                      {getStatusIcon(movement)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(movement)}
                          disabled={!canEdit(movement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(movement.id)}
                          disabled={!canDelete(movement)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y">
            {/* Mobile View Toggle */}
            <div className="p-3 bg-muted/30 flex items-center justify-between">
              <span className="text-sm font-medium">Vista:</span>
              <div className="flex gap-1">
                <Button
                  variant={!compactView ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCompactView(false)}
                  className="h-8 px-3"
                >
                  <LayoutList className="h-4 w-4 mr-1" />
                  Completa
                </Button>
                <Button
                  variant={compactView ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCompactView(true)}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4 mr-1" />
                  Resumida
                </Button>
              </div>
            </div>

            {paginatedMovements.map((movement) => (
              compactView ? (
                // Compact View
                <div key={movement.id} className="p-3 flex items-center justify-between gap-3" onClick={() => onEdit(movement)}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getTipoIcon(movement)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isLocked(movement) && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                        <span className="text-xs text-muted-foreground">{formatDateForDisplay(movement.data)} | {movement.elemento}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{movement.descricao}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusIcon(movement)}
                    <span className={`text-sm font-semibold ${movement.tipo === 'Receita' ? 'text-success' : 'text-destructive'}`}>
                      €{formatCurrency(movement.valor)}
                    </span>
                  </div>
                </div>
              ) : (
                // Full View
                <div key={movement.id} className="p-4 space-y-3">
                {multiSelectMode && (
                  <div className="flex items-center mb-2">
                    <Checkbox
                      checked={selectedMovements.has(movement.id)}
                      onCheckedChange={() => handleToggleSelection(movement.id)}
                      disabled={!isMovementSelectable(movement)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">Selecionar</span>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTipoIcon(movement)}
                    <div>
                      <div className="flex items-center gap-2">
                        {isLocked(movement) && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {formatDateForDisplay(movement.data)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {movement.utilizador}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {movement.seccao}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(movement)}
                    <span className={`text-lg font-semibold ${movement.tipo === 'Receita' ? 'text-success' : 'text-destructive'}`}>
                      €{formatCurrency(movement.valor)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-sm">Descrição: {movement.descricao}</p>
                  <p className="text-xs text-muted-foreground mt-1">Elemento: {movement.elemento}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    {movement.foto && (
                      <button
                        onClick={(e) => handleFilePreview(movement.foto!, e)}
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="Ver ficheiro anexado"
                      >
                        <Paperclip className="h-3 w-3" />
                      </button>
                    )}
                    <span>Categoria: {movement.categoria}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">SubCategoria: {movement.subCategoria}</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(movement)}
                    disabled={!canEdit(movement)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClick(movement.id)}
                    disabled={!canDelete(movement)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
              )
            ))}
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Registos por página:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{endIndex} de {totalItems} registos
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              title="Primeira página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza que deseja eliminar este movimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O movimento será marcado como eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilePreviewDialog
        open={previewFileUrl !== null}
        onClose={() => setPreviewFileUrl(null)}
        fileUrl={previewFileUrl || ''}
      />
    </>
  );
}
