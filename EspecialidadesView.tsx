import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, LayoutGrid, Star } from 'lucide-react';
import { Permissions } from '@/utils/permissions';
import EspecialidadeDialog from '@/components/EspecialidadeDialog';
import EspecialidadesPorElementoView from '@/components/EspecialidadesPorElementoView';
import { AREA_ESPECIALIDADES_BADGE_MAP } from '@/utils/areasEspecialidadesBadges';
import { getEspecialidadesIndividual, GetEspecialidadesIndividualOutputType } from 'zite-endpoints-sdk';

type IndividualRecord = GetEspecialidadesIndividualOutputType['records'][0];

const AREAS = Object.entries(AREA_ESPECIALIDADES_BADGE_MAP);

const ESPECIALIDADES_BADGE_MAP: Record<string, { url: string; areas: string[] }> = {
  'Acólito': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/acolito.png', areas: ['Fé e religião', 'Serviço e socorrismo'] },
  'Aeroespacial': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/Aeroespacial.jpg', areas: ['Ciência e tecnologia', 'Terra, água e ar', 'Habilidade e criatividade'] },
  'Agricultor': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/agricultor.png', areas: ['Natureza, ambiente e vida em campo', 'Habilidade e criatividade', 'Terra, água e ar'] },
  'Agricultor Urbano': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/agricultor_urbano.png', areas: ['Natureza, ambiente e vida em campo', 'Comunicação, informação e relacionamento', 'Terra, água e ar'] },
  'Alfaiate': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/alfaiate-modista.jpg', areas: ['Habilidade e criatividade'] },
  'Ambientalista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/Ambientalista.png', areas: ['Natureza, ambiente e vida em campo', 'Terra, água e ar', 'Comunicação, informação e relacionamento'] },
  'Animador da Fé': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/animador_fe.png', areas: ['Fé e religião'] },
  'Animador Liturgico': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/animador_liturgico.png', areas: ['Fé e religião', 'Comunicação, informação e relacionamento'] },
  'Artes Marciais': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/defesa-pessoal.png', areas: ['Desenvolvimento físico'] },
  'Astrónomo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/astronomo.png', areas: ['Terra, água e ar', 'Ciência e tecnologia', 'Habilidade e criatividade'] },
  'Atleta': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/atleta.png', areas: ['Desenvolvimento físico'] },
  'Ator': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/ator.jpg', areas: ['Comunicação, informação e relacionamento', 'Habilidade e criatividade'] },
  'Bibliotecário': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/bibliotecario.png', areas: ['Serviço e socorrismo', 'Comunicação, informação e relacionamento', 'Habilidade e criatividade'] },
  'Biblista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/biblista.png', areas: ['Fé e religião'] },
  'Biólogo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/biologo.png', areas: ['Ciência e tecnologia', 'Habilidade e criatividade'] },
  'Bom Consumidor': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/bom_consumidor.png', areas: ['Comunicação, informação e relacionamento', 'Habilidade e criatividade'] },
  'Botânico': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/botanico.png', areas: ['Natureza, ambiente e vida em campo', 'Terra, água e ar'] },
  'Bushcraft': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/bushcraft.png', areas: ['Natureza, ambiente e vida em campo', 'Habilidade e criatividade', 'Terra, água e ar'] },
  'Campista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/campista.png', areas: ['Natureza, ambiente e vida em campo', 'Terra, água e ar'] },
  'Canoista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/canoista.png', areas: ['Terra, água e ar', 'Desenvolvimento físico'] },
  'Cantor': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/cantor.jpg', areas: ['Habilidade e criatividade', 'Comunicação, informação e relacionamento'] },
  'Cantor Liturgico': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/cantor-liturgico.jpg', areas: ['Fé e religião', 'Cominuicação, informação e relacionamento', 'Serviço e socorrismo'] },
  'Carpinteiro': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/carpinteiro.png', areas: ['Habilidade e criatividade'] },
  'Carpinteiro Naval': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/carpinteiro_naval.png', areas: ['Terra, água e ar', 'Habilidade e criatividade'] },
  'Cavaleiro': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/cavaleiro.png', areas: ['Desenvolvimento físico'] },
  'Ciclista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/ciclista.png', areas: ['Desenvolvimento físico'] },
  'Cidadão Cristão': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/cidadao_cristao.png', areas: ['Comunicação, informação e relacionamento', 'Serviço e socorrismo', 'Fé e religião'] },
  'Cidadão do Mundo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/cidadao_mundo.png', areas: ['Comunicação, informação e relacionamento', 'Serviço e socorrismo'] },
  'Cidadão Europeu': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/cidadao_europeu.png', areas: ['Comunicação, informação e relacionamento', 'Serviço e socorrismo'] },
  'Cidadão Lusófono': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/cidadao_lusofono.png', areas: ['Comunicação, informação e relacionamento', 'Serviço e socorrismo'] },
  'Colecionador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/Colecionador.png', areas: ['Habilidade e criatividade', 'Comunicação, informação e relacionamento'] },
  'Comunicador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/comunicador.png', areas: ['Comunicação, informação e relacionamento'] },
  'Corredor de Orientação': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/corredor_orientacao.png', areas: ['Desenvolvimento físico'] },
  'Cozinheiro': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/cozinheiro.jpg', areas: ['Habilidade e criatividade'] },
  'Cozinheiro do Mundo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/cozinheiro_mundo.png', areas: ['Habilidade e criatividade', 'Comunicação, informação e relacionamento'] },
  'Cuidador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/cuidador.png', areas: ['Serviço e socorrismo'] },
  'Culturas do Mundo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/culturas_mundo.png', areas: ['Comunicação, informação e relacionamento', 'Serviço e socorrismo', 'Habilidade e criatividade'] },
  'Dança': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/danc%CC%A7a.jpg', areas: ['Desenvolvimento físico', 'Habilidade e criatividade'] },
  'Desenhador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/desenhador.png', areas: ['Habilidade e criatividade', 'Ciência e tecnologia'] },
  'Desportista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/desportista.png', areas: ['Desenvolvimento físico'] },
  'Desportos de Deslize sobre Água': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/Deslize-sobre-agua.png', areas: ['Desenvolvimento físico', 'Terra, água e ar'] },
  'Despostos de Deslize sobre Rodas': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/02/Deslize-sobre-rodas.png', areas: ['Desenvolvimento físico'] },
  'Doméstico': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/dome%CC%81stico.jpg', areas: ['Habilidade e criatividade'] },
  'Editor de Video': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/editor_video.png', areas: ['Ciência e tecnologia', 'Habilidade e criatividade', 'Comunicação, informação e relacionamento'] },
  'Eletricista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/eletricista.jpg', areas: ['Habilidade e criatividade', 'Ciência e tecnologia'] },
  'Eletrónica': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/electronica-especialidade.png', areas: ['Ciência e tecnologia', 'Habilidade e criatividade'] },
  'Energia': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/Energia.png', areas: ['Ciência e tecnologia', 'Terra, água e ar'] },
  'Escalador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/escalador.png', areas: ['Desenvolvimento físico'] },
  'Especialista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/especialista.png', areas: [''] },
  'Física': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/Fisica.png', areas: ['Ciência e tecnologia', 'Habilidade e criatividade'] },
  'Fogo de Conselho': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/02/Fogo-Conselho.png', areas: ['Natureza, ambiente e vida em campo', 'Comunicação, informação e relacionamento'] },
  'Fotógrafo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/fotografo.png', areas: ['Comunicação, informação e relacionamento', 'Habilidade e criatividade', 'Ciência e tecnologia'] },
  'Fotógrafo Naturalista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/naturalista.png', areas: ['Natureza, ambiente e vida em campo', 'Habilidade e criatividade', 'Ciência e tecnologia', 'Comunicação, informação e relacionamento'] },
  'Geocaching': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/02/geocaching.png', areas: ['Desenvolvimento físico', 'Comunicação, informação e relacionamento', 'Terra, água e ar', 'Natureza, ambiente e vida em campo'] },
  'Geógrafo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/geografo.png', areas: ['Natureza, ambiente e vida em campo', 'Terra, água e ar', 'Habilidade e criatividade'] },
  'Geólogo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/geologo.png', areas: ['Ciência e tecnologia', 'Habilidade e criatividade', 'Natureza, ambiente e vida em campo', 'Terra, água e ar'] },
  'Guarda-Rios': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/guarda_rios.png', areas: ['Natureza, ambiente e vida em campo', 'Terra, água e ar', 'Habilidade e criatividade'] },
  'Guia de Região': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/guia-de-regiao.jpg', areas: ['Serviço e socorrismo', 'Comunicação, informação e relacionamento' ] },
  'Guia do Patrimonio Religioso': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/Guia-Patrimonio.png', areas: ['Serviço e socorrismo', 'Fé e religião'] },
  'Herpetólogo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/herpetologo.png', areas: ['Natureza, ambiente e vida em campo', 'Terra, água e ar'] },
  'Historiador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/Historiador.png', areas: ['Comunicação, informação e relacionamento', 'Habilidade e criatividade'] },
  'Informático': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/informatica.jpg', areas: ['Ciência e tecnologia', 'Habilidade e criatividade'] },
  'Intendente': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/02/Intendente.png', areas: ['Natureza, ambiente e vida em campo', 'Serviço e socorrismo'] },
  'Intérprete': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/Interprete.png', areas: ['Serviço e socorrismo', 'Comunicação, informação e relacionamento'] },
  'Jogos de Mesa': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/jogos-de-mesa.png', areas: ['Desenvolvimento e físico', 'Comunicação, informação e relacionamento'] },
  'Jornalista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/jornalista.png', areas: ['Comunicação, informação e relacionamento', 'Habilidade e criatividade'] },
  'Leis e Justiça': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/Leis-e-Justic%CC%A7a.png', areas: ['Habilidade e criatividade', 'Comunicação, informação e relacionamento'] },
  'Leitor': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/leitor.png', areas: ['Fé e religião', 'Comunicação, informação e relacionamento', 'Serviço e socorrismo'] },
  'Lider de Expedição': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/lider_expedicao.png', areas: ['Natureza, ambiente e vida em campo', 'Desenvolvimento físico', 'Serviço e socorrismo', 'Comunicação, informação e relacionamento'] },
  'Malacolista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/malacolista.png', areas: ['Natureza, ambiente e vida em campo', 'Terra, água e ar'] },
  'Marinharia': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/marinharia.png', areas: ['Terra, água e ar', 'Habilidade e criatividade', 'Natureza, ambiente e vida em campo'] },
  'Matemático': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/Matema%CC%81tico.png', areas: ['Ciência e tecnologia', 'Habilidade e criatividade'] },
  'Mergulhador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/mergulhador.png', areas: ['Terra, água e ar', 'Desenvolvimento físico'] },
  'Mérito': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/merito.png', areas: [''] },
  'Mestre do Leme': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/mestre_motorista.png', areas: ['Terra, água e ar'] },
  'Mecânico': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/metalurgico.jpg', areas: ['Habilidade e criatividade'] },
  'Metereologista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/meteorologista.png', areas: ['Terra, água e ar', 'Habilidade e criatividade'] },
  'Modelismo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/modelismo-especialidade.png', areas: ['Habilidade e criatividade'] },
  'Montanhista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/montanhista.png', areas: [''] },
  'Músico': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/mu%CC%81sico.jpg', areas: [] },
  'Músico Liturgico': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/musico-liturgico.jpg', areas: [] },
  'Nadador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/nadador.png', areas: [] },
  'Nadador Salvador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/nadador-salvador-site.png', areas: [] },
  'Oceanógrafo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/oceanografo.png', areas: [] },
  'Ornitólogo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/ornitologo.png', areas: [] },
  'Pedestrianista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/pedestrianista.png', areas: [] },
  'Pedreiro': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/pedreiro.png', areas: [] },
  'Pescador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/pescador.png', areas: [] },
  'Pioneirista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/pioneirista.png', areas: [] },
  'Proteção Civil': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/12/Protecao-civil.png', areas: [] },
  'Protetor dos Animais': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/Protetor-Animais.png', areas: [] },
  'Quimica': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/quimica-site.png', areas: [] },
  'Radioamador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/radioamador.png', areas: [] },
  'Radioescuteiro': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/radioescuteiro.png', areas: [] },
  'Realizador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/realizador-especialidade.png', areas: [] },
  'Reciclador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/reciclador.png', areas: [] },
  'Relações Publicas': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/relacoes_publicas.png', areas: [] },
  'Robótica': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/robotica.png', areas: [] },
  'Saltimbanco': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/saltimbanco.jpg', areas: [] },
  'Sapador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/sapador.jpg', areas: [] },
  'Sinaleiro': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/sinaleiro.png', areas: [] },
  'Sobrevivência': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2022/11/sobrevivencia.png', areas: [] },
  'Socorrista': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/Socorrista.png', areas: [] },
  'Técnica Aeronáutica': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/tecnica-aeronautica.jpg', areas: [] },
  'Topógrafo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/topografo.png', areas: [] },
  'Trabalhos Manuais': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/trabalhos-manuais-e-bricolagem.jpg', areas: [] },
  'Tradutor': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/tradutor.png', areas: [] },
  'Turismo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/ada3b514-cd29-4e88-a3ce-196ab8ada43d.png', areas: [] },
  'Velejador': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/08/velejador.png', areas: [] },
  'Vigilante da Natureza': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/Vigilante-Natureza.png', areas: [] },
  'Voluntário Internacional': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2021/07/Voluntario-Internacional.png', areas: [] },
  'Zoólogo': { url: 'https://especialidades.escutismo.pt/wp-content/uploads/sites/18/2025/01/zoologo.jpg', areas: [] },
};

