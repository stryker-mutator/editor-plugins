import * as path from 'path';
import { glob } from 'glob';
import Mocha from 'mocha';

export async function run(): Promise<void> {
  const testsRoot = __dirname;

  const mocha = new Mocha({
    ui: 'bdd',
    rootHooks: {
      beforeAll() {
        import('./setup.js');
      },
    },
  });

  const testFiles = await glob('**/**.spec.js', { cwd: testsRoot });
  testFiles.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

  const failures = await new Promise<number>((resolve) => {
    mocha.run((failures) => resolve(failures));
  });

  if (failures > 0) {
    throw new Error(`${failures} tests failed.`);
  }
}
