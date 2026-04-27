import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { MovementFilters, Category } from '@/types';

type FilterPanelProps = {
  filters: MovementFilters;
  onFilterChange: (filters: MovementFilters) => void;
  categories: Category[];
  sections: string[];
  isAdmin: boolean;
  searchText?: string;
  onSearchChange?: (text: string) => void;
};

export default function FilterPanel({ filters, onFilterChange, categories, sections, isAdmin, searchText = '', onSearchChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Extract unique categories and subcategories from the filtered categories prop
  const uniqueCategories = Array.from(new Set(categories.map(c => c.categoria).filter(Boolean)));
  const uniqueSubCategories = Array.from(new Set(categories.map(c => c.subCategoria).filter(Boolean)));

  const clearFilters = () => {
    onFilterChange({});
    if (onSearchChange) onSearchChange('');
  };

  const clearFilter = (filterKey: keyof MovementFilters) => {
    const newFilters = { ...filters };
    delete newFilters[filterKey];
    onFilterChange(newFilters);
  };

  const hasFilters = Object.keys(filters).length > 0 || searchText.length > 0;

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar movimentos..."
          value={searchText}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters Card */}
      <Card className="w-full md:w-auto">
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer py-3 px-4" onClick={() => setIsOpen(!isOpen)}>
          <CardTitle className="text-base">Filtros</CardTitle>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {isOpen && (
          <CardContent className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={filters.tipo || 'todos'} 
                onValueChange={(v) => v === 'todos' ? clearFilter('tipo') : onFilterChange({ ...filters, tipo: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Pagamento">Pagamento</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label>Secção</Label>
                <Select 
                  value={filters.seccao || 'todas'} 
                  onValueChange={(v) => v === 'todas' ? clearFilter('seccao') : onFilterChange({ ...filters, seccao: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={filters.categoria || 'todas'} 
                onValueChange={(v) => v === 'todas' ? clearFilter('categoria') : onFilterChange({ ...filters, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {uniqueCategories.map((c) => (
                    <SelectItem key={c} value={c!}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SubCategoria</Label>
              <Select 
                value={filters.subCategoria || 'todas'} 
                onValueChange={(v) => v === 'todas' ? clearFilter('subCategoria') : onFilterChange({ ...filters, subCategoria: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {uniqueSubCategories.map((c) => (
                    <SelectItem key={c} value={c!}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pendente Secção</Label>
              <Select 
                value={filters.pendenteSeccao === undefined ? 'todos' : (filters.pendenteSeccao ? 'sim' : 'nao')} 
                onValueChange={(v) => {
                  if (v === 'todos') {
                    clearFilter('pendenteSeccao');
                  } else {
                    onFilterChange({ ...filters, pendenteSeccao: v === 'sim' });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
