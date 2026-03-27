import {
  type ConfigurationScope,
  workspace,
  type WorkspaceConfiguration,
} from 'vscode';

import type { Settings } from './index.ts';
import { SettingSections } from './index.ts';

export class Configuration {
  /**
   * Get the configuration for the fixed section
   * @returns {WorkspaceConfiguration}
   */
  private static get(
    section?: string,
    scope?: ConfigurationScope | null,
  ): WorkspaceConfiguration {
    return workspace.getConfiguration(section, scope);
  }

  /**
   * Get a setting from the configuration
   * @param setting
   */
  public static getSetting<T>(
    setting: Settings,
    scope?: ConfigurationScope | null,
  ): T | undefined {
    const section = SettingSections[setting];
    const value = this.get(section, scope).get<T>(setting);
    return value === undefined || value === '' ? undefined : value;
  }

  public static getSettingOrDefault<T>(
    setting: Settings,
    defaultValue: T,
    scope?: ConfigurationScope | null,
  ): T {
    const section = SettingSections[setting];
    const value = this.get(section, scope).get<T>(setting);
    return value === undefined || value === '' ? defaultValue : value;
  }

  public static async updateSetting(
    setting: Settings,
    value: unknown,
    scope?: ConfigurationScope | null,
  ) {
    const section = SettingSections[setting];
    await this.get(section, scope).update(setting, value);
  }

  public static async updateSettingIfChanged<T>(
    setting: Settings,
    value: T,
    scope?: ConfigurationScope | null,
  ): Promise<void> {
    const current = this.getSetting<T>(setting, scope);
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      await this.updateSetting(setting, value, scope);
    }
  }
}
