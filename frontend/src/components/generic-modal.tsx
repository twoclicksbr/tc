import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch, apiGet } from '@/lib/api';
import { getTenantSlug } from '@/lib/tenant';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mode = 'create' | 'edit' | 'show' | 'delete' | 'restore';
type AfterAction = 'index' | 'show' | 'create' | 'edit';

interface ModuleConfig {
  id: number;
  name: string;
  name_url: string;
  after_store: AfterAction | null;
  after_update: AfterAction | null;
  after_restore: AfterAction | null;
}

export interface GenericModalProps {
  // Controle externo
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;

  // Tamanho: p = max-w-sm, m = max-w-lg (default), g = max-w-4xl
  size?: 'p' | 'm' | 'g';

  // Módulo — busca name_url + after_* via API
  moduleId: number;

  // Registro selecionado (qualquer módulo)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record?: Record<string, any> | null;

  // Callback chamado após ação bem-sucedida (ex: recarregar grid)
  onSuccess?: () => void;

  // Coleta de dados do formulário externo.
  // GenericModal chama isso antes de enviar. Retornar null aborta (validação falhou no pai).
  onGetData?: () => Record<string, unknown> | null;

  // Erros de campo (422) recebidos da API — repassados ao pai para exibir nos campos
  onErrors?: (errors: Record<string, string[]>) => void;

  // Visibilidade de botões
  btnCancel?: boolean;
  btnSave?: boolean;
  btnDelete?: boolean;
  showSwitch?: boolean;

  // Desabilita botão Salvar externamente (ex: slug sendo verificado)
  saveDisabled?: boolean;

  // Labels dos botões
  labelCancel?: string;
  labelSave?: string;
  labelDelete?: string;
  labelShow?: string; // label do botão único no mode show

