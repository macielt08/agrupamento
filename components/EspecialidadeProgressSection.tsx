import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Star, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import {
  getEspecialidadesIndividual,
  createEspecialidadeIndividual,
  updateEspecialidadeIndividual,
  GetEspecialidadesIndividualOutputType,
} from 'zite-endpoints-sdk';
import { Permissions } from '@/utils/permissions';

type IndividualRecord = GetEspecialidadesIndividualOutputType['records'][0];
type ReqRow = { base?: string; avancado?: string };

interface Props {
  nome: string;
  perms: Permissions;
  seccaoRows: ReqRow[];
}

const BASE_KEYS = ['req1', 'req2', 'req3'] as const;
const AVANC_KEYS = ['req4', 'req5', 'req6'] as const;

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function EspecialidadeProgressSection({ nome, perms, seccaoRows }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<IndividualRecord | null | undefined>(undefined);
  const [localReqs, setLocalReqs] = useState<Record<string, boolean>>({});
  const [observacoes, setObservacoes] = useState('');
  const [dataConcluido, setDataConcluido] = useState('');

  const { userSeccao, userName, isCA, isDirigente, isEscuteiro } = perms;
  const canEdit = isCA || isDirigente || isEscuteiro;

  // Build req labels: req1-3 from base, req4-6 from avancado
  const reqLabels: Record<string, string> = {};
  seccaoRows.forEach((row, i) => {
    if (row.base) reqLabels[`req${i + 1}`] = row.base;
    if (row.avancado) reqLabels[`req${i + 4}`] = row.avancado;
  });

  const loadRecord = useCallback(async () => {
    if (!userSeccao || !userName) return;
    setLoading(true);
    try {
      const data = await getEspecialidadesIndividual({});
      const found = data.records.find(
        r => r.especialidade === nome && r.seccao === userSeccao && r.elemento === userName
      ) ?? null;
      setRecord(found);
      if (found) {
        setLocalReqs({
          req1: found.req1 === 'TRUE', req2: found.req2 === 'TRUE', req3: found.req3 === 'TRUE',
          req4: found.req4 === 'TRUE', req5: found.req5 === 'TRUE', req6: found.req6 === 'TRUE',
        });
        setObservacoes(found.observacoes ?? '');
        setDataConcluido(found.dataConcluido ?? '');
      } else {
        setLocalReqs({});
        setObservacoes('');
        setDataConcluido('');
      }
    } finally {
      setLoading(false);
    }
  }, [nome, userSeccao, userName]);

  useEffect(() => { loadRecord(); }, [loadRecord]);

  const countCompleted = Object.values(localReqs).filter(Boolean).length;
  const allCompleted = countCompleted === 6;

  const handleStart = async () => {
    setSaving(true);
    try {
      await createEspecialidadeIndividual({
        elemento: userName, seccao: userSeccao, especialidade: nome,
        dataInicio: todayISO(),
        req1: 'FALSE', req2: 'FALSE', req3: 'FALSE',
        req4: 'FALSE', req5: 'FALSE', req6: 'FALSE',
      });
      toast.success('Especialidade iniciada!');
      await loadRecord();
    } catch {
      toast.error('Erro ao iniciar especialidade');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReq = async (key: string, value: boolean) => {
    if (!record || !canEdit) return;
    const newReqs = { ...localReqs, [key]: value };
    setLocalReqs(newReqs);
    const nowAllDone = Object.values(newReqs).filter(Boolean).length === 6;
    const updatePayload: Record<string, unknown> = { id: record.id, [key]: value ? 'TRUE' : 'FALSE' };
    if (nowAllDone && !dataConcluido) {
      const today = todayISO();
      updatePayload.dataConcluido = today;
      setDataConcluido(today);
    }
    setSaving(true);
    try {
      await updateEspecialidadeIndividual(updatePayload as Parameters<typeof updateEspecialidadeIndividual>[0]);
      if (nowAllDone && !dataConcluido) toast.success('🎉 Especialidade concluída!');
    } catch {
      toast.error('Erro ao guardar progresso');
      setLocalReqs(prev => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveObservacoes = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await updateEspecialidadeIndividual({ id: record.id, observacoes });
      toast.success('Observações guardadas');
    } catch {
      toast.error('Erro ao guardar observações');
    } finally {
      setSaving(false);
    }
  };

  if (!userSeccao) return null;

  if (loading || record === undefined) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        A carregar progresso...
      </div>
    );
  }

  if (record === null) {
    return (
      <div className="rounded-lg border border-dashed p-5 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Ainda não iniciaste esta especialidade</p>
        {canEdit && (
          <Button size="sm" onClick={handleStart} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
            Iniciar Especialidade
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          {allCompleted ? (
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <Trophy className="h-4 w-4" />
              Especialidade Concluída!
            </span>
          ) : (
            <span className="font-medium">{countCompleted}/6 requisitos cumpridos</span>
          )}
          {dataConcluido && (
            <span className="text-xs text-muted-foreground">Concluída em {formatDate(dataConcluido)}</span>
          )}
        </div>
        <Progress value={(countCompleted / 6) * 100} className="h-2" />
      </div>

      {/* Requisites */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReqGroup keys={BASE_KEYS} label="Requisitos Base" localReqs={localReqs} reqLabels={reqLabels} canEdit={canEdit} saving={saving} onToggle={handleToggleReq} prefix="Base" />
        <ReqGroup keys={AVANC_KEYS} label="Requisitos Avançados" localReqs={localReqs} reqLabels={reqLabels} canEdit={canEdit} saving={saving} onToggle={handleToggleReq} prefix="Avançado" />
      </div>

      {/* Observações */}
      {canEdit && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Observações</Label>
          <div className="flex gap-2">
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Notas sobre o teu progresso..."
              className="text-sm resize-none h-16 flex-1"
            />
            <Button size="sm" variant="outline" onClick={handleSaveObservacoes} disabled={saving} className="shrink-0 self-end">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ReqGroupProps {
  keys: readonly string[];
  label: string;
  localReqs: Record<string, boolean>;
  reqLabels: Record<string, string>;
  canEdit: boolean;
  saving: boolean;
  onToggle: (key: string, value: boolean) => void;
  prefix: string;
}

function ReqGroup({ keys, label, localReqs, reqLabels, canEdit, saving, onToggle, prefix }: ReqGroupProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      {keys.map((key, i) => (
        <div key={key} className="flex items-start gap-2">
          <Checkbox
            id={`prog-${key}`}
            checked={!!localReqs[key]}
            onCheckedChange={v => onToggle(key, !!v)}
            disabled={!canEdit || saving}
            className="mt-0.5 shrink-0"
          />
          <label
            htmlFor={`prog-${key}`}
            className={`text-sm leading-snug cursor-pointer select-none ${localReqs[key] ? 'line-through text-muted-foreground' : 'text-foreground'}`}
          >
            <span className="font-medium">{prefix} {i + 1}</span>
            {reqLabels[key] ? <span className="text-muted-foreground"> — {reqLabels[key]}</span> : null}
          </label>
        </div>
      ))}
    </div>
  );
}
