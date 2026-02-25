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
import { apiFetch } from '@/lib/api';

interface TenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type FieldErrors = Record<string, string[]>;

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

export function TenantModal({ open, onOpenChange, onSuccess }: TenantModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [expirationDate, setExpirationDate] = useState(defaultExpiration);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setSlugManual(false);
      setExpirationDate(defaultExpiration());
      setActive(true);
      setErrors({});
    }
  }, [open]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setSlug(value);
  }

  async function handleSave() {
    setSaving(true);
    setErrors({});
    try {
      const res = await apiFetch('/v1/admin/tenants', {
        method: 'POST',
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criando registro</DialogTitle>
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
        </DialogBody>

        <DialogFooter className="flex-row justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="tenant-active"
              checked={active}
              onCheckedChange={setActive}
              size="sm"
            />
            <Label htmlFor="tenant-active" className="cursor-pointer">
              Ativo
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancelar
              </Button>
            </DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
