export class UnsupportedServerVersionError extends Error {
  constructor(version: string) {
    super(`Unsupported mutation server version: ${version}`);
  }
}

export class MissingServerPathError extends Error {
  constructor() {
    super('Cannot start mutation server. Missing server path configuration');
  }
}

export class CouldNotSpawnProcessError extends Error {
  constructor() {
    super('Mutation server process could not be spawned');
  }
}

export class ServerStartupTimeoutError extends Error {
  constructor() {
    super('Mutation server did not start within the timeout');
  }
}
