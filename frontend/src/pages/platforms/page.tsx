import { useCallback, useMemo, useState } from 'react';
import { usePlatform } from '@/providers/platform-provider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Layers } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { GenericGrid } from '@/components/generic-grid';
import { PlatformModal } from './platform-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// moduleId=3 — módulo platforms criado pelo MainSeeder em tc_main (firstOrCreate, sempre ID=3 após migrate:fresh)
const MODULE_ID = 3;

export function PlatformsPage() {
  const { refreshPlatforms } = usePlatform();
  const [validityRange, setValidityRange] = useState<DateRange | undefined>(undefined);

  const handleDataLoad = useCallback((_data: Record<string, unknown>[]) => {
    refreshPlatforms();
  }, [refreshPlatforms]);

  const handleClearSearchFilters = useCallback(() => {
    setValidityRange(undefined);
  }, []);

  const handleSearch = useCallback((_baseFilters: Record<string, string>): Record<string, string> => {
    const extra: Record<string, string> = {};
    if (validityRange?.from) {
      extra['expiration_date_from'] = format(validityRange.from, 'yyyy-MM-dd');
      if (validityRange.to) extra['expiration_date_to'] = format(validityRange.to, 'yyyy-MM-dd');
    }
    return extra;
  }, [validityRange]);

  const hasModuleFilters = useMemo(
    () => validityRange?.from !== undefined,
    [validityRange],
  );

  const renderSearchFilters = (
    <div className="grid grid-cols-12 gap-4 items-end">

      {/* Validade */}
      <div className="col-span-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal text-left">
              <CalendarIcon className="size-4 opacity-60" />
              {validityRange?.from ? (
                validityRange.to ? (
                  <span>{format(validityRange.from, 'dd/MM/yyyy')} — {format(validityRange.to, 'dd/MM/yyyy')}</span>
                ) : (
                  format(validityRange.from, 'dd/MM/yyyy')
                )
              ) : (
                <span className="text-muted-foreground">Período de Validade</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={validityRange?.from}
              selected={validityRange}
              onSelect={setValidityRange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

    </div>
  );

  return (
    <GenericGrid
      moduleId={MODULE_ID}
      columns={[
        {
          key: 'name',
          label: 'Nome',
          sortable: true,
          render: (value, record, openModal) => (
            <button
              className="text-left hover:underline cursor-pointer font-bold text-blue-600"
              onClick={() => openModal('show', record)}
            >
              {String(value ?? '—')}
            </button>
          ),
        },
        { key: 'domain',  label: 'Domínio', sortable: true, meta: { style: { width: '18%' } } },
        { key: 'slug',    label: 'Slug',  sortable: true, meta: { style: { width: '12%' } }, render: (v) => <Badge variant="info" appearance="light">{String(v ?? '—')}</Badge> },
        { key: 'db_name', label: 'Banco',                meta: { style: { width: '12%' } }, render: (v) => <Badge variant="info" appearance="light">{String(v ?? '—')}</Badge> },
        {
          key: 'expiration_date', label: 'Validade', sortable: true, meta: { style: { width: '15%' } },
          render: (v) => {
            if (!v) return '—';
            const match = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!match) return String(v);
            const [, y, m, d] = match;
            const expDate  = new Date(Number(y), Number(m) - 1, Number(d));
            const today    = new Date(); today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
            const variant  = diffDays < 0 ? 'destructive' : diffDays <= 7 ? 'warning' : 'success';
            const abs      = Math.abs(diffDays);
            let duration: string;
            if (abs === 0) {
              duration = 'Vence hoje';
            } else if (abs < 31) {
              duration = abs === 1 ? '1 dia' : `${abs} dias`;
            } else if (abs < 365) {
              const months = Math.round(abs / 30);
              duration = months === 1 ? '1 mês' : `${months} meses`;
            } else {
              const years = Math.round(abs / 365);
              duration = years === 1 ? '1 ano' : `${years} anos`;
            }
            const label = `${d}/${m}/${y} (${duration})`;
            return <Badge variant={variant} appearance="light">{label}</Badge>;
          },
        },
      ]}
      icon={Layers}
      modalComponent={PlatformModal}
      showActionShow={false}
      showActionRestore={false}
      onDataLoad={handleDataLoad}
      renderSearchFilters={renderSearchFilters}
      onClearSearchFilters={handleClearSearchFilters}
      onSearch={handleSearch}
      hasModuleFilters={hasModuleFilters}
    />
  );
}
