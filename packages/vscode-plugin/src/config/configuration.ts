import { ConfigurationScope, ConfigurationTarget, workspace, WorkspaceConfiguration } from 'vscode';
import { Settings, SettingSections,  } from './index';

export class Configuration {
  /**
   * Get the configuration for the fixed section
   * @returns {WorkspaceConfiguration}
   */
  public static get(section?: string, scope?: ConfigurationScope | null | undefined): WorkspaceConfiguration {
    return workspace.getConfiguration(section, scope);
  }

  /**
   * Get a setting from the configuration
   * @param setting 
   */
  public static getSetting<T>(setting: Settings, scope?: ConfigurationScope | null | undefined, defaultValue?: T): T | undefined {
    const section = SettingSections[setting];
    if (defaultValue) {
      return this.get(section, scope).get<T>(setting, defaultValue);
    }

    return this.get(section, scope).get<T>(setting);
  }

  /**
   * Update a setting in the configuration
   * @param setting 
   * @param value 
   * @param configurationTarget 
   */
  public static async updateSetting(setting: Settings, value: any, configurationTarget?: boolean | ConfigurationTarget | undefined): Promise<void> {
    await this.get().update(setting, value, configurationTarget);
  }
}
