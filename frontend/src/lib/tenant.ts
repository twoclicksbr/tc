export function getTenantSlug(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  if (parts.length >= 3) {
    return parts[0];
  }

  const slug = import.meta.env.VITE_TENANT_SLUG as string;
  if (!slug) {
    console.error('[getTenantSlug] VITE_TENANT_SLUG não definido no .env');
    return '';
  }
  return slug;
}
