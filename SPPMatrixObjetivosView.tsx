import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, Target, Search, Loader2, 
  Activity, Heart, ShieldCheck, Flame, Lightbulb, Users 
} from 'lucide-react'; // Ícones para cada área
import { getSppGeral, GetSppGeralOutputType } from 'zite-endpoints-sdk';
import { getAreaBadgeUrl } from '@/utils/areaBadges';
import { Input } from '@/components/ui/input';

type SppGeralItem = GetSppGeralOutputType['records'][0];

// Mapeamento de Cores e Ícones por Área
const AREA_CONFIG: Record<string, { color: string, icon: any }> = {
  'Físico': { color: 'border-l-green-500 bg-green-50/30', icon: Activity },
  'Afetivo': { color: 'border-l-red-500 bg-red-50/30', icon: Heart },
  'Caracter': { color: 'border-l-blue-500 bg-blue-50/30', icon: ShieldCheck },
  'Espiritual': { color: 'border-l-purple-500 bg-purple-50/30', icon: Flame },
  'Intelectual': { color: 'border-l-orange-500 bg-orange-50/30', icon: Lightbulb },
  'Social': { color: 'border-l-yellow-500 bg-yellow-50/30', icon: Users }
};

export default function SPPMatrixObjetivosView({ selectedSection }: { selectedSection: string }) {
  const [referencial, setReferencial] = useState<SppGeralItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpp = async () => {
      try {
        setLoading(true);
        const response = await getSppGeral({});
        setReferencial(response.records);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpp();
  }, []);

  const areasAgrupadas = useMemo(() => {
    const filtered = referencial.filter(item => {
      // Normalização da Secção (com ou sem acento)
      const sectionValue = (item.Secção || item.seccao || "").toString().trim().toLowerCase();
      return sectionValue === selectedSection.toLowerCase();
    });

    const groups = filtered.reduce((acc, curr) => {
      // Normalização da Área
      const area = curr.Area || curr.area || 'Outros';
      if (!acc[area]) acc[area] = [];
      acc[area].push(curr);
      return acc;
    }, {} as Record<string, SppGeralItem[]>);

    const order = ['Físico', 'Afetivo', 'Caracter', 'Espiritual', 'Intelectual', 'Social'];
    return Object.entries(groups).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [referencial, selectedSection]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20">
      <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
      <p>A carregar objetivos...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Barra de Título */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" /> 
          Objetivos Educativos: {selectedSection}
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {areasAgrupadas.map(([area, objetivos]) => {
          const config = AREA_CONFIG[area] || { color: 'border-l-slate-300', icon: Target };
          const IconArea = config.icon;

          return (
            <Card key={area} className={`border-none border-l-4 shadow-md ${config.color}`}>
              <CardHeader className="flex flex-row items-center justify-between py-5 bg-white/40 dark:bg-slate-900/40">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-slate-950 rounded-xl shadow-sm">
                    <img src={getAreaBadgeUrl(area) || ''} alt={area} className="w-10 h-10 object-contain" />
                  </div>
                  <CardTitle className="text-xl font-bold">{area}</CardTitle>
                </div>
                <IconArea className="h-6 w-6 opacity-20" />
              </CardHeader>

              <CardContent className="pt-6">
                <div className="space-y-6">
                  {(objetivos as SppGeralItem[]).map((obj, idx) => {
                    // TÉCNICA DE PROPRIEDADE FLEXÍVEL
                    // Tenta ler com acento, sem acento, ou camelCase
                    const tituloObjetivo = obj.Objetivo || obj.objetivo;
                    const textoDescricao = obj.Descrição || obj.Descricao || obj.descricao;

                    return (
                      <div key={idx} className="relative pl-6 border-l border-primary/10 ml-2">
                        <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-primary mb-1">
                          {tituloObjetivo || `Objetivo ${idx + 1}`}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {textoDescricao || "Sem descrição disponível"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
