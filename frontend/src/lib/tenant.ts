// Slug override set by PlatformProvider when a platform is selected.
// When non-null, getTenantSlug() returns this instead of the URL-derived slug.
let _platformOverride: string | null = null;

export function setPlatformOverride(slug: string | null): void {
  _platformOverride = slug;
}

// Reads the tenant slug from the URL only — never affected by platform override.
// Used by auth calls (login/logout/me) that must always target the current tenant.
export function getUrlTenantSlug(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Remove segmento 'sandbox' se presente: valsul.sandbox.tc.test → valsul
  const filtered = parts.filter((p) => p !== 'sandbox');

  if (filtered.length >= 3) {
    // valsul.tc.test → 'valsul'   |   admin.tc.test → 'admin'
    return filtered[0];
  }

  if (filtered.length === 2) {
    // Domínio base sem subdomínio (tc.test, twoclicks.com.br) → admin
    return 'admin';
  }

  // filtered.length === 1 → localhost ou similar
  const slug = import.meta.env.VITE_TENANT_SLUG as string;
  if (!slug) {
    console.error('[getTenantSlug] VITE_TENANT_SLUG não definido no .env');
    return '';
  }
  return slug;
}

// Returns the active tenant slug for module/CRUD API calls.
// When a platform is selected via PlatformProvider, returns its slug instead.
export function getTenantSlug(): string {
  if (_platformOverride !== null) return _platformOverride;
  return getUrlTenantSlug();
}

export function isSandbox(): boolean {
  return window.location.hostname.split('.').includes('sandbox');
}
