import { Constants } from "../constants";

export enum Settings {
  MutationTestingEnabled = 'enableMutationTesting',
  ServerPath = 'path',
  ServerArgs = 'args',
  CurrentWorkingDirectory = 'workingDirectory',
}

// Define a mapping for the section of each setting
export const SettingSections = {
  [Settings.MutationTestingEnabled]: Constants.AppName,  // No section for this setting
  [Settings.ServerPath]: `${Constants.AppName}.mutationServer`,
  [Settings.ServerArgs]: `${Constants.AppName}.mutationServer`,
  [Settings.CurrentWorkingDirectory]: `${Constants.AppName}.mutationServer`,
};
