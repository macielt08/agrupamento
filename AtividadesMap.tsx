import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

type Atividade = {
  id: number;
  nome?: string;
  local?: string;
  seccao?: string;
  dataFim?: string;
  lat?: string;
  lng?: string;
};

type AtividadesMapProps = {
  atividades: Atividade[];
  onEdit: (atividade: Atividade) => void;
};

export default function AtividadesMap({ atividades, onEdit }: AtividadesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  const atividadesComCoordenadas = atividades.filter(
    (a) => a.lat && a.lng && !isNaN(parseFloat(a.lat)) && !isNaN(parseFloat(a.lng))
  );

  const getSecaoColor = (seccao?: string) => {
    const s = seccao?.toLowerCase() || '';
    if (s.includes('lobitos') || s.includes('alcateia')) return '#FFD700';
    if (s.includes('expedicao') || s.includes('exploradores')) return '#228B22';
    if (s.includes('comunidade') || s.includes('pioneiros')) return '#0000FF';
    if (s.includes('cla') || s.includes('caminheiros')) return '#FF0000';
    if (s.includes('agrupamento')) return '#800080';
    return '#64748b';
  };

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!(window as any).L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.body.appendChild(script);
        await new Promise<void>((resolve) => { script.onload = () => resolve(); });
      }

      if (!mounted || !mapRef.current || !(window as any).L) return;
      const L = (window as any).L;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current).setView([39.5, -8.0], 7);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      const group = L.featureGroup();

      atividadesComCoordenadas.forEach((at) => {
        const color = getSecaoColor(at.seccao);
        
        const svgIcon = L.divIcon({
          className: "custom-svg-pin",
          iconAnchor: [12, 35],
          popupAnchor: [0, -35],
          html: `
            <svg width="25" height="35" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C7.58 0 4 3.58 4 8C4 13.54 12 24 12 24C12 24 20 13.54 20 8C20 3.58 16.42 0 12 0Z" fill="${color}" stroke="white" stroke-width="1.5"/>
              <circle cx="12" cy="8" r="3" fill="white"/>
            </svg>
          `
        });

        // Criar o popup com um botão que o Leaflet consiga identificar
        const marker = L.marker([parseFloat(at.lat!), parseFloat(at.lng!)], { icon: svgIcon })
          .bindPopup(`
            <div style="min-width: 150px;">
              <b style="font-size: 14px;">${at.nome}</b><br/>
              <span style="font-size: 12px; color: #666;">${at.local || ''}</span><br/>
              <hr style="margin: 8px 0; border: 0; border-top: 1px solid #eee;"/>
              <div style="display: flex; gap: 5px;">
                <button id="edit-${at.id}" style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Editar</button>
                <a href="https://www.google.com/maps/search/?api=1&query=${at.lat},${at.lng}" target="_blank" style="background: #f8f9fa; border: 1px solid #ddd; padding: 4px 8px; border-radius: 4px; text-decoration: none; color: #333; font-size: 11px;">Ver Mapa</a>
              </div>
            </div>
          `)
          .addTo(group);

        // Listener para o botão de editar dentro do popup
        marker.on('popupopen', () => {
          const btn = document.getElementById(`edit-${at.id}`);
          if (btn) {
            btn.onclick = () => onEdit(at);
          }
        });
      });

      group.addTo(map);

      if (atividadesComCoordenadas.length > 0) {
        map.fitBounds(group.getBounds().pad(0.2));
      }

      setLoading(false);
    };

    initMap();
    return () => { mounted = false; };
  }, [atividadesComCoordenadas.length]);

  return (
    <div className="h-[600px] w-full rounded-lg border bg-muted/20 overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapRef} className="h-full w-full z-0" />
    </div>
  );
}
