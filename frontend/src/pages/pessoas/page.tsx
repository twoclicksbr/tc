import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Users } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { GenericGrid } from '@/components/generic-grid';
import { PersonModal } from './person-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// moduleId=4 — módulo pessoas criado pelo MainSeeder em tc_main (firstOrCreate, sempre ID=4 após migrate:fresh)
const MODULE_ID = 4;

export function PessoasPage() {
  const [birthdayRange, setBirthdayRange] = useState<DateRange | undefined>(undefined);

  const handleDataLoad = useCallback((_data: Record<string, unknown>[]) => {}, []);

  const handleClearSearchFilters = useCallback(() => {
    setBirthdayRange(undefined);
  }, []);

  const handleSearch = useCallback((_baseFilters: Record<string, string>): Record<string, string> => {
    const extra: Record<string, string> = {};
    if (birthdayRange?.from) {
      extra['birth_month_day_from'] = format(birthdayRange.from, 'MM-dd');
      if (birthdayRange.to) extra['birth_month_day_to'] = format(birthdayRange.to, 'MM-dd');
    }
    return extra;
  }, [birthdayRange]);

  const hasModuleFilters = useMemo(
    () => birthdayRange?.from !== undefined,
    [birthdayRange],
  );

  const renderSearchFilters = (
    <div className="grid grid-cols-12 gap-4 items-end">

      {/* Aniversariantes */}
      <div className="col-span-3 flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Aniversariantes</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal text-left">
              <CalendarIcon className="size-4 opacity-60" />
              {birthdayRange?.from ? (
                birthdayRange.to ? (
                  <span>{format(birthdayRange.from, 'dd/MM/yyyy')} — {format(birthdayRange.to, 'dd/MM/yyyy')}</span>
                ) : (
                  format(birthdayRange.from, 'dd/MM/yyyy')
                )
              ) : (
                <span className="text-muted-foreground">Aniversariantes</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={birthdayRange?.from}
              selected={birthdayRange}
              onSelect={setBirthdayRange}
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
        { key: 'birth_date', label: 'Nascimento', type: 'date', sortable: true, meta: { style: { width: '15%' } } },
      ]}
      icon={Users}
      modalComponent={PersonModal}
      showActionShow={false}
      onDataLoad={handleDataLoad}
      renderSearchFilters={renderSearchFilters}
      onClearSearchFilters={handleClearSearchFilters}
      onSearch={handleSearch}
      hasModuleFilters={hasModuleFilters}
    />
  );
}
