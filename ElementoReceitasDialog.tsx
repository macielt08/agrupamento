import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { GetNMovimentosOutputType } from 'zite-endpoints-sdk';
import { formatDateForDisplay } from '@/utils/dateUtils';

type NMovimento = GetNMovimentosOutputType['records'][0];

type ElementoReceitasDialogProps = {
  open: boolean;
  onClose: () => void;
  elementoNome: string;
  movimentos: NMovimento[];
  loading: boolean;
};

const formatDate = (dateValue?: any): string => {
  if (!dateValue) return '-';
  return formatDateForDisplay(dateValue);
};

const formatValor = (valor?: string | number): string => {
  if (!valor) return '0,00 €';
  const num = typeof valor === 'string' ? parseFloat(valor) : valor;
  return `${num.toFixed(2).replace('.', ',')} €`;
};

export default function ElementoReceitasDialog({
  open,
  onClose,
  elementoNome,
  movimentos,
  loading
}: ElementoReceitasDialogProps) {
  const totalReceitas = useMemo(() => {
    return (movimentos || []).reduce((sum, m) => {
      const valor = typeof m.valor === 'string' ? parseFloat(m.valor) : (m.valor || 0);
      return sum + valor;
    }, 0);
  }, [movimentos]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Receitas - {elementoNome}</DialogTitle>
          <DialogDescription>
            Visualize todas as receitas associadas a este elemento.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (movimentos || []).length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            Nenhuma receita encontrada para este elemento
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Tipo Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movimentos || []).map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.data)}</TableCell>
                      <TableCell>{m.categoria || '-'}</TableCell>
                      <TableCell>{m.atividade || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatValor(m.valor)}</TableCell>
                      <TableCell>{m.tipoPagamento || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden overflow-auto flex-1 divide-y">
              {(movimentos || []).map(m => (
                <div key={m.id} className="p-3 space-y-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{formatDate(m.data)}</p>
                      <p className="text-sm text-muted-foreground">{m.categoria}</p>
                      {m.atividade && (
                        <p className="text-xs text-muted-foreground">{m.atividade}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{m.tipoPagamento}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatValor(m.valor)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="border-t pt-4 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total de Receitas:</span>
                <span className="text-lg font-bold text-primary">
                  {formatValor(totalReceitas)}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
