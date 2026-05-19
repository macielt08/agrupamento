import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Euro, Clock, Users } from 'lucide-react';
import { Movement } from '@/types';
import { formatCurrency, parseValor } from '@/utils/dateUtils';

type DashboardProps = {
  movements: Movement[];
  isAdmin: boolean;
};

export default function Dashboard({ movements, isAdmin }: DashboardProps) {
  const totalReceipts = movements
    .filter((m) => m.tipo === 'Receita' && m.pendenteSeccao === 'Não')
    .reduce((sum, m) => sum + parseValor(m.valor), 0);

  const totalPayments = movements
    .filter((m) => m.tipo === 'Pagamento' && m.pendenteSeccao === 'Não')
    .reduce((sum, m) => sum + parseValor(m.valor), 0);

  const balance = totalReceipts - totalPayments;

  const totalPendentes = movements
    .filter((m) => m.pendenteSeccao === 'Sim')
    .reduce((sum, m) => sum + parseValor(m.valor), 0);

  const totalEntrada = movements
    .filter((m) => m.tipo === 'Receita' && m.movAgrupamento !== 'Sim')
    .reduce((sum, m) => sum + parseValor(m.valor), 0);

  const totalSaida = movements
    .filter((m) => m.tipo === 'Pagamento' && m.movAgrupamento !== 'Sim')
    .reduce((sum, m) => sum + parseValor(m.valor), 0);

  const balanceSeccao = totalEntrada - totalSaida;
  
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 md:py-6 pb-1 md:pb-2">
          <CardTitle className="text-base md:text-sm font-medium">Total Receitas</CardTitle>
          <TrendingUp className="h-5 w-5 md:h-4 md:w-4 text-success" />
        </CardHeader>
        <CardContent className="py-2 md:py-6 pt-1 md:pt-0">
          <div className="text-lg md:text-2xl font-bold text-success">€{formatCurrency(totalReceipts)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 md:py-6 pb-1 md:pb-2">
          <CardTitle className="text-base md:text-sm font-medium">Total Pagamentos</CardTitle>
          <TrendingDown className="h-5 w-5 md:h-4 md:w-4 text-destructive" />
        </CardHeader>
        <CardContent className="py-2 md:py-6 pt-1 md:pt-0">
          <div className="text-lg md:text-2xl font-bold text-destructive">€{formatCurrency(totalPayments)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 md:py-6 pb-1 md:pb-2">
          <CardTitle className="text-base md:text-sm font-medium">Saldo</CardTitle>
          <Euro className="h-5 w-5 md:h-4 md:w-4 text-info" />
        </CardHeader>
        <CardContent className="py-2 md:py-6 pt-1 md:pt-0">
          <div className={`text-lg md:text-2xl font-bold ${balance >= 0 ? 'text-info' : 'text-destructive'}`}>
            €{formatCurrency(balance)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 md:py-6 pb-1 md:pb-2">
          <CardTitle className="text-base md:text-sm font-medium">Pendentes nas Secções</CardTitle>
          <Clock className="h-5 w-5 md:h-4 md:w-4 text-destructive" />
        </CardHeader>
        <CardContent className="py-2 md:py-6 pt-1 md:pt-0">
          <div className="text-lg md:text-2xl font-bold text-destructive">€{formatCurrency(totalPendentes)}</div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 md:py-6 pb-1 md:pb-2">
            <CardTitle className="text-base md:text-sm font-medium">Saldo da Minha Secção</CardTitle>
            <Users className="h-5 w-5 md:h-4 md:w-4 text-info" />
          </CardHeader>
          <CardContent className="py-2 md:py-6 pt-1 md:pt-0">
            <div className={`text-lg md:text-2xl font-bold ${balanceSeccao >= 0 ? 'text-success' : 'text-destructive'}`}>
              €{formatCurrency(balanceSeccao)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
