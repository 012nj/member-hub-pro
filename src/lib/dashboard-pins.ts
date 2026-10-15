import type { UserRole } from "@/types";

const storageKey = (userId: string) => `khwwc_dashboard_pins:${userId}`;

export function getDashboardPins(userId: string, availableRoles: UserRole[]): UserRole[] {
  try {
    const value = localStorage.getItem(storageKey(userId));
    const saved: unknown = value ? JSON.parse(value) : [];
    if (!Array.isArray(saved)) return [];
    return saved.filter((role): role is UserRole => availableRoles.includes(role));
  } catch {
    return [];
  }
}

export function saveDashboardPins(userId: string, roles: UserRole[], availableRoles: UserRole[]): UserRole[] {
  const permitted = [...new Set(roles.filter((role) => availableRoles.includes(role)))];
  localStorage.setItem(storageKey(userId), JSON.stringify(permitted));
  return permitted;
}
