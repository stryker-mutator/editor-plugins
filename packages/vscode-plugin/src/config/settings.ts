import { Constants } from '../constants.ts';

export const Settings = {
  enable: 'enable',
  Platform: 'platform',
  StrykerJsServerExePath: 'path',
  StrykerJsServerArgs: 'args',
  WorkingDirectory: 'workingDirectory',
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
  [Settings.enable]: Constants.AppName,
  [Settings.Platform]: Constants.AppName,
  [Settings.StrykerJsServerExePath]: `${Constants.AppName}.server`,
  [Settings.StrykerJsServerArgs]: `${Constants.AppName}.server`,
  [Settings.WorkingDirectory]: `${Constants.AppName}.server`,
  [Settings.ConfigFilePath]: `${Constants.AppName}.server`,
};
