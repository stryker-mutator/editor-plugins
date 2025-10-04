import { Constants } from '../constants.ts';
export const Settings = {
  MutationTestingEnabled: 'enable',
  ServerPath: 'path',
  ServerArgs: 'args',
  CurrentWorkingDirectory: 'workingDirectory',
  ConfigFilePath: 'configFile',
  FileSystemWatcherPattern: 'watchPattern',
} as const;
export type Settings = (typeof Settings)[keyof typeof Settings];

// Define a mapping for the section of each setting
export const SettingSections = {
  [Settings.FileSystemWatcherPattern]: Constants.AppName,
  [Settings.MutationTestingEnabled]: Constants.AppName,
  [Settings.ServerPath]: `${Constants.AppName}.server`,
  [Settings.ServerArgs]: `${Constants.AppName}.server`,
  [Settings.CurrentWorkingDirectory]: `${Constants.AppName}.server`,
  [Settings.ConfigFilePath]: `${Constants.AppName}.server`,
};
