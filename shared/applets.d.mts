import type { Data, ModuleSettings } from "../src/types";
export type AppletCategory = "core" | "field" | "planning" | "admin";
export type AppletDefinition = {
  id: string;
  name: string;
  /** Shorter sidebar text when the name is long. */
  navName?: string;
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
/** UTF-8 byte size of the JSON text. */
export function jsonBytes(value: unknown): number;
export function validateModules(modules: unknown): ModuleSettings;
/** The applet that shows `page` (undefined for 바로가기·앱 안내). */
export function appletOfPage(page: string): AppletDefinition | undefined;
/** Remembers `page` for its multi-page applet; returns `saved` unchanged when nothing changes. */
export function rememberPage(saved: Record<string, string>, page: string): Record<string, string>;
/** The remembered page of `applet` if still valid, else its first page. */
export function restorePage(applet: { id: string; pages: readonly string[] }, saved: unknown): string;
