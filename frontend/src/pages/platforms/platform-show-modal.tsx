import { useState, useEffect } from 'react';
import { DatabaseZap, Eye, EyeOff, ScrollText, Server } from 'lucide-react';
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
import { Input, InputAddon, InputGroup } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet, apiPut } from '@/lib/api';
import { type PlatformForEdit } from './platform-modal';

interface PlatformShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PlatformForEdit | null;
  onSuccess: () => void;
}

interface PlatformCredentials {
  sand_password: string;
  prod_password: string;
  log_password: string;
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

function formatExpiration(v: string | null | undefined): React.ReactNode {
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
}

export function PlatformShowModal({ open, onOpenChange, record, onSuccess }: PlatformShowModalProps) {
  const [name, setName]                 = useState('');
  const [domain, setDomain]             = useState('');
  const [slug, setSlug]                 = useState('');
  const [slugManual, setSlugManual]     = useState(false);
  const [slugStatus, setSlugStatus]     = useState<SlugStatus>('idle');
  const [expirationDate, setExpirationDate] = useState('');
  const [active, setActive]                 = useState(true);
  const [saving, setSaving]             = useState(false);
  const [errors, setErrors]             = useState<FieldErrors>({});

  // Senhas carregadas sob demanda (endpoint /credentials)
  const [credentials, setCredentials]   = useState<PlatformCredentials | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [showSandPass, setShowSandPass] = useState(false);
  const [showProdPass, setShowProdPass] = useState(false);
  const [showLogPass, setShowLogPass]   = useState(false);

  // Reset ao abrir o modal
  useEffect(() => {
    if (open && record) {
      setName(record.name);
      setDomain(record.domain ?? '');
      setSlug(record.slug);
      setSlugManual(true);
      setExpirationDate(record.expiration_date?.split('T')[0] ?? '');
      setActive(record.active ?? true);
      setErrors({});
      setSlugStatus('idle');
      setSaving(false);
      setCredentials(null);
      setShowSandPass(false);
      setShowProdPass(false);
      setShowLogPass(false);
    }
  }, [open, record]);

  // Verificação de disponibilidade do slug com debounce de 500ms
  useEffect(() => {
    if (!slug) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (record?.id) params.set('exclude_id', String(record.id));
        const res = await apiGet<{ available: boolean }>(`/v1/admin/platforms/check-slug?${params}`);
        setSlugStatus(res.available ? 'available' : 'unavailable');
      } catch {
        setSlugStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, record?.id]);

  async function loadCredentials(): Promise<PlatformCredentials | null> {
    if (credentials) return credentials;
    if (!record) return null;
    setLoadingCreds(true);
    try {
      const data = await apiGet<PlatformCredentials>(`/v1/admin/platforms/${record.id}/credentials`);
      setCredentials(data);
      return data;
    } catch {
      return null;
    } finally {
      setLoadingCreds(false);
    }
  }

  async function handleTogglePassword(schema: 'sand' | 'prod' | 'log') {
    const isShown = schema === 'sand' ? showSandPass : schema === 'prod' ? showProdPass : showLogPass;
    if (!isShown && !credentials) {
      await loadCredentials();
    }
    if (schema === 'sand') setShowSandPass((v) => !v);
    if (schema === 'prod') setShowProdPass((v) => !v);
    if (schema === 'log')  setShowLogPass((v) => !v);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setSlug(value);
    setErrors((prev) => { const e = { ...prev }; delete e.slug; return e; });
  }

  async function handleSave() {
    if (slugStatus === 'checking' || slugStatus === 'unavailable') return;
    if (!record) return;
    setSaving(true);
    try {
      await apiPut(`/v1/admin/platforms/${record.id}`, { name, domain, slug, expiration_date: expirationDate, active });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { errors?: FieldErrors } };
      if (e?.status === 422 && e?.data?.errors) {
        setErrors(e.data.errors);
      }
    } finally {
      setSaving(false);
    }
  }

  function PasswordCell({ shown, password, onToggle }: { shown: boolean; password?: string; onToggle: () => void }) {
    return (
      <span className="text-sm font-normal text-foreground leading-6 font-mono flex items-center gap-2">
        {shown ? (password ?? '—') : '••••••••••••'}
        <button
          type="button"
          onClick={onToggle}
          disabled={loadingCreds}
          className="text-muted-foreground hover:text-foreground disabled:opacity-40"
          tabIndex={-1}
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    );
  }

  if (!record) return null;

  const dbLabel = record.db_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Plataforma</DialogTitle>
        </DialogHeader>

        <DialogBody className="p-0 flex flex-col flex-1">

          {/* #ID + Nome + Badge Ativo/Inativo | Validade (direita) */}
          <div className="flex items-center justify-between gap-2 px-6 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground font-normal text-base shrink-0">{formatId(record.id)}</span>
              <span className="text-xl font-bold leading-tight truncate">{record.name}</span>
              {record.active
                ? <Badge variant="success" appearance="light" className="shrink-0">Ativo</Badge>
                : <Badge variant="destructive" appearance="light" className="shrink-0">Inativo</Badge>
              }
            </div>
            <div className="shrink-0 flex flex-col items-end gap-0.5">
              <span className="text-xs text-muted-foreground">Validade</span>
              {formatExpiration(record.expiration_date)}
            </div>
          </div>

