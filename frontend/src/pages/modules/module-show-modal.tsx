import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { IconPickerModal } from '@/components/icon-picker-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet, apiPut } from '@/lib/api';
import { useModules } from '@/providers/modules-provider';
import { type ModuleForEdit } from './module-modal';
import { ModuleFieldsTab } from './module-fields-tab';
import { ModuleLayoutTab } from './components/module-layout-tab';

interface ModuleShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ModuleForEdit | null;
  onSuccess: () => void;
  inline?: boolean;
  onBack?: () => void;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'unavailable';
type FieldErrors = Record<string, string[]>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDateTimeBR(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function formatId(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

const TYPE_LABELS: Record<string, { label: string; variant: 'primary' | 'secondary' | 'warning' }> = {
  module:    { label: 'Módulo',    variant: 'primary' },
  submodule: { label: 'Submódulo', variant: 'secondary' },
  pivot:     { label: 'Pivot',     variant: 'warning' },
};

export function ModuleShowModal({ open, onOpenChange, record, onSuccess, inline = false, onBack }: ModuleShowModalProps) {
  const { refreshModules } = useModules();
  const [name, setName]             = useState('');
  const [slug, setSlug]             = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [icon, setIcon]             = useState('');
  const [type, setType]             = useState('module');
  const [urlPrefix, setUrlPrefix]   = useState('');
  const [isCustom, setIsCustom]     = useState(false);
  const [model, setModel]           = useState('');
  const [request, setRequest]       = useState('');
  const [controller, setController] = useState('');
  const [observer, setObserver]     = useState('');
  const [service, setService]       = useState('');
  const [active, setActive]         = useState(true);
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState<FieldErrors>({});
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [activeTab, setActiveTab]   = useState('dados');
  const [submodules, setSubmodules] = useState<Array<{ id: number; name: string; icon: string | null }>>([]);
  const [scanFiles, setScanFiles]   = useState<{
    models: string[];
    requests: string[];
    controllers: Record<string, string[]>;
    observers: string[];
    services: string[];
  } | null>(null);

  useEffect(() => {
    if ((open || inline) && record) {
      setName(record.name);
      setSlug(record.slug);
      setSlugManual(true);
      setIcon(record.icon ?? '');
      setType(record.type);
      setUrlPrefix(record.url_prefix ?? '');
      setIsCustom(record.is_custom ?? false);
      setModel(record.model ?? '');
      setRequest(record.request ?? '');
      setController(record.controller ?? '');
      setObserver(record.observer ?? '');
      setService(record.service ?? '');
      setActive(record.active ?? true);
      setErrors({});
      setSlugStatus('idle');
      setSaving(false);
      setActiveTab('dados');
    }
  }, [open, inline, record]);

  // Busca arquivos disponíveis (apenas quando isCustom=true)
  useEffect(() => {
    if ((!open && !inline) || !isCustom) return;
    apiGet<{
      models: string[];
      requests: string[];
      controllers: Record<string, string[]>;
      observers: string[];
      services: string[];
    }>(`/v1/modules/scan-files`)
      .then(setScanFiles)
      .catch(() => {});
  }, [open, inline, isCustom]);

  // Busca submódulos disponíveis (apenas quando type=module)
  useEffect(() => {
    if ((!open && !inline) || type !== 'module') { setSubmodules([]); return; }
    apiGet<{ data: Array<{ id: number; name: string; icon: string | null }> }>(
      `/v1/modules?type=submodule&per_page=100&active=true&sort=order&direction=desc`,
    )
      .then((res) => setSubmodules(res.data))
      .catch(() => {});
  }, [open, inline, type]);

  // Verificação de slug com debounce de 500ms
  useEffect(() => {
    if (!open && !inline) return;
    if (!slug) { setSlugStatus('idle'); return; }

    setSlugStatus('checking');
    const excludeId = record?.id;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (excludeId) params.set('exclude_id', String(excludeId));
        const res = await apiGet<{ available: boolean }>(
          `/v1/modules/check-slug?${params}`,
        );
        setSlugStatus(res.available ? 'available' : 'unavailable');
      } catch {
        setSlugStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, record?.id, open, inline]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    const sanitized = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-');
    setSlug(sanitized);
    setErrors((prev) => { const e = { ...prev }; delete e.slug; return e; });
  }

  async function handleSave() {
    if (!record) return;
    if (slugStatus === 'checking' || slugStatus === 'unavailable') return;
    setSaving(true);
    try {
      await apiPut(`/v1/modules/${record.id}`, {
        name,
        slug,
        url_prefix: urlPrefix || null,
        icon: icon || null,
        type,
        is_custom: isCustom,
        model:      isCustom ? model      : 'GenericModel',
        request:    isCustom ? request    : 'GenericRequest',
        controller: isCustom ? controller : 'GenericController',
        observer:   isCustom ? observer   : 'GenericObserver',
        service:    isCustom ? service    : 'GenericService',
        active,
      });
      onSuccess();
      refreshModules();
      if (!inline) onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { errors?: FieldErrors } };
      if (e?.status === 422 && e?.data?.errors) {
        setErrors(e.data.errors);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!record) return null;

  const typeInfo     = TYPE_LABELS[record.type] ?? { label: record.type, variant: 'secondary' as const };
  const saveDisabled = saving || !name.trim() || !slug.trim() || slugStatus === 'checking' || slugStatus === 'unavailable';

  const resolved = icon ? (LucideIcons as Record<string, unknown>)[icon] : undefined;
  const LucideIcon: React.ComponentType<{ className?: string }> | null = (
    resolved != null ? resolved as React.ComponentType<{ className?: string }> : null
  );

  // ── Shared JSX sections ────────────────────────────────────────────────────

  const dadosTabContent = (
    <div className="flex flex-col gap-4">

      {/* Card Identificação */}
      <div data-slot="card" className="items-stretch text-card-foreground border border-border bg-accent/70 rounded-md shadow-none flex flex-col">
        <div data-slot="card-content" className="grow p-0 flex flex-col">
          <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">Identificação</h3>
          <div className="bg-background rounded-md m-1 mt-0 border border-input py-3 px-3.5">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem' }}>

              {/* Linha 1: Nome | Ícone | Tipo | Customizado */}
              <div style={{ gridColumn: 'span 1' }} className="flex flex-col gap-1.5">
                <Label>Ícone</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-8.5 p-0"
                  title={icon || 'Clique para selecionar ícone'}
                  onClick={() => setIconPickerOpen(true)}
                >
                  {LucideIcon && <LucideIcon className="size-[18px]" />}
                </Button>
              </div>

              <div style={{ gridColumn: 'span 3' }} className="flex flex-col gap-1.5">
                <Label htmlFor="mod-show-name">Nome <span className="text-destructive">*</span></Label>
                <Input
                  id="mod-show-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
              </div>

              <div style={{ gridColumn: 'span 2' }} className="flex flex-col gap-1.5">
                <Label htmlFor="mod-show-type">Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="mod-show-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="module">Módulo</SelectItem>
                    <SelectItem value="submodule">Submódulo</SelectItem>
                    <SelectItem value="pivot">Pivot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div style={{ gridColumn: 'span 2' }} className="flex flex-col gap-1.5">
                <Label htmlFor="mod-show-slug">Slug <span className="text-destructive">*</span></Label>
                <Input
                  id="mod-show-slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug[0]}</p>}
                {!errors.slug && slugStatus === 'checking'    && <p className="text-xs text-muted-foreground">Verificando...</p>}
                {!errors.slug && slugStatus === 'unavailable' && <p className="text-xs text-destructive">Slug já em uso</p>}
                {!errors.slug && slugStatus === 'available'   && <p className="text-xs text-green-600">Slug disponível</p>}
              </div>

              <div style={{ gridColumn: 'span 3' }} className="flex flex-col gap-1.5">
                <Label htmlFor="mod-show-url-prefix">Prefixo URL</Label>
                <div className="flex">
                  <Input
                    id="mod-show-url-prefix"
                    value={urlPrefix}
                    onChange={(e) => setUrlPrefix(e.target.value)}
                    placeholder="prefixo"
                    className="rounded-r-none border-r-0 z-10"
                  />
                  <span className="inline-flex items-center px-3 border border-l-0 rounded-r-md bg-muted text-sm text-muted-foreground whitespace-nowrap">
                    /{slug}
                  </span>
                </div>
              </div>

              <div style={{ gridColumn: 'span 1' }} className="flex flex-col gap-1.5">
                <Label>Customizado</Label>
                <div className="flex items-center gap-2 h-8.5">
                  <Switch
                    id="mod-show-is-custom"
                    checked={isCustom}
                    onCheckedChange={setIsCustom}
                    size="sm"
                  />
                  {isCustom ? (
                    <Badge
                      variant="primary"
                      appearance="light"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setIsCustom(false)}
                    >
                      Sim
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      appearance="light"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setIsCustom(true)}
                    >
                      Não
                    </Badge>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Card Configuração — visível apenas quando isCustom=true */}
      {isCustom && (
        <div data-slot="card" className="items-stretch text-card-foreground border border-border bg-accent/70 rounded-md shadow-none flex flex-col">
          <div data-slot="card-content" className="grow p-0 flex flex-col">
            <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">Configuração</h3>
            <div className="bg-background rounded-md m-1 mt-0 border border-input py-3 px-3.5">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem' }}>

                <div style={{ gridColumn: 'span 2' }} className="flex flex-col gap-1.5">
                  <Label htmlFor="mod-show-model">Model</Label>
                  <Select value={model || '__none__'} onValueChange={v => setModel(v === '__none__' ? '' : v)}>
                    <SelectTrigger id="mod-show-model"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">— selecione —</SelectItem>
                      {(scanFiles?.models ?? []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.model && <p className="text-sm text-destructive">{errors.model[0]}</p>}
                </div>

                <div style={{ gridColumn: 'span 2' }} className="flex flex-col gap-1.5">
                  <Label htmlFor="mod-show-request">Request</Label>
                  <Select value={request || '__none__'} onValueChange={v => setRequest(v === '__none__' ? '' : v)}>
                    <SelectTrigger id="mod-show-request"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">— selecione —</SelectItem>
                      {(scanFiles?.requests ?? []).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.request && <p className="text-sm text-destructive">{errors.request[0]}</p>}
                </div>

                <div style={{ gridColumn: 'span 2' }} className="flex flex-col gap-1.5">
                  <Label htmlFor="mod-show-controller">Controller</Label>
                  <Select value={controller || '__none__'} onValueChange={v => setController(v === '__none__' ? '' : v)}>
                    <SelectTrigger id="mod-show-controller"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">— selecione —</SelectItem>
                      {Object.entries(scanFiles?.controllers ?? {}).map(([group, items]) =>
                        items.map(c => {
                          const val = group === 'Raiz' ? c : `${group}\\${c}`;
                          return <SelectItem key={val} value={val}>{val}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                  {errors.controller && <p className="text-sm text-destructive">{errors.controller[0]}</p>}
                </div>

                <div style={{ gridColumn: 'span 2' }} className="flex flex-col gap-1.5">
                  <Label htmlFor="mod-show-observer">Observer</Label>
                  <Select value={observer || '__none__'} onValueChange={v => setObserver(v === '__none__' ? '' : v)}>
                    <SelectTrigger id="mod-show-observer"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">— selecione —</SelectItem>
                      {(scanFiles?.observers ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.observer && <p className="text-sm text-destructive">{errors.observer[0]}</p>}
                </div>

                <div style={{ gridColumn: 'span 2' }} className="flex flex-col gap-1.5">
                  <Label htmlFor="mod-show-service">Service</Label>
                  <Select value={service || '__none__'} onValueChange={v => setService(v === '__none__' ? '' : v)}>
                    <SelectTrigger id="mod-show-service"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">— selecione —</SelectItem>
                      {(scanFiles?.services ?? []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.service && <p className="text-sm text-destructive">{errors.service[0]}</p>}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Submódulos — visível apenas quando type=module */}
      {type === 'module' && (
        <div data-slot="card" className="items-stretch text-card-foreground border border-border bg-accent/70 rounded-md shadow-none flex flex-col">
          <div data-slot="card-content" className="grow p-0 flex flex-col min-h-0">
            <h3 className="text-sm font-medium text-foreground py-2.5 ps-2 shrink-0">Submódulos</h3>
            <div className="bg-background rounded-md m-1 mt-0 border border-input py-3 px-3.5 overflow-y-auto flex-1">
              {submodules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum submódulo disponível.</p>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {submodules.map((sub) => {
                    const SubIcon = sub.icon
                      ? ((LucideIcons as Record<string, unknown>)[sub.icon] as React.ComponentType<{ className?: string }> | undefined)
                      : undefined;
                    return (
                      <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox size="sm" />
                        {SubIcon && <SubIcon className="size-3.5 text-muted-foreground shrink-0" />}
                        <span className="text-sm">{sub.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );

  const footerLeft = (
    <div className="flex items-center gap-2">
      {activeTab === 'dados' && <>
        <Switch
          id="mod-show-active"
          checked={active}
          onCheckedChange={setActive}
          size="sm"
        />
        {active ? (
          <Badge
            variant="primary"
            appearance="light"
            size="sm"
            className="cursor-pointer"
            onClick={() => setActive(false)}
          >
            Ativo
          </Badge>
        ) : (
          <Badge
            variant="destructive"
            appearance="light"
            size="sm"
            className="cursor-pointer"
            onClick={() => setActive(true)}
          >
            Inativo
          </Badge>
        )}
      </>}
    </div>
  );

  const saveButton = (
    <Button size="sm" onClick={handleSave} disabled={saveDisabled}>
      {saving ? 'Salvando...' : 'Salvar'}
    </Button>
  );

  const iconPicker = (
    <IconPickerModal
      open={iconPickerOpen}
      onClose={() => setIconPickerOpen(false)}
      onSelect={(iconName) => { setIcon(iconName); setIconPickerOpen(false); }}
      selected={icon}
    />
  );

  // ── Inline rendering ──────────────────────────────────────────────────────

  if (inline) {
    return (
      <>
        {/* Linha 1: ← Voltar | #ID + Nome + [Ativo]          [Módulo] */}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground shrink-0 -ml-1"
              onClick={onBack}
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Button>
            <span className="text-muted-foreground font-normal text-base shrink-0">{formatId(record.id)}</span>
            <span className="text-xl font-bold leading-tight truncate">{record.name}</span>
            {record.active
              ? <Badge variant="success" appearance="light" className="shrink-0">Ativo</Badge>
              : <Badge variant="destructive" appearance="light" className="shrink-0">Inativo</Badge>
            }
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
          </div>
        </div>

        {/* Linha 2: Timestamps */}
        <div className="flex gap-6 flex-wrap px-4 pb-3">
          <p className="text-xs text-muted-foreground">
            Criado em: <span className="font-medium text-foreground">{formatDateTimeBR(record.created_at)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Alterado em: <span className="font-medium text-foreground">{formatDateTimeBR(record.updated_at)}</span>
          </p>
          {record.deleted_at && (
            <p className="text-xs text-destructive">
              Deletado em: <span className="font-medium">{formatDateTimeBR(record.deleted_at)}</span>
            </p>
          )}
        </div>

        <Separator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
          <TabsList variant="line" className="px-4 shrink-0">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="campos">Campos</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="restricoes">Restrições</TabsTrigger>
            <TabsTrigger value="seeds">Seeds</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="pt-5 px-4 pb-4">
            {dadosTabContent}
          </TabsContent>
          <TabsContent value="campos" className="p-4">
            <ModuleFieldsTab moduleId={record.id} mode="edit" active={activeTab === 'campos'} />
          </TabsContent>
          <TabsContent value="layout" className="p-0 flex flex-1 overflow-hidden">
            <ModuleLayoutTab moduleId={record.id} />
          </TabsContent>
          <TabsContent value="grid" className="p-4">
            <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
          </TabsContent>
          <TabsContent value="form" className="p-4">
            <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
          </TabsContent>
          <TabsContent value="restricoes" className="p-4">
            <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
          </TabsContent>
          <TabsContent value="seeds" className="p-4">
            <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
          </TabsContent>
        </Tabs>

        <div className="flex flex-row sm:justify-between items-center border-t px-4 py-3 shrink-0">
          {footerLeft}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBack}>Cancelar</Button>
            {saveButton}
          </div>
        </div>

        {iconPicker}
      </>
    );
  }

  // ── Dialog rendering ──────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-6xl h-[85vh]">
        <DialogHeader>
          <DialogTitle>Detalhes do Módulo</DialogTitle>
        </DialogHeader>

        <DialogBody className="p-0 flex flex-col flex-1 overflow-hidden">

          {/* #ID + Nome + Badges */}
          <div className="flex items-center justify-between gap-2 px-6 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground font-normal text-base shrink-0">{formatId(record.id)}</span>
              <span className="text-xl font-bold leading-tight truncate">{record.name}</span>
              {record.active
                ? <Badge variant="success" appearance="light" className="shrink-0">Ativo</Badge>
                : <Badge variant="destructive" appearance="light" className="shrink-0">Inativo</Badge>
              }
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex gap-6 flex-wrap px-6 pb-3">
            <p className="text-xs text-muted-foreground">
              Criado em: <span className="font-medium text-foreground">{formatDateTimeBR(record.created_at)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Alterado em: <span className="font-medium text-foreground">{formatDateTimeBR(record.updated_at)}</span>
            </p>
            {record.deleted_at && (
              <p className="text-xs text-destructive">
                Deletado em: <span className="font-medium">{formatDateTimeBR(record.deleted_at)}</span>
              </p>
            )}
          </div>

          <Separator />

          <div className="flex flex-1 overflow-hidden">
            <div className="w-full flex flex-col overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
                <TabsList variant="line" className="px-4 shrink-0">
                  <TabsTrigger value="dados">Dados</TabsTrigger>
                  <TabsTrigger value="campos">Campos</TabsTrigger>
                  <TabsTrigger value="layout">Layout</TabsTrigger>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                  <TabsTrigger value="form">Form</TabsTrigger>
                  <TabsTrigger value="restricoes">Restrições</TabsTrigger>
                  <TabsTrigger value="seeds">Seeds</TabsTrigger>
                </TabsList>

                <TabsContent value="dados" className="flex flex-col flex-1 overflow-y-auto pt-5 px-6 pb-4">
                  {dadosTabContent}
                </TabsContent>
                <TabsContent value="campos" className="flex-1 overflow-y-auto p-6">
                  <ModuleFieldsTab moduleId={record.id} mode="edit" active={activeTab === 'campos'} />
                </TabsContent>
                <TabsContent value="layout" className="flex-1 flex overflow-hidden p-0">
                  <ModuleLayoutTab moduleId={record.id} />
                </TabsContent>
                <TabsContent value="grid" className="flex-1 overflow-y-auto p-6">
                  <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                </TabsContent>
                <TabsContent value="form" className="flex-1 overflow-y-auto p-6">
                  <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                </TabsContent>
                <TabsContent value="restricoes" className="flex-1 overflow-y-auto p-6">
                  <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                </TabsContent>
                <TabsContent value="seeds" className="flex-1 overflow-y-auto p-6">
                  <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                </TabsContent>
              </Tabs>
            </div>
          </div>

        </DialogBody>

        <DialogFooter className="flex-row sm:justify-between items-center">
          {footerLeft}
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancelar</Button>
            </DialogClose>
            {saveButton}
          </div>
        </DialogFooter>
      </DialogContent>

      {iconPicker}
    </Dialog>
  );
}
