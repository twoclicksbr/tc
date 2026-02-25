import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface Item {
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  title: string;
}

export function SidebarMenu() {
  const { pathname } = useLocation();

  const items: Item[] = [
    { icon: Users,            path: '/pessoas',      title: 'Pessoas' },
    { icon: ShoppingCart,     path: '/compras',      title: 'Compras' },
    { icon: TrendingUp,       path: '/vendas',       title: 'Vendas' },
    { icon: BarChart3,        path: '/financeiro',   title: 'Financeiro' },
    { icon: ArrowUpCircle,    path: '/pagar',        title: 'Pagar' },
    { icon: ArrowDownCircle,  path: '/receber',      title: 'Receber' },
    { icon: Settings,         path: '/configuracao', title: 'Configuração' },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col grow items-center py-3.5 lg:py-0 gap-2.5">
        {items.map((item, index) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Tooltip key={index}>
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
                  <Link to={item.path}>
                    <item.icon className="size-4.5!" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
