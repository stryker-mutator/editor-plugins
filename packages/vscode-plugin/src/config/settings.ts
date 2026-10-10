import { Constants } from '../constants.ts';

export const Settings = {
  Enable: 'enable',
  Platform: 'platform',
  StrykerJsServerExePath: 'path',
  JsServerArgs: 'args',
  JsServerWorkingDirectory: 'workingDirectory',
  DotNetServerArgs: 'dotnetArgs',
  DotNetServerWorkingDirectory: 'dotnetWorkingDirectory',
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
  [Settings.JsServerArgs]: `${Constants.AppName}.server`,
  [Settings.JsServerWorkingDirectory]: `${Constants.AppName}.server`,
  [Settings.DotNetServerArgs]: `${Constants.AppName}.dotnetserver`,
  [Settings.DotNetServerWorkingDirectory]: `${Constants.AppName}.dotnetserver`,
  [Settings.ConfigFilePath]: `${Constants.AppName}.server`,
};
