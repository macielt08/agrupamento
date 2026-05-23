import { useMemo, useState } from 'react';
import { Movement } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Undo2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatDateForDisplay, formatCurrency, parseValor } from '@/utils/dateUtils';
import { revertTransferMovement, findDuplicatedMovement } from 'zite-endpoints-sdk';
import { toast } from 'sonner';

type TransferenciasViewProps = {
  movements: Movement[];
  userSection?: string;
  isAdmin: boolean;
  isProgramer: boolean;
  onRefresh?: () => void;
};

export default function TransferenciasView({ movements, userSection, isAdmin, isProgramer, onRefresh }: TransferenciasViewProps) {
  const [expandedTransfers, setExpandedTransfers] = useState<Set<number>>(new Set());
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<{ movement: Movement; transferId: number } | null>(null);
  const [reverting, setReverting] = useState(false);

  const filteredTransfers = useMemo(() => {
    const transfers = movements.filter(m => m.tipo === 'Transferencia');
    
    // Filter based on permissions
    if (isProgramer || isAdmin) {
      return transfers;
    }
    
    // Normal users and SubAdmin users only see their section's transfers
    return transfers.filter(t => t.seccaoTransferencia === userSection);
  }, [movements, userSection, isAdmin, isProgramer]);

  const getRelatedMovements = (transferId: number) => {
    return movements.filter(m => m.transferido === transferId);
  };

  const toggleTransfer = (id: number) => {
    const newExpanded = new Set(expandedTransfers);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTransfers(newExpanded);
  };

  const handleRevertClick = (movement: Movement, transferId: number) => {
    setSelectedMovement({ movement, transferId });
    setRevertDialogOpen(true);
  };

  const handleConfirmRevert = async () => {
    if (!selectedMovement) return;

    setReverting(true);
    try {
      const movementValue = parseValor(selectedMovement.movement.valor);
      const transfer = movements.find(m => m.id === selectedMovement.transferId);
      
      // Ensure movementValue is valid
      if (isNaN(movementValue) || movementValue <= 0) {
        toast.error('Valor do movimento inválido');
        return;
      }

      // First, find the duplicated movement
      const duplicatedResult = await findDuplicatedMovement({
        movementId: selectedMovement.movement.id,
        transferId: selectedMovement.transferId,
        seccaoTransferencia: transfer?.seccao || '',
        categoria: selectedMovement.movement.categoria || '',
        subCategoria: selectedMovement.movement.subCategoria || '',
        descricao: selectedMovement.movement.descricao || '',
        valor: selectedMovement.movement.valor || ''
      });

      // Then revert the transfer with the duplicated movement ID if found
      const result = await revertTransferMovement({
        movementId: selectedMovement.movement.id,
        transferId: selectedMovement.transferId,
        movementValue: movementValue,
        duplicatedMovementId: duplicatedResult.found ? duplicatedResult.duplicatedMovementId : undefined
      });

      if (result.success) {
        toast.success(result.message);
        setRevertDialogOpen(false);
        setSelectedMovement(null);
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao reverter movimento';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setReverting(false);
    }
  };

  const totalTransfers = useMemo(() => {
    return filteredTransfers.reduce((sum, transfer) => sum + parseValor(transfer.valor), 0);
  }, [filteredTransfers]);

  const canRevert = isAdmin || isProgramer;

  if (filteredTransfers.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Nenhuma transferência encontrada
      </div>
    );
  }

  return (
    <>
      {/* Revert Loading Overlay */}
      {reverting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg bg-card p-8 shadow-lg border">
            <Undo2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-semibold">A reverter transferência...</p>
            <p className="text-sm text-muted-foreground">Por favor aguarde</p>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Total de Transferências</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              €{formatCurrency(totalTransfers)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredTransfers.length} transferência{filteredTransfers.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredTransfers.map(transfer => {
            const isExpanded = expandedTransfers.has(transfer.id);
            const relatedMovements = getRelatedMovements(transfer.id);

            return (
              <Card key={transfer.id}>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleTransfer(transfer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{transfer.descricao}</CardTitle>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <p className="text-sm text-muted-foreground">
                            {formatDateForDisplay(transfer.data)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            De: {transfer.seccaoTransferencia}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Por: {transfer.utilizador}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xl font-bold text-primary whitespace-nowrap">
                        €{formatCurrency(transfer.valor)}
                      </p>
                      {relatedMovements.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {relatedMovements.length} movimento{relatedMovements.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && relatedMovements.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground mb-3">
                        Movimentos Originais:
                      </p>
                      {relatedMovements.map(movement => (
                        <div 
                          key={movement.id}
                          className="border rounded-lg p-4 bg-muted/20"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{movement.descricao}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                <p className="text-sm text-muted-foreground">
                                  {formatDateForDisplay(movement.data)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Elemento: {movement.elemento}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {movement.categoria} - {movement.subCategoria}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-lg font-bold text-primary whitespace-nowrap">
                                €{formatCurrency(movement.valor)}
                              </p>
                              {canRevert && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevertClick(movement, transfer.id);
                                  }}
                                >
                                  <Undo2 className="h-4 w-4 mr-1" />
                                  Reverter
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <AlertDialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter Transferência</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja reverter este movimento da transferência?
              <br /><br />
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Subtrair €{selectedMovement ? formatCurrency(selectedMovement.movement.valor) : '0'} do valor total da transferência</li>
                <li>Desbloquear o movimento original</li>
                <li>Eliminar o movimento duplicado na outra secção</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRevert}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
