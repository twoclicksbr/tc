import { useCallback, useMemo, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Container } from '@/components/common/container';
import { GenericGrid } from '@/components/generic-grid';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModuleModal, ModuleInlineCtx, type ModuleForEdit } from './module-modal';
import { ModuleShowModal } from './module-show-modal';

// moduleId=2 — módulo modules criado pelo MainSeeder em tc_main (firstOrCreate, sempre ID=2 após migrate:fresh)
const MODULE_ID = 2;

export function ModulesPage() {
  const [selectedModule, setSelectedModule] = useState<ModuleForEdit | null>(null);
  const [gridKey, setGridKey] = useState(0);
  const [filterOwnerLevel, setFilterOwnerLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');

  function handleGoInline(record: ModuleForEdit) {
    setSelectedModule(record);
  }

  function handleBack() {
    setSelectedModule(null);
  }

  function handleSuccess() {
    setSelectedModule(null);
    setGridKey((k) => k + 1);
  }

  const handleClearSearchFilters = useCallback(() => {
    setFilterOwnerLevel('all');
    setFilterType('all');
  }, []);

  const handleSearch = useCallback((_baseFilters: Record<string, string>): Record<string, string> => {
    const extra: Record<string, string> = {};
    if (filterOwnerLevel !== 'all') extra['owner_level'] = filterOwnerLevel;
    if (filterType !== 'all') extra['type'] = filterType;
    return extra;
  }, [filterOwnerLevel, filterType]);

  const hasModuleFilters = useMemo(
    () => filterOwnerLevel !== 'all' || filterType !== 'all',
    [filterOwnerLevel, filterType],
  );

  const renderSearchFilters = (
    <div className="grid grid-cols-12 gap-4 items-end">

      {/* Proprietário */}
      <div className="col-span-3 flex flex-col gap-1.5">
        <Label>Proprietário</Label>
        <Select value={filterOwnerLevel} onValueChange={setFilterOwnerLevel}>
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">—</SelectItem>
            <SelectItem value="master">Master</SelectItem>
            <SelectItem value="platform">Plataforma</SelectItem>
            <SelectItem value="tenant">Tenant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tipo */}
      <div className="col-span-3 flex flex-col gap-1.5">
        <Label>Tipo</Label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">—</SelectItem>
            <SelectItem value="module">Módulo</SelectItem>
            <SelectItem value="submodule">Submódulo</SelectItem>
            <SelectItem value="pivot">Pivot</SelectItem>
          </SelectContent>
        </Select>
      </div>

    </div>
  );

  if (selectedModule !== null) {
    return (
      <Container>
        <ModuleShowModal
          inline
          open={false}
          onOpenChange={() => {}}
          record={selectedModule}
          onSuccess={handleSuccess}
          onBack={handleBack}
          moduleId={MODULE_ID}
        />
      </Container>
    );
  }

  return (
    <ModuleInlineCtx.Provider value={handleGoInline}>
      <GenericGrid
        key={gridKey}
        moduleId={MODULE_ID}
        icon={LayoutGrid}
        columns={[
          {
            key: 'name',
            label: 'Nome',
            sortable: true,
            // meta: { style: { width: '' } },
            render: (value, record, openModal) => (
              <button
                className="text-left hover:underline cursor-pointer font-bold text-blue-600"
                onClick={() => openModal('show', record)}
              >
                {String(value ?? '—')}
              </button>
            ),
          },
          {
            key: 'slug',
            label: 'Slug',
            sortable: true,
            meta: { style: { width: '10%' } },
            render: (value) => (
              <Badge variant="info" appearance="light">
                {String(value ?? '—')}
              </Badge>
            ),
          },

          {
            key: 'order',
            label: 'Ordem',
            meta: { style: { width: '10%' } },
            render: (value) => (
              <Badge variant="info" appearance="light">
                {String(value ?? '—')}
              </Badge>
            ),
          },

          // {
          //   key: 'owner_level',
          //   label: 'Proprietário',
          //   sortable: true,
          //   meta: { style: { width: '12%' } },
          //   render: (value) => {
          //     const map: Record<string, { label: string; variant: 'primary' | 'secondary' | 'outline' }> = {
          //       master:   { label: 'Master',     variant: 'primary' },
          //       platform: { label: 'Plataforma', variant: 'secondary' },
          //       tenant:   { label: 'Tenant',     variant: 'outline' },
          //     };
          //     const opt = map[String(value)] ?? { label: String(value ?? '—'), variant: 'outline' as const };
          //     return <Badge variant={opt.variant}>{opt.label}</Badge>;
          //   },
          // },
          // {
          //   key: 'type',
          //   label: 'Tipo',
          //   sortable: true,
          //   meta: { style: { width: '10%' } },
          //   render: (value) => {
          //     const map: Record<string, { label: string; variant: 'primary' | 'secondary' | 'warning' }> = {
          //       module:    { label: 'Módulo',    variant: 'primary' },
          //       submodule: { label: 'Submódulo', variant: 'secondary' },
          //       pivot:     { label: 'Pivot',     variant: 'warning' },
          //     };
          //     const opt = map[String(value)] ?? { label: String(value ?? '—'), variant: 'secondary' as const };
          //     return <Badge variant={opt.variant}>{opt.label}</Badge>;
          //   },
          // },
        ]}
        modalComponent={ModuleModal}
        groupBy="computed"
        groupByCompute={(record) => `${record.owner_level}|${record.type}`}
        groupByLevel1Labels={{ master: 'MASTER', platform: 'PLATFORM', tenant: 'TENANT' }}
        groupByLabels={{ module: 'Módulo', submodule: 'Submódulo', pivot: 'Pivot' }}
        groupByOrder={[
          'master|module', 'master|submodule', 'master|pivot',
          'platform|module', 'platform|submodule', 'platform|pivot',
          'tenant|module', 'tenant|submodule', 'tenant|pivot',
        ]}
        renderSearchFilters={renderSearchFilters}
        onClearSearchFilters={handleClearSearchFilters}
        onSearch={handleSearch}
        hasModuleFilters={hasModuleFilters}
      />
    </ModuleInlineCtx.Provider>
  );
}
