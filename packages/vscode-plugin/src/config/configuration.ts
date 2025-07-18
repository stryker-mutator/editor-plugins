import {
  ConfigurationScope,
  workspace,
  WorkspaceConfiguration,
} from 'vscode';
import { Settings, SettingSections } from './index';

export class Configuration {
  /**
   * Get the configuration for the fixed section
   * @returns {WorkspaceConfiguration}
   */
  public static get(
    section?: string,
    scope?: ConfigurationScope | null | undefined,
  ): WorkspaceConfiguration {

    return workspace.getConfiguration(section, scope);
  }

  /**
   * Get a setting from the configuration
   * @param setting
   */
  public static getSetting<T>(
    setting: Settings,
    scope?: ConfigurationScope | null | undefined,
  ): T | undefined {
    const section = SettingSections[setting];
    const value = this.get(section, scope).get<T>(setting);
    return value === undefined || value === '' ? undefined : value;
  }

  public static getSettingOrDefault<T>(
    setting: Settings,
    defaultValue: T,
    scope?: ConfigurationScope | null | undefined,
  ): T {
    const section = SettingSections[setting];
    const value = this.get(section, scope).get<T>(setting);
    return value === undefined || value === '' ? defaultValue : value;
  }

  public static async updateSetting(
    setting: Settings,
    value: any,
    scope?: ConfigurationScope | null | undefined) {
    const section = SettingSections[setting];
    await this
      .get(section, scope)
      .update(setting, value);
  }

  public static async updateSettingIfChanged<T>(
    setting: Settings,
    value: T,
    scope?: ConfigurationScope | null | undefined
  ): Promise<void> {
    const current = this.getSetting<T>(setting, scope);
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      await this.updateSetting(setting, value, scope);
    }
  }
}
