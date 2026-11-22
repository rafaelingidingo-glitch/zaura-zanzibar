// Site settings + editable content blocks, backed by the DB with safe defaults.

import { db } from "./db";
import { SETTING_DEFAULTS, type SettingKey } from "./constants";

export type SiteSettings = Record<SettingKey, string>;

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    if (row.value !== null && row.value !== undefined && row.value !== "") {
      map[row.key as SettingKey] = row.value;
    }
  }
  return map as SiteSettings;
}

export async function saveSettings(partial: Partial<Record<SettingKey, string>>): Promise<void> {
  const entries = Object.entries(partial).filter(([, v]) => typeof v === "string");
  for (const [key, value] of entries) {
    await db.setting.upsert({
      where: { key },
      create: { key, value: value as string },
      update: { value: value as string },
    });
  }
}

export type ContentBlockDTO = {
  id: string;
  key: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  image?: string | null;
  sortOrder: number;
  active: boolean;
};

export async function getContentBlocks(prefix?: string): Promise<ContentBlockDTO[]> {
  const rows = await db.contentBlock.findMany({
    where: prefix ? { key: { startsWith: prefix } } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows;
}
