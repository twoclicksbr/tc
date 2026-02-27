import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GenericModal } from '@/components/generic-modal';
import { apiGet } from '@/lib/api';
import { TenantShowModal } from './tenant-show-modal';

export interface TenantForEdit {
  id: number;
  name: string;
  slug: string;
  db_name: string;
  sand_user?: string;
  prod_user?: string;
  log_user?: string;
  expiration_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface TenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'delete' | 'show' | 'restore';
  record: TenantForEdit | null;
  onSuccess: () => void;
  moduleId: number;
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

function defaultExpiration(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function toRenderMode(mode: TenantModalProps['mode']): RenderMode {
  return mode === 'edit' || mode === 'show' ? 'show-crm' : (mode as RenderMode);
}

export function TenantModal({ open, onOpenChange, mode, record, onSuccess, moduleId, size }: TenantModalProps) {
  // Dispatcher: 'edit' e 'show' abrem o modal CRM; os demais vão direto para GenericModal
  const [renderMode, setRenderMode] = useState<RenderMode>(toRenderMode(mode));

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [expirationDate, setExpirationDate] = useState(defaultExpiration);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Reset ao abrir: define renderMode e preenche o formulário
  useEffect(() => {
    if (open) {
      setRenderMode(toRenderMode(mode));
      if (record) {
        setName(record.name);
        setSlug(record.slug);
        setSlugManual(true);
        setExpirationDate(record.expiration_date?.split('T')[0] ?? defaultExpiration());
      } else {
        setName('');
        setSlug('');
        setSlugManual(false);
        setExpirationDate(defaultExpiration());
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

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (excludeId) params.set('exclude_id', String(excludeId));
        const res = await apiGet<{ available: boolean }>(
          `/v1/admin/tenants/check-slug?${params}`,
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
    setSlug(value);
    setErrors((prev) => { const e = { ...prev }; delete e.slug; return e; });
  }

  function handleGetData(): Record<string, unknown> | null {
    if (slugStatus === 'checking' || slugStatus === 'unavailable') return null;
    return { name, slug, expiration_date: expirationDate };
  }

  function handleErrors(errs: Record<string, string[]>) {
    setErrors(errs);
  }

  return (
    <>
      {/* Modal CRM show — abre quando mode é 'edit' ou 'show' */}
      <TenantShowModal
        open={open && renderMode === 'show-crm'}
        onOpenChange={(isOpen) => { if (!isOpen) onOpenChange(false); }}
        record={record}
        onSuccess={() => { onSuccess(); onOpenChange(false); }}
      />

      {/* Modal de formulário — abre para create/edit/delete/restore */}
      {renderMode !== 'show-crm' && (
        <GenericModal
          open={open}
          onOpenChange={onOpenChange}
          mode={renderMode}
          size={size}
          moduleId={moduleId}
          record={record}
          onSuccess={onSuccess}
          onGetData={handleGetData}
          onErrors={handleErrors}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tenant-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nome do tenant"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-slug">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tenant-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="slug-do-tenant"
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-expiration">
              Validade <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tenant-expiration"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
            {errors.expiration_date && (
              <p className="text-sm text-destructive">{errors.expiration_date[0]}</p>
            )}
          </div>
        </GenericModal>
      )}
    </>
  );
}
