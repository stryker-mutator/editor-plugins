import { Constants } from '../constants.ts';

export const Settings = {
  Enable: 'enable',
  Platform: 'platform',
  StrykerJsServerExePath: 'path',
  StrykerJsServerArgs: 'args',
  StrykerDotNetServerArgs: 'dotnetArgs',
  JsWorkingDirectory: 'workingDirectory',
  DotNetWorkingDirectory: 'dotnetWorkingDirectory',
  ConfigFilePath: 'configFile',
  FileSystemWatcherPattern: 'watchPattern',
} as const;
export type Settings = (typeof Settings)[keyof typeof Settings];

export const Platforms = {
  Js: 'js',
  DotNet: 'dotnet',
} as const;
export type Platform = (typeof Platforms)[keyof typeof Platforms];

// Define a mapping for the section of each setting
export const SettingSections = {
  [Settings.FileSystemWatcherPattern]: Constants.AppName,
  [Settings.Enable]: Constants.AppName,
  [Settings.Platform]: Constants.AppName,
  [Settings.StrykerJsServerExePath]: `${Constants.AppName}.server`,
  [Settings.StrykerJsServerArgs]: `${Constants.AppName}.server`,
  [Settings.StrykerDotNetServerArgs]: `${Constants.AppName}.server`,
  [Settings.JsWorkingDirectory]: `${Constants.AppName}.server`,
  [Settings.DotNetWorkingDirectory]: `${Constants.AppName}.server`,
  [Settings.ConfigFilePath]: `${Constants.AppName}.server`,
};
