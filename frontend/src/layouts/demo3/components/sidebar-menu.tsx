import * as LucideIcons from 'lucide-react';
import { CircleDot, LayoutDashboard } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getUrlTenantSlug } from '@/lib/tenant';
import { usePlatform } from '@/providers/platform-provider';
import { useModules } from '@/providers/modules-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function DynamicIcon({ name, className }: { name: string | null; className?: string }) {
  if (name) {
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
    if (Icon) return <Icon className={className} />;
  }
  return <CircleDot className={className} />;
}

export function SidebarMenu() {
  const { pathname } = useLocation();
  const isAdmin = getUrlTenantSlug() === 'admin';
  const { selectedPlatform } = usePlatform();
  const { modules } = useModules();

  const dashboardPath = '/dashboard';
  const isDashboardActive = pathname === dashboardPath || pathname.startsWith(dashboardPath + '/');

  return (
    <TooltipProvider>
      <div className="flex flex-col grow items-center py-3.5 lg:py-0 gap-2.5">

        {/* Dashboard — hardcoded, sempre visível */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              shape="circle"
              mode="icon"
              {...(isDashboardActive ? { 'data-state': 'open' } : {})}
              className={cn(
                'data-[state=open]:bg-background data-[state=open]:border data-[state=open]:border-input data-[state=open]:text-primary',
                'hover:bg-background hover:border hover:border-input hover:text-primary',
              )}
            >
              <Link to={dashboardPath}>
                <LayoutDashboard className="size-4.5!" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Dashboard</TooltipContent>
        </Tooltip>

        {/* Itens dinâmicos da tabela modules */}
        {modules.map((mod) => {
          if (mod.slug === 'platforms' && !(isAdmin && !selectedPlatform)) return null;
          if (mod.slug === 'tenants' && !isAdmin) return null;

          const path = `/${mod.slug}`;
          const isActive = pathname === path || pathname.startsWith(path + '/');

          return (
            <Tooltip key={mod.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  shape="circle"
                  mode="icon"
                  {...(isActive ? { 'data-state': 'open' } : {})}
                  className={cn(
                    'data-[state=open]:bg-background data-[state=open]:border data-[state=open]:border-input data-[state=open]:text-primary',
                    'hover:bg-background hover:border hover:border-input hover:text-primary',
                  )}
                >
                  <Link to={path}>
                    <DynamicIcon name={mod.icon} className="size-4.5!" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{mod.name}</TooltipContent>
            </Tooltip>
          );
        })}

      </div>
    </TooltipProvider>
  );
}
