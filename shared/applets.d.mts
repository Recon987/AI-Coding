import type { Data, ModuleSettings } from "../src/types";
export type AppletCategory = "core" | "field" | "planning" | "admin";
export type AppletDefinition = {
  id: string;
  name: string;
  icon: string;
  category: AppletCategory;
  description?: string;
  defaultEnabled?: boolean;
  /** Existing Page IDs the applet covers. */
  pages: string[];
};
export const CORE_APPLETS: AppletDefinition[];
export const MODULE_APPLETS: AppletDefinition[];
export const APPLET_CATEGORIES: Record<AppletCategory, string>;
/** Module IDs to show, in order (defaults computed in memory when nothing is saved). */
export function visibleModules(data: Partial<Data>): string[];
/** Every known module ID in menu order. */
export function moduleOrder(data: Partial<Data>): string[];
/** New settings showing these IDs in this order; unknown IDs and settings are carried over. */
export function withModules(data: Partial<Data>, shownInOrder: string[]): ModuleSettings;
/** Throws unless the setting is valid; unknown IDs/keys/settings are allowed and kept. */
export function validateModules(modules: unknown): ModuleSettings;
