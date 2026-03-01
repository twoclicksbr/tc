import { createContext, useContext, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GenericModal } from '@/components/generic-modal';
import { apiGet } from '@/lib/api';
import { getTenantSlug } from '@/lib/tenant';
import { useModules } from '@/providers/modules-provider';
import { ModuleShowModal } from './module-show-modal';

// Context para interceptar show/edit e renderizar inline na página
export const ModuleInlineCtx = createContext<((record: ModuleForEdit) => void) | null>(null);

export interface ModuleForEdit {
  id: number;
  owner_level: 'master' | 'platform' | 'tenant';
  owner_id: number;
  slug: string;
  url_prefix: string | null;
  name: string;
  icon: string | null;
  type: 'module' | 'submodule' | 'pivot';
  model: string | null;
  request: string | null;
  controller: string | null;
  size_modal: 'p' | 'm' | 'g' | null;
  description_index: string | null;
  description_show: string | null;
  description_store: string | null;
  description_update: string | null;
  description_delete: string | null;
  description_restore: string | null;
  after_store: 'index' | 'show' | 'create' | 'edit' | null;
  after_update: 'index' | 'show' | 'create' | 'edit' | null;
  after_restore: 'index' | 'show' | 'create' | 'edit' | null;
  screen_index: string | null;
  screen_show: string | null;
  screen_create: string | null;
  screen_edit: string | null;
  screen_delete: string | null;
  screen_restore: string | null;
  order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface ModuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'delete' | 'show' | 'restore';
  record: ModuleForEdit | null;
  onSuccess: () => void;
  moduleId?: number;
  slug?: string;
  size?: 'p' | 'm' | 'g';
}

type FieldErrors = Record<string, string[]>;
type SlugStatus = 'idle' | 'checking' | 'available' | 'unavailable';

// 'show-crm' = modal CRM de detalhes; os demais = GenericModal direto
type RenderMode = 'show-crm' | 'create' | 'edit' | 'delete' | 'restore';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toRenderMode(mode: ModuleModalProps['mode']): RenderMode {
  return mode === 'edit' || mode === 'show' ? 'show-crm' : (mode as RenderMode);
}

export function ModuleModal({ open, onOpenChange, mode, record, onSuccess, moduleId, slug: slugProp, size }: ModuleModalProps) {
  const goInline = useContext(ModuleInlineCtx);
  const { refreshModules } = useModules();

  function handleSuccess() {
    onSuccess();
    refreshModules();
  }
  const [renderMode, setRenderMode] = useState<RenderMode>(toRenderMode(mode));

  const [name, setName]               = useState('');
  const [slug, setSlug]               = useState('');
  const [slugManual, setSlugManual]   = useState(false);
  const [slugStatus, setSlugStatus]   = useState<SlugStatus>('idle');
  const [type, setType]               = useState<string>('module');
  const [ownerLevel, setOwnerLevel]   = useState<string>('master');
  const [icon, setIcon]               = useState('');
  const [errors, setErrors]           = useState<FieldErrors>({});

  // Se há contexto inline disponível e o modo é show/edit, delega para a página
  useEffect(() => {
    if (!open) return;
    if ((mode === 'show' || mode === 'edit') && goInline && record) {
      goInline(record);
      onOpenChange(false);
    }
  }, [open, mode, goInline, record, onOpenChange]);

  useEffect(() => {
    if (open) {
      setRenderMode(toRenderMode(mode));
      if (record) {
        setName(record.name);
        setSlug(record.slug);
        setSlugManual(true);
        setType(record.type);
        setOwnerLevel(record.owner_level);
        setIcon(record.icon ?? '');
      } else {
        setName('');
        setSlug('');
        setSlugManual(false);
        setType('module');
        setOwnerLevel('master');
        setIcon('');
      }
      setErrors({});
      setSlugStatus('idle');
    }
  }, [open, record, mode]);

  // Verificação de disponibilidade do slug com debounce de 500ms
  useEffect(() => {
    if (renderMode !== 'create' && renderMode !== 'edit' && renderMode !== 'restore') return;
    if (!slug) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    const excludeId = record?.id;
    const tenant    = getTenantSlug();

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (excludeId) params.set('exclude_id', String(excludeId));
        const res = await apiGet<{ available: boolean }>(
          `/v1/${tenant}/modules/check-slug?${params}`,
        );
        setSlugStatus(res.available ? 'available' : 'unavailable');
      } catch {
        setSlugStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, record?.id, renderMode]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) {
      setSlug(slugify(value));
    }
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

  function handleGetData(): Record<string, unknown> | null {
    if (slugStatus === 'checking' || slugStatus === 'unavailable') return null;
    return {
      name,
      slug,
      type,
      owner_level: ownerLevel,
      owner_id: record?.owner_id ?? 0,
      icon: icon || null,
    };
  }

  function handleErrors(errs: Record<string, string[]>) {
    setErrors(errs);
  }

  return (
    <>
      {/* Modal CRM show — abre quando mode é 'edit' ou 'show' e não há contexto inline */}
      {!goInline && (
        <ModuleShowModal
          open={open && renderMode === 'show-crm'}
          onOpenChange={(isOpen) => { if (!isOpen) onOpenChange(false); }}
          record={record}
          onSuccess={() => { handleSuccess(); onOpenChange(false); }}
        />
      )}

      {/* Modal de formulário — abre para create/delete/restore */}
      {renderMode !== 'show-crm' && (
        <GenericModal
          open={open}
          onOpenChange={onOpenChange}
          mode={renderMode}
          size={size}
          moduleId={moduleId}
          slug={slugProp}
          record={record}
          onSuccess={handleSuccess}
          onSaveSuccess={(saved) => {
            if (renderMode === 'create' && goInline) {
              goInline(saved as ModuleForEdit);
            }
          }}
          onGetData={handleGetData}
          onErrors={handleErrors}
          saveDisabled={
            slugStatus === 'checking' ||
            slugStatus === 'unavailable' ||
            (renderMode === 'create' && (!name.trim() || !slug.trim()))
          }
        >
          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="module-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nome do módulo"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name[0]}</p>
            )}
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-slug">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="module-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="slug-do-modulo"
            />
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug[0]}</p>
            )}
            {!errors.slug && slugStatus === 'checking' && (
              <p className="text-sm text-muted-foreground">Verificando...</p>
            )}
            {!errors.slug && slugStatus === 'unavailable' && (
              <p className="text-sm text-destructive">Slug já em uso</p>
            )}
            {!errors.slug && slugStatus === 'available' && (
              <p className="text-sm text-green-600">Slug disponível</p>
            )}
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="module-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="module">Módulo</SelectItem>
                <SelectItem value="submodule">Submódulo</SelectItem>
                <SelectItem value="pivot">Pivot</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type[0]}</p>
            )}
          </div>

          {/* Proprietário */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-owner-level">Proprietário</Label>
            <Select value={ownerLevel} onValueChange={setOwnerLevel}>
              <SelectTrigger id="module-owner-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="master">Master</SelectItem>
                <SelectItem value="platform">Plataforma</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
              </SelectContent>
            </Select>
            {errors.owner_level && (
              <p className="text-sm text-destructive">{errors.owner_level[0]}</p>
            )}
          </div>

        </GenericModal>
      )}
    </>
  );
}
