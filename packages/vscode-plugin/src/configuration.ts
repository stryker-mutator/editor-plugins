import { ConfigurationScope, ConfigurationTarget, workspace, WorkspaceConfiguration } from 'vscode';

export class Configuration {

  /**
   * Get the configuration for a specific section
   * @param section 
   * @returns {WorkspaceConfiguration}
   */
  public static get(section: string, scope?: ConfigurationScope | null | undefined): WorkspaceConfiguration {
    return workspace.getConfiguration(section, scope);
  }

  /**
   * Get a setting from the configuration
   * @param section 
   * @param setting 
   */
  public static getSetting<T>(section: string, setting: string, defaultValue?: T): T | undefined {
    if (defaultValue) {
      return this.get(section).get<T>(setting, defaultValue);
    }

    return this.get(section).get<T>(setting);
  }

  /**
   * Update a setting in the configuration
   * @param section 
   * @param setting 
   * @param value 
   * @param configurationTarget 
   */
  public static async updateSetting(section: string, setting: string, value: any, configurationTarget?: boolean | ConfigurationTarget | undefined): Promise<void> {
    await this.get(section).update(setting, value, configurationTarget);
  }
}
