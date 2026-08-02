export const protectedPaths = ["/dashboard", "/jobs", "/contacts", "/outreach", "/replies", "/workflow-runs", "/settings"] as const;
export function isProtectedPath(pathname: string) { return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)); }
export function routeRedirect(pathname: string, isAuthenticated: boolean) { if (isProtectedPath(pathname) && !isAuthenticated) return "/login"; if (pathname === "/login" && isAuthenticated) return "/dashboard"; return null; }
