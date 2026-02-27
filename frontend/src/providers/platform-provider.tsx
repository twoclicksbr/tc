import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getUrlTenantSlug, setPlatformOverride } from '@/lib/tenant';

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

  const fetchPlatforms = useCallback(() => {
    if (getUrlTenantSlug() !== 'admin') return;
    apiGet<{ data: Platform[] }>('/v1/admin/platforms?per_page=100&sort=order&direction=asc')
      .then((res) => setPlatforms(res.data))
      .catch(() => setPlatforms([]));
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  function selectPlatform(platform: Platform | null) {
    setSelectedPlatform(platform);
    setPlatformOverride(platform ? platform.slug : null);
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
