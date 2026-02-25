import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiFetch, apiGet } from '@/lib/api';

export interface TenantForEdit {
  id: number;
  name: string;
  slug: string;
  expiration_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tenant?: TenantForEdit | null;
}

type FieldErrors = Record<string, string[]>;
type SlugStatus = 'idle' | 'checking' | 'available' | 'unavailable';

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

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function TenantModal({ open, onOpenChange, onSuccess, tenant }: TenantModalProps) {
  const isEdit = !!tenant;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [expirationDate, setExpirationDate] = useState(defaultExpiration);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Inicializa / reseta o formulário ao abrir
  useEffect(() => {
    if (open) {
      if (tenant) {
        setName(tenant.name);
        setSlug(tenant.slug);
        setSlugManual(true);
        setExpirationDate(tenant.expiration_date?.split('T')[0] ?? defaultExpiration());
        setActive(tenant.active);
      } else {
        setName('');
        setSlug('');
        setSlugManual(false);
        setExpirationDate(defaultExpiration());
        setActive(true);
      }
      setErrors({});
      setSlugStatus('idle');
    }
  }, [open, tenant]);

  // Verificação de disponibilidade do slug com debounce de 500ms
  useEffect(() => {
    if (!slug) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    const excludeId = tenant?.id;

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
  }, [slug, tenant?.id]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setSlug(value);
    // Limpa o erro de slug do servidor ao editar manualmente
    setErrors((prev) => { const e = { ...prev }; delete e.slug; return e; });
  }

  async function handleSave() {
    setSaving(true);
    setErrors({});
    try {
      const path = isEdit ? `/v1/admin/tenants/${tenant.id}` : '/v1/admin/tenants';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(path, {
        method,
        body: JSON.stringify({ name, slug, expiration_date: expirationDate, active }),
      });
      if (res.ok) {
        onOpenChange(false);
        onSuccess();
      } else {
        const json = await res.json().catch(() => ({}));
        if (res.status === 422 && json.errors) {
          setErrors(json.errors as FieldErrors);
        }
      }
    } catch {
      // network error
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Alterando registro' : 'Criando registro'}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
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

          {isEdit && (
            <p className="text-xs text-muted-foreground pt-1">
              Criado em: {formatDate(tenant.created_at)} | Alterado em: {formatDate(tenant.updated_at)}
            </p>
          )}
        </DialogBody>

        <DialogFooter className="flex-row justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="tenant-active"
              checked={active}
              onCheckedChange={setActive}
              size="sm"
            />
            {active ? (
              <Badge variant="primary" appearance="light" size="sm" className="cursor-pointer" onClick={() => setActive(false)}>Ativo</Badge>
            ) : (
              <Badge variant="destructive" appearance="light" size="sm" className="cursor-pointer" onClick={() => setActive(true)}>Inativo</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || slugStatus === 'unavailable' || slugStatus === 'checking'}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
