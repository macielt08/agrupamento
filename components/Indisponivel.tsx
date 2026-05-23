import React from 'react';
import { Construction, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Indisponivel() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center space-y-6">
      {/* Ícone Animado ou Ilustração */}
      <div className="bg-yellow-100 p-6 rounded-full">
        <Construction className="h-16 w-16 text-yellow-600 animate-pulse" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Temporariamente Indisponível
        </h1>
        <p className="text-muted-foreground max-w-[500px] mx-auto text-lg">
          Estamos a realizar operações de manutenção ou a atualizar os dados desta secção. 
          Por favor, tenta novamente dentro de momentos.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar atrás
        </Button>
        
        <Button 
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>

      <div className="pt-8">
        <img 
          src="https://images.fillout.com/orgid-488337/flowpublicid-5ipoddzhpg/widgetid-default/1d6HSLZAvpzehbf7BtSEm9/pasted-image-1761781303231.png" 
          alt="Agrupamento 1280" 
          className="h-12 opacity-50 grayscale"
        />
      </div>
    </div>
  );
}
