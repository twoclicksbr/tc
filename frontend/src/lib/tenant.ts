export function getTenantSlug(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Remove segmento 'sandbox' se presente: valsul.sandbox.tc.test → valsul
  const filtered = parts.filter((p) => p !== 'sandbox');

  if (filtered.length >= 3) {
    return filtered[0];
  }

  const slug = import.meta.env.VITE_TENANT_SLUG as string;
  if (!slug) {
    console.error('[getTenantSlug] VITE_TENANT_SLUG não definido no .env');
    return '';
  }
  return slug;
}

export function isSandbox(): boolean {
  return window.location.hostname.split('.').includes('sandbox');
}
