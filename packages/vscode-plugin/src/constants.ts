export class Constants {
  public static readonly AppName = 'strykerMutator';
  public static readonly ServerStartupTimeoutMs = 10000;
  public static readonly SupportedMspVersion = '0.4.0';
  public static readonly DefaultJsFileSystemWatcherPattern =
    '**/*.{js,ts,jsx,tsx}';
  public static readonly DefaultDotNetFileSystemWatcherPattern = '**/*.cs';
  public static readonly FileSystemWatcherDebounceMs = 100;
  public static readonly TestRunProfileLabel = 'Test mutations';
}
