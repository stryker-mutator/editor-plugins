import {
  ConfigurationScope,
  ConfigurationTarget,
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
    return this.get(section, scope).get<T>(setting);
  }

  public static getSettingOrDefault<T>(
    setting: Settings,
    defaultValue: T,
    scope?: ConfigurationScope | null | undefined,
  ): T {
    const section = SettingSections[setting];
    const value = this.get(section, scope).get<T>(setting);
    return !value || value === '' ? defaultValue : value;
  }
  /**
   * Update a setting in the configuration
   * @param setting
   * @param value
   * @param configurationTarget
   */
  public static async updateSetting(
    setting: Settings,
    value: any,
    configurationTarget?: boolean | ConfigurationTarget | undefined,
  ): Promise<void> {
    await this.get().update(setting, value, configurationTarget);
  }
}