const ALL_ESPECIALIDADES = Object.entries(ESPECIALIDADES_BADGE_MAP)
  .map(([nome, { url, areas }]) => ({ nome, url, areas }))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

function getStatus(records: IndividualRecord[], nome: string, seccao: string, elemento: string): 'Concluída' | 'Em Progresso' | null {
  const r = records.find(rec => rec.especialidade === nome && rec.seccao === seccao && rec.elemento === elemento);
  if (!r) return null;
  const allDone = r.req1 === 'TRUE' && r.req2 === 'TRUE' && r.req3 === 'TRUE' &&
    r.req4 === 'TRUE' && r.req5 === 'TRUE' && r.req6 === 'TRUE';
  return allDone ? 'Concluída' : 'Em Progresso';
}

interface Props {
  perms: Permissions;
}

export default function EspecialidadesView({ perms }: Props) {
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [showMinhas, setShowMinhas] = useState(false);
  const [selected, setSelected] = useState<{ nome: string; url: string } | null>(null);
  const [myRecords, setMyRecords] = useState<IndividualRecord[]>([]);

  const hasUser = !!perms.userName && !!perms.userSeccao;

  useEffect(() => {
    if (!hasUser) return;
    getEspecialidadesIndividual({}).then(data => setMyRecords(data.records)).catch(() => {});
  }, [hasUser]);

  const myStatusMap = useMemo(() => {
    if (!hasUser) return {} as Record<string, 'Concluída' | 'Em Progresso'>;
    const map: Record<string, 'Concluída' | 'Em Progresso'> = {};
    for (const esp of ALL_ESPECIALIDADES) {
      const status = getStatus(myRecords, esp.nome, perms.userSeccao, perms.userName);
      if (status) map[esp.nome] = status;
    }
    return map;
  }, [myRecords, perms.userSeccao, perms.userName, hasUser]);

  const filtered = useMemo(() => {
    let list = ALL_ESPECIALIDADES;
    if (showMinhas) {
      list = list.filter(e => !!myStatusMap[e.nome]);
    }
    if (selectedArea) {
      list = list.filter(e => e.areas.includes(selectedArea));
    }
    if (search.trim()) {
      const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      list = list.filter(e =>
        e.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
      );
    }
    return list;
  }, [search, selectedArea, showMinhas, myStatusMap]);

  const myCount = Object.keys(myStatusMap).length;
  const myConcluidasCount = Object.values(myStatusMap).filter(s => s === 'Concluída').length;

  return (
    <Tabs defaultValue="todas" className="space-y-6">
      <TabsList>
        <TabsTrigger value="todas">Especialidades</TabsTrigger>
        <TabsTrigger value="por-elemento">Por Elemento</TabsTrigger>
      </TabsList>

      <TabsContent value="por-elemento">
        <EspecialidadesPorElementoView perms={perms} />
      </TabsContent>

      <TabsContent value="todas">
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar especialidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* My stats banner */}
      {hasUser && myCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border text-sm">
          <Star className="h-4 w-4 text-primary shrink-0" />
          <span>
            <span className="font-semibold">{myConcluidasCount}</span> concluída{myConcluidasCount !== 1 ? 's' : ''} · <span className="font-semibold">{myCount - myConcluidasCount}</span> em progresso
          </span>
        </div>
      )}

      {/* Area filter row */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {/* Todas */}
        <button
          onClick={() => { setSelectedArea(null); setShowMinhas(false); }}
          className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-colors ${
            !selectedArea && !showMinhas ? 'border-primary bg-primary/10' : 'border-border bg-muted/40 hover:border-primary/50'
          }`}>
            <LayoutGrid className={`w-6 h-6 ${!selectedArea && !showMinhas ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <span className={`text-xs text-center leading-tight max-w-[64px] ${!selectedArea && !showMinhas ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            Todas
          </span>
        </button>

        {/* As minhas */}
        {hasUser && (
          <button
            onClick={() => { setShowMinhas(prev => !prev); setSelectedArea(null); }}
            className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-colors ${
              showMinhas ? 'border-primary bg-primary/10' : 'border-border bg-muted/40 hover:border-primary/50'
            }`}>
              <Star className={`w-6 h-6 ${showMinhas ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <span className={`text-xs text-center leading-tight max-w-[64px] ${showMinhas ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              As minhas
            </span>
          </button>
        )}

        {/* Area filters */}
        {AREAS.map(([nome, url]) => (
          <button
            key={nome}
            onClick={() => { setSelectedArea(prev => prev === nome ? null : nome); setShowMinhas(false); }}
            className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
          >
            <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-colors bg-muted/30 ${
              selectedArea === nome ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
            }`}>
              <img src={url} alt={nome} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <span className={`text-xs text-center leading-tight max-w-[64px] ${selectedArea === nome ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              {nome}
            </span>
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} especialidade{filtered.length !== 1 ? 's' : ''}
        {search && ` encontrada${filtered.length !== 1 ? 's' : ''} para "${search}"`}
        {showMinhas && ' (as minhas)'}
      </p>

      {filtered.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          {showMinhas ? 'Ainda não iniciaste nenhuma especialidade' : `Nenhuma especialidade encontrada para "${search}"`}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {filtered.map(({ nome, url }) => {
            const status = myStatusMap[nome];
            return (
              <button
                key={nome}
                onClick={() => setSelected({ nome, url })}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  status === 'Concluída'
                    ? 'border-green-500/60 ring-1 ring-green-500/40'
                    : status === 'Em Progresso'
                    ? 'border-yellow-500/60 ring-1 ring-yellow-500/40'
                    : 'hover:border-primary/50'
                }`}
              >
                {/* Status badge */}
                {status && (
                  <span className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ${
                    status === 'Concluída' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} title={status} />
                )}
                <div className="w-full aspect-square bg-muted/30 rounded-lg flex items-center justify-center p-2">
                  <img src={url} alt={nome} className="w-full h-full object-contain" loading="lazy" />
                </div>
                <p className="text-xs text-center font-medium leading-tight text-foreground">{nome}</p>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <EspecialidadeDialog
          open={!!selected}
          onClose={() => setSelected(null)}
          nome={selected.nome}
          imageUrl={selected.url}
          perms={perms}
        />
      )}
    </div>
      </TabsContent>
    </Tabs>
  );
}
