import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Movement } from '@/types';
type NMovimentos = Movement;
import { formatCurrency, parseValor } from '@/utils/dateUtils';

type SummaryPanelProps = {
  movements: NMovimentos[];
};

export default function SummaryPanel({ movements }: SummaryPanelProps) {
  // Filter out movements that are pending in section
  const nonPendingMovements = movements.filter(m => m.estadoMovimento !== 'Caixa');

  const bySection = nonPendingMovements.reduce((acc, m) => {
    const section = m.seccao || 'Sem Secção';
    if (!acc[section]) acc[section] = 0;
    const value = parseValor(m.valor);
    acc[section] += m.tipo === 'Receita' ? value : -value;
    return acc;
  }, {} as Record<string, number>);

  const byCategory = nonPendingMovements.reduce((acc, m) => {
    const category = m.categoria || 'Sem Categoria';
    if (!acc[category]) acc[category] = 0;
    const value = parseValor(m.valor);
    acc[category] += m.tipo === 'Receita' ? value : -value;
    return acc;
  }, {} as Record<string, number>);

  const byDinheiro = nonPendingMovements
  .filter(m => m.tipoPagamento === 'Dinheiro')
  .reduce((acc, m) => {
    const section = m.seccao || 'Sem Secção';
    if (!acc[section]) acc[section] = 0;
    const value = parseValor(m.valor);
    acc[section] += m.tipo === 'Receita' ? value : -value;
    return acc;
  }, {} as Record<string, number>);

  const byTransferencia = nonPendingMovements
  .filter(m => m.tipoPagamento === 'Transferencia')
  .reduce((acc, m) => {
    const section = m.seccao || 'Sem Secção';
    if (!acc[section]) acc[section] = 0;
    const value = parseValor(m.valor);
    acc[section] += m.tipo === 'Receita' ? value : -value;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Por Secção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(bySection).map(([section, total]) => (
              <div key={section} className="flex justify-between items-center">
                <span className="text-sm">{section}</span>
                <span className={`font-semibold ${(total as number) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  €{formatCurrency(total as number)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(byCategory).map(([category, total]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="text-sm">{category}</span>
                <span className={`font-semibold ${(total as number) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  €{formatCurrency(total as number)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dinheiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(byDinheiro).map(([category, total]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="text-sm">{category}</span>
                <span className={`font-semibold ${(total as number) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  €{formatCurrency(total as number)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transferência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(byTransferencia).map(([category, total]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="text-sm">{category}</span>
                <span className={`font-semibold ${(total as number) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  €{formatCurrency(total as number)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
