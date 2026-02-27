import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GenericModal } from '@/components/generic-modal';
import { PersonShowModal } from './person-show-modal';

export interface PersonForEdit {
  id: number;
  name: string;
  birth_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface PersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'delete' | 'show' | 'restore';
  record: PersonForEdit | null;
  onSuccess: () => void;
  moduleId: number;
  size?: 'p' | 'm' | 'g';
}

type FieldErrors = Record<string, string[]>;

// 'show-crm' = modal CRM de detalhes; os demais = GenericModal direto
type RenderMode = 'show-crm' | 'create' | 'edit' | 'delete' | 'restore';

function toRenderMode(mode: PersonModalProps['mode']): RenderMode {
  return mode === 'edit' || mode === 'show' ? 'show-crm' : (mode as RenderMode);
}

export function PersonModal({ open, onOpenChange, mode, record, onSuccess, moduleId, size }: PersonModalProps) {
  const [renderMode, setRenderMode] = useState<RenderMode>(toRenderMode(mode));

  const [name, setName]           = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [errors, setErrors]       = useState<FieldErrors>({});

  useEffect(() => {
    if (open) {
      setRenderMode(toRenderMode(mode));
      if (record) {
        setName(record.name);
        setBirthDate(record.birth_date?.split('T')[0] ?? '');
      } else {
        setName('');
        setBirthDate('');
      }
      setErrors({});
    }
  }, [open, record, mode]);

  function handleGetData(): Record<string, unknown> | null {
    return { name, birth_date: birthDate || null };
  }

  function handleErrors(errs: Record<string, string[]>) {
    setErrors(errs);
  }

  return (
    <>
      {/* Modal CRM show — abre quando mode é 'edit' ou 'show' */}
      <PersonShowModal
        open={open && renderMode === 'show-crm'}
        onOpenChange={(isOpen) => { if (!isOpen) onOpenChange(false); }}
        record={record}
        onSuccess={() => { onSuccess(); onOpenChange(false); }}
      />

      {/* Modal de formulário — abre para create/delete/restore */}
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
          saveDisabled={renderMode === 'create' && !name.trim()}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="person-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-birth-date">
              Data de Nascimento
            </Label>
            <Input
              id="person-birth-date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            {errors.birth_date && (
              <p className="text-sm text-destructive">{errors.birth_date[0]}</p>
            )}
          </div>
        </GenericModal>
      )}
    </>
  );
}
