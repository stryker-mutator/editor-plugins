import { Constants } from '../constants';

export enum Settings {
  MutationTestingEnabled = 'enable',
  ServerPath = 'path',
  ServerArgs = 'args',
  CurrentWorkingDirectory = 'workingDirectory',
  ConfigFilePath = 'configFile',
  FileSystemWatcherPattern = 'watchPattern',
}

// Define a mapping for the section of each setting
export const SettingSections = {
  [Settings.FileSystemWatcherPattern]: Constants.AppName,
  [Settings.MutationTestingEnabled]: Constants.AppName,
  [Settings.ServerPath]: `${Constants.AppName}.server`,
  [Settings.ServerArgs]: `${Constants.AppName}.server`,
  [Settings.CurrentWorkingDirectory]: `${Constants.AppName}.server`,
  [Settings.ConfigFilePath]: `${Constants.AppName}.server`,
};
