import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiPut } from '@/lib/api';
import { getTenantSlug } from '@/lib/tenant';
import { type PersonForEdit } from './person-modal';

interface PersonShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PersonForEdit | null;
  onSuccess: () => void;
}

type FieldErrors = Record<string, string[]>;

function formatDateTimeBR(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function formatDateBR(value?: string | null): string {
  if (!value) return '—';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

function formatId(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

export function PersonShowModal({ open, onOpenChange, record, onSuccess }: PersonShowModalProps) {
  const [name, setName]           = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [active, setActive]       = useState(true);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<FieldErrors>({});

  useEffect(() => {
    if (open && record) {
      setName(record.name);
      setBirthDate(record.birth_date?.split('T')[0] ?? '');
      setActive(record.active ?? true);
      setErrors({});
      setSaving(false);
    }
  }, [open, record]);

  async function handleSave() {
    if (!record) return;
    setSaving(true);
    try {
      await apiPut(`/v1/${getTenantSlug()}/pessoas/${record.id}`, {
        name,
        birth_date: birthDate || null,
        active,
      });
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

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Pessoa</DialogTitle>
        </DialogHeader>

        <DialogBody className="p-0 flex flex-col flex-1">

          {/* #ID + Nome + Badge Ativo/Inativo | Nascimento (direita) */}
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
              <span className="text-xs text-muted-foreground">Nascimento</span>
              {record.birth_date
                ? <Badge variant="info" appearance="light">{formatDateBR(record.birth_date)}</Badge>
                : <span className="text-sm text-muted-foreground">—</span>
              }
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

                    {/* Nome + Data de Nascimento — 6:3 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem' }}>
                      <div style={{ gridColumn: 'span 6' }} className="flex flex-col gap-1.5">
                        <Label htmlFor="person-show-name">
                          Nome <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="person-show-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name[0]}</p>
                        )}
                      </div>

                      <div style={{ gridColumn: 'span 3' }} className="flex flex-col gap-1.5">
                        <Label htmlFor="person-show-birth-date">Data de Nascimento</Label>
                        <Input
                          id="person-show-birth-date"
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                        />
                        {errors.birth_date && (
                          <p className="text-sm text-destructive">{errors.birth_date[0]}</p>
                        )}
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
          <div className="flex items-center gap-2">
            <Switch
              id="person-show-modal-active"
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
              disabled={saving || !name.trim()}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
