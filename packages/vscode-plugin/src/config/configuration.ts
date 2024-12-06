import { ConfigurationScope, ConfigurationTarget, workspace, WorkspaceConfiguration } from 'vscode';
import { APP_NAME } from '../constants';

export enum Setting {
  MutationTestingEnabled = 'enable',
}

export class Configuration {
  /**
   * Get the configuration for the fixed section
   * @returns {WorkspaceConfiguration}
   */
  public static get(scope?: ConfigurationScope | null | undefined): WorkspaceConfiguration {
    return workspace.getConfiguration(APP_NAME, scope);
  }

  /**
   * Get a setting from the configuration
   * @param setting 
   */
  public static getSetting<T>(setting: Setting, scope?: ConfigurationScope | null | undefined, defaultValue?: T): T | undefined {
    if (defaultValue) {
      return this.get(scope).get<T>(setting, defaultValue);
    }

    return this.get(scope).get<T>(setting);
  }

  /**
   * Update a setting in the configuration
   * @param setting 
   * @param value 
   * @param configurationTarget 
   */
  public static async updateSetting(setting: Setting, value: any, configurationTarget?: boolean | ConfigurationTarget | undefined): Promise<void> {
    await this.get().update(setting, value, configurationTarget);
  }
}
