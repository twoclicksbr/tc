import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getUrlTenantSlug } from '@/lib/tenant';
import { useAuth } from '@/auth/context/auth-context';

export interface Platform {
  id: number;
  name: string;
  slug: string;
  db_name: string;
}

interface PlatformContextValue {
  platforms: Platform[];
  refreshPlatforms: () => void;
  selectedPlatform: Platform | null;
  selectPlatform: (platform: Platform | null) => void;
}

const PlatformContext = createContext<PlatformContextValue>({
  platforms: [],
  refreshPlatforms: () => {},
  selectedPlatform: null,
  selectPlatform: () => {},
});

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const { auth } = useAuth();

  const fetchPlatforms = useCallback(() => {
    if (!auth?.access_token) {
      setPlatforms([]);
      return;
    }
    if (getUrlTenantSlug() !== 'master') return;
    apiGet<{ data: Platform[] }>('/v1/platforms?per_page=100&sort=order&direction=desc')
      .then((res) => setPlatforms(res.data))
      .catch(() => setPlatforms([]));
  }, [auth?.access_token]);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  function selectPlatform(platform: Platform | null) {
    setSelectedPlatform(platform);
  }

  return (
    <PlatformContext.Provider value={{ platforms, refreshPlatforms: fetchPlatforms, selectedPlatform, selectPlatform }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext);
}
