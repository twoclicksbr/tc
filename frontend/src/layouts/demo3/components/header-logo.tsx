import { ChevronDown, Globe, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTenantSlug, getUrlTenantSlug } from '@/lib/tenant';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SidebarMenu } from './sidebar-menu';
import { usePlatform } from '@/providers/platform-provider';

export function HeaderLogo() {
  const isAdmin = getUrlTenantSlug() === 'admin';

  const { platforms, selectedPlatform, selectPlatform } = usePlatform();

  const triggerLabel = selectedPlatform ? selectedPlatform.name : 'Principal';

  return (
    <div className="flex items-center gap-2.5">
      {/* Logo */}
      <div className="flex items-center justify-center lg:w-(--sidebar-width) shrink-0">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" mode="icon" className="-ms-2 lg:hidden">
              <Menu className="size-4!" />
            </Button>
          </SheetTrigger>
          <SheetContent
            className="p-0 gap-0 w-(--sidebar-width)"
            side="left"
            close={false}
          >
            <SheetHeader className="p-0 space-y-0" />
            <SheetBody className="p-0 overflow-y-auto">
              <SidebarMenu />
            </SheetBody>
          </SheetContent>
        </Sheet>

        <Link to="/" className="mx-1">
          <img
            src={toAbsoluteUrl('/media/logos/favicon-tc-dark.svg')}
            className="min-h-6"
            alt="logo"
          />
        </Link>
      </div>

      {/* Menu Section */}
      <div className="flex items-center gap-3">
        <h3 className="text-accent-foreground text-base hidden md:block">
          TwoClicks
        </h3>

        {/* Platform selector */}
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground font-medium">/</span>

          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer text-mono font-medium flex items-center gap-2">
                {triggerLabel}
                <ChevronDown className="size-3.5! text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={10} side="bottom" align="start">
                <DropdownMenuItem
                  className={cn(selectedPlatform === null && 'bg-accent')}
                  onSelect={() => selectPlatform(null)}
                >
                  <Globe className="size-4 opacity-60" />
                  Principal
                </DropdownMenuItem>
                {platforms.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    className={cn(selectedPlatform?.id === p.id && 'bg-accent')}
                    onSelect={() => selectPlatform(p)}
                  >
                    <Globe className="size-4 opacity-60" />
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-mono font-medium flex items-center gap-1.5">
              <Globe className="size-3.5 opacity-60" />
              {getTenantSlug()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
