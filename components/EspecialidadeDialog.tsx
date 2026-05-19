import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getEspecialidades, GetEspecialidadesOutputType } from 'zite-endpoints-sdk';
import { Permissions } from '@/utils/permissions';
import EspecialidadeProgressSection from '@/components/EspecialidadeProgressSection';
import { Star } from 'lucide-react';

type Row = GetEspecialidadesOutputType['rows'][0];

interface Props {
  open: boolean;
  onClose: () => void;
  nome: string;
  imageUrl: string;
  perms: Permissions;
}

const SECCOES = ['Lobitos', 'Exploradores', 'Pioneiros', 'Caminheiros'];

const SECCAO_COLORS: Record<string, string> = {
  Lobitos: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Exploradores: 'bg-green-100 text-green-800 border-green-300',
  Pioneiros: 'bg-blue-100 text-blue-800 border-blue-300',
  Caminheiros: 'bg-red-100 text-red-800 border-red-300',
};

export default function EspecialidadeDialog({ open, onClose, nome, imageUrl, perms }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getEspecialidades({})
      .then(data => setRows(data.rows))
      .finally(() => setLoading(false));
  }, [open]);

  const especialRows = rows.filter(
    r => r.especialidade?.toLowerCase() === nome.toLowerCase()
  );

  const descricao = especialRows[0]?.descricao;

  const showAllSections = !perms.isEscuteiro && !perms.isDirigente;
  const visibleSeccoes = showAllSections
    ? SECCOES
    : SECCOES.filter(s => s === perms.userSeccao);

  const bySeccao: Record<string, Row[]> = {};
  for (const s of SECCOES) {
    bySeccao[s] = especialRows.filter(r => r.seccao === s);
  }

  const userSeccaoRows = bySeccao[perms.userSeccao] ?? [];
  const showProgress = !!perms.userSeccao && (perms.isEscuteiro || perms.isDirigente || perms.isCA);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{nome}</DialogTitle>
        </DialogHeader>

        {/* Image + description */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-40 shrink-0 bg-muted/30 rounded-xl border flex items-center justify-center p-3">
            <img src={imageUrl} alt={nome} className="w-32 h-32 object-contain" />
          </div>
          {loading ? (
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : descricao ? (
            <div className="flex-1 pt-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
              <p className="text-base text-foreground italic">&ldquo;{descricao}&rdquo;</p>
            </div>
          ) : null}
        </div>

        {/* Requirements by section */}
        <div className="space-y-4 mt-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ))}
            </div>
          ) : visibleSeccoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sem informação disponível para a sua secção.
            </p>
          ) : (
            visibleSeccoes.map(seccao => {
              const sRows = bySeccao[seccao] ?? [];
              if (sRows.length === 0) return null;
              return (
                <div key={seccao} className="rounded-lg border overflow-hidden">
                  <div className={`px-4 py-2 border-b ${SECCAO_COLORS[seccao] ?? 'bg-muted/30'}`}>
                    <span className="font-semibold text-sm">{seccao}</span>
                  </div>
                  <div className="divide-y">
                    {sRows.map(row => (
                      <div key={row.id} className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {row.base && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Base</p>
                            <p className="text-sm text-foreground">{row.base}</p>
                          </div>
                        )}
                        {row.avancado && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Avançado</p>
                            <p className="text-sm text-foreground">{row.avancado}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* My Progress section */}
        {showProgress && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                O meu progresso
              </h3>
              <EspecialidadeProgressSection
                nome={nome}
                perms={perms}
                seccaoRows={userSeccaoRows}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
