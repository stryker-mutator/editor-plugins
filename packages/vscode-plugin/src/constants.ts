export class Constants {
  public static readonly AppName = 'mutationTesting';
  public static readonly ServerStartupTimeoutMs = 10000;
  public static readonly SupportedMspVersion = '1';
  public static readonly DefaultFileSystemWatcherPattern = '**/{!node_modules,!.*}/**/*.{js,ts,jsx,tsx}';
  public static readonly FileSystemWatcherDebounceMs = 100;
  public static readonly TestRunProfileLabel = 'Test mutations';
}
