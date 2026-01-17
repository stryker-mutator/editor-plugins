import * as path from 'path';
import { glob } from 'glob';
import Mocha from 'mocha';

export function run(): Promise<void> {
  const testsRoot = __dirname;

  const mocha = new Mocha({
    ui: 'bdd',
    rootHooks: {
      beforeAll() {
        import('./setup.js');
      }
    }
  });

  return new Promise((resolve, reject) => {
    try {
      const testFiles = glob.sync('**/**.spec.js', { cwd: testsRoot });

      testFiles.forEach(file => mocha.addFile(path.resolve(testsRoot, file)));

      mocha.run(failures => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}