          {/* Datas — abaixo do nome */}
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

          <div className="flex flex-1 min-h-[400px]">

            {/* Tabs — largura total */}
            <div className="w-full flex flex-col">
              <Tabs defaultValue="overview" className="flex flex-col flex-1">
                <TabsList variant="line" className="px-4 shrink-0">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="documents">Documentos</TabsTrigger>
                  <TabsTrigger value="addresses">Endereços</TabsTrigger>
                  <TabsTrigger value="notes">Observação</TabsTrigger>
                  <TabsTrigger value="files">Arquivos</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex flex-col flex-1 pt-6 px-6 pb-0">
                  <div className="flex flex-col gap-4 flex-1">

                    {/* Nome + Domínio + Slug + Validade — mesma linha */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="show-name">
                          Nome <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="show-name"
                          value={name}
                          onChange={(e) => handleNameChange(e.target.value)}
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name[0]}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="show-domain">
                          Domínio <span className="text-destructive">*</span>
                        </Label>
                        <InputGroup>
                          <InputAddon>https://</InputAddon>
                          <Input
                            id="show-domain"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="exemplo.com.br"
                          />
                        </InputGroup>
                        {errors.domain && (
                          <p className="text-sm text-destructive">{errors.domain[0]}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="show-slug">
                          Slug <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="show-slug"
                          value={slug}
                          onChange={(e) => handleSlugChange(e.target.value)}
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
                        <Label htmlFor="show-expiration">
                          Validade <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="show-expiration"
                          type="date"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                        />
                        {errors.expiration_date && (
                          <p className="text-sm text-destructive">{errors.expiration_date[0]}</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Cards lado a lado — grid-cols-3 */}
                    <div className="grid grid-cols-3 gap-4">

                      {/* Card Sandbox */}
                      <div className="border border-border bg-accent/70 rounded-md shadow-none flex flex-col">
                        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2 flex items-center gap-2">
                          <DatabaseZap className="size-4" />
                          Sandbox
                        </h3>
                        <div className="bg-background rounded-md m-1 mt-0 border border-input py-4 px-3.5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-normal text-secondary-foreground/80 leading-6">Banco</span>
                            <span className="text-sm font-normal text-foreground leading-6 font-mono text-right">{dbLabel}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-normal text-secondary-foreground/80 leading-6">Usuário</span>
                            <span className="text-sm font-normal text-foreground leading-6 font-mono text-right">{record.sand_user || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-normal text-secondary-foreground/80 leading-6">Senha</span>
                            <PasswordCell
                              shown={showSandPass}
                              password={credentials?.sand_password}
                              onToggle={() => handleTogglePassword('sand')}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Produção */}
                      <div className="border border-border bg-accent/70 rounded-md shadow-none flex flex-col">
                        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2 flex items-center gap-2">
                          <Server className="size-4" />
                          Produção
                        </h3>
                        <div className="bg-background rounded-md m-1 mt-0 border border-input py-4 px-3.5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-normal text-secondary-foreground/80 leading-6">Banco</span>
                            <span className="text-sm font-normal text-foreground leading-6 font-mono text-right">{dbLabel}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-normal text-secondary-foreground/80 leading-6">Usuário</span>
                            <span className="text-sm font-normal text-foreground leading-6 font-mono text-right">{record.prod_user || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-normal text-secondary-foreground/80 leading-6">Senha</span>
                            <PasswordCell
                              shown={showProdPass}
                              password={credentials?.prod_password}
                              onToggle={() => handleTogglePassword('prod')}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Log */}
                      <div className="border border-border bg-accent/70 rounded-md shadow-none flex flex-col">
                        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2 flex items-center gap-2">
                          <ScrollText className="size-4" />
                          Log
                        </h3>
                        <div className="bg-background rounded-md m-1 mt-0 border border-input py-4 px-3.5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-normal text-secondary-foreground/80 leading-6">Banco</span>
                            <span className="text-sm font-normal text-foreground leading-6 font-mono text-right">{dbLabel}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-normal text-secondary-foreground/80 leading-6">Usuário</span>
                            <span className="text-sm font-normal text-foreground leading-6 font-mono text-right">{record.log_user || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-normal text-secondary-foreground/80 leading-6">Senha</span>
                            <PasswordCell
                              shown={showLogPass}
                              password={credentials?.log_password}
                              onToggle={() => handleTogglePassword('log')}
                            />
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                </TabsContent>

                <TabsContent value="documents" className="flex-1 p-6">
                  <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                </TabsContent>
                <TabsContent value="addresses" className="flex-1 p-6">
                  <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                </TabsContent>
                <TabsContent value="notes" className="flex-1 p-6">
                  <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                </TabsContent>
                <TabsContent value="files" className="flex-1 p-6">
                  <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                </TabsContent>

              </Tabs>
            </div>

          </div>

        </DialogBody>

        <DialogFooter className="flex-row sm:justify-between items-center">
          {/* Switch ativo/inativo */}
          <div className="flex items-center gap-2">
            <Switch
              id="platform-show-modal-active"
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
          </div>

          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Fechar</Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || slugStatus === 'checking' || slugStatus === 'unavailable'}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