  // Conteúdo
  tabs?: { label: string; content: React.ReactNode }[];
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TITLES: Record<Mode, string> = {
  create:  'Criando registro',
  edit:    'Alterando registro',
  show:    'Visualizando registro',
  delete:  'Deletando registro',
  restore: 'Restaurando registro',
};

const SIZE_CLASS: Record<'p' | 'm' | 'g', string> = {
  p: 'max-w-sm',
  m: 'max-w-lg',
  g: 'max-w-4xl',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenericModal({
  open,
  onOpenChange,
  mode,
  size = 'm',
  moduleId,
  record = null,
  onSuccess,
  onGetData,
  onErrors,
  btnCancel    = true,
  btnSave      = true,
  btnDelete    = true,
  showSwitch   = true,
  saveDisabled = false,
  labelCancel = 'Cancelar',
  labelSave   = 'Salvar',
  labelDelete = 'Deletar',
  labelShow   = 'Fechar',
  tabs,
  children,
}: GenericModalProps) {
  const tenant = getTenantSlug();

  // Config do módulo (name_url + after_*)
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig | null>(null);

  // Estado interno — inicializado a partir das props, pode evoluir após resposta da API
  const [internalMode, setInternalMode]     = useState<Mode>(mode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [internalRecord, setInternalRecord] = useState<Record<string, any> | null>(record ?? null);
  const [active, setActive]                 = useState<boolean>((record?.active as boolean) ?? true);
  const [saving, setSaving]                 = useState(false);

  // Sincroniza estado interno quando o modal (re)abre
  useEffect(() => {
    if (open) {
      setInternalMode(mode);
      setInternalRecord(record ?? null);
      setActive((record?.active as boolean) ?? true);
      setSaving(false);
    }
  }, [open, mode, record]);

  // Busca config do módulo uma vez por moduleId
  useEffect(() => {
    if (!moduleId || !tenant) return;
    apiGet<ModuleConfig>(`/v1/${tenant}/modules/${moduleId}`)
      .then(setModuleConfig)
      .catch((err) => console.error('[GenericModal] Erro ao buscar config do módulo:', err));
  }, [moduleId, tenant]);

  // ---------------------------------------------------------------------------
  // Derivações
  // ---------------------------------------------------------------------------

  const isReadOnly        = internalMode === 'show' || internalMode === 'delete';
  const showSwitchVisible = showSwitch && !isReadOnly;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleSave() {
    if (!moduleConfig) return;

    // Coleta dados do formulário externo; null = validação falhou
    const formData = onGetData ? onGetData() : {};
    if (formData === null) return;

    setSaving(true);
    try {
      const body   = { ...formData, active };
      const baseUrl = `/v1/${tenant}/${moduleConfig.name_url}`;
      const id      = internalRecord?.id as number | undefined;

      let path:   string;
      let method: string;

      if (internalMode === 'create') {
        path   = baseUrl;
        method = 'POST';
      } else if (internalMode === 'edit') {
        path   = `${baseUrl}/${id}`;
        method = 'PUT';
      } else if (internalMode === 'restore') {
        path   = `${baseUrl}/${id}/restore`;
        method = 'PATCH';
      } else {
        return;
      }

      const res = await apiFetch(path, { method, body: JSON.stringify(body) });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));

        const afterKey =
          internalMode === 'create'  ? 'after_store'   :
          internalMode === 'edit'    ? 'after_update'  :
                                       'after_restore';

        const afterAction: AfterAction = moduleConfig[afterKey] ?? 'index';

        switch (afterAction) {
          case 'index':
            onOpenChange(false);
            onSuccess?.();
            break;
          case 'show':
            setInternalRecord(json);
            setInternalMode('show');
            onSuccess?.();
            break;
          case 'create':
            setInternalRecord(null);
            setActive(true);
            setInternalMode('create');
            onSuccess?.();
            break;
          case 'edit':
            setInternalRecord(json);
            setActive((json?.active as boolean) ?? true);
            setInternalMode('edit');
            onSuccess?.();
            break;
        }
      } else {
        const json = await res.json().catch(() => ({}));
        if (res.status === 422 && json.errors) {
          onErrors?.(json.errors as Record<string, string[]>);
        }
      }
    } catch {
      // erro de rede — silencioso
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!moduleConfig || !internalRecord) return;
    setSaving(true);
    try {
      const res = await apiFetch(
        `/v1/${tenant}/${moduleConfig.name_url}/${internalRecord.id as number}`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        onOpenChange(false);
        onSuccess?.();
      }
    } catch {
      // erro de rede — silencioso
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Conteúdo
  // ---------------------------------------------------------------------------

  function renderBody() {
    if (tabs) {
      return (
        <Tabs defaultValue="0">
          <TabsList variant="line" className="mb-0">
            {tabs.map((tab, i) => (
              <TabsTrigger key={i} value={String(i)}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab, i) => (
            <TabsContent key={i} value={String(i)}>
              <div className={cn(isReadOnly && 'pointer-events-none opacity-60')}>
                {tab.content}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      );
    }

    return (
      <div className={cn('space-y-4', isReadOnly && 'pointer-events-none opacity-60')}>
        {children}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Botões do footer
  // ---------------------------------------------------------------------------

  function renderButtons() {
    if (internalMode === 'show') {
      return (
        <DialogClose asChild>
          <Button variant="outline" size="sm">{labelShow}</Button>
        </DialogClose>
      );
    }

    return (
      <>
        {btnCancel && (
          <DialogClose asChild>
            <Button variant="outline" size="sm">{labelCancel}</Button>
          </DialogClose>
        )}

        {internalMode === 'delete'
          ? btnDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? 'Deletando...' : labelDelete}
              </Button>
            )
          : btnSave && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || saveDisabled}
              >
                {saving ? 'Salvando...' : labelSave}
              </Button>
            )
        }
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={SIZE_CLASS[size]}
      >
        <DialogHeader>
          <DialogTitle>{TITLES[internalMode]}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {renderBody()}

          {/* Timestamps — visível quando o registro já existe */}
          {internalRecord && (internalRecord.created_at || internalRecord.updated_at) && (
            <div className="text-xs text-muted-foreground pt-1">
              <p>
                Criado em: {formatDate(internalRecord.created_at as string)} | Alterado em: {formatDate(internalRecord.updated_at as string)}
              </p>
              {internalRecord.deleted_at && (
                <p className="text-destructive mt-0.5">
                  Deletado em: {formatDate(internalRecord.deleted_at as string)}
                </p>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="flex-row sm:justify-between items-center">
          {/* Switch ativo/inativo — oculto no show e delete */}
          <div className="flex items-center gap-2">
            {showSwitchVisible && (
              <>
                <Switch
                  id="generic-modal-active"
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
              </>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
            {renderButtons()}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
