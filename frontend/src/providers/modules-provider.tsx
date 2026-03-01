import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getTenantSlug } from '@/lib/tenant';
import { usePlatform } from '@/providers/platform-provider';

export interface Module {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  type: string;
  owner_level: string;
  order: number;
  active: boolean;
}

interface ModulesContextValue {
  modules: Module[];
  loading: boolean;
  refreshModules: () => void;
}

const ModulesContext = createContext<ModulesContextValue>({
  modules: [],
  loading: false,
  refreshModules: () => {},
});

export function ModulesProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedPlatform } = usePlatform();

  const fetchModules = useCallback(() => {
    const tenant = getTenantSlug();
    setLoading(true);
    apiGet<{ data: Module[] }>(
      `/v1/${tenant}/modules?type=module&per_page=100&sort=order&direction=desc&active=true`,
    )
      .then((res) => setModules(res.data))
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules, selectedPlatform]);

  return (
    <ModulesContext.Provider value={{ modules, loading, refreshModules: fetchModules }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules(): ModulesContextValue {
  return useContext(ModulesContext);
}
