import { ROUTE_MAP } from '@/lib/routeMap';

export function createPageUrl(pageName: string) {
    // pageName may include a query string, e.g. "MemberDetail?id=123"
    const [name, ...rest] = pageName.split('?');
    const query = rest.length ? `?${rest.join('?')}` : '';
    const mapped = (ROUTE_MAP as Record<string, string>)[name.trim()];
    if (mapped) return mapped + query;
    // Fallback: legacy behaviour for any unmapped page
    return '/' + name.replace(/ /g, '-') + query;
}