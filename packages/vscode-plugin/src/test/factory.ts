import { DiscoveredMutant } from 'mutation-server-protocol';
import sinon from 'sinon';
import { Injector } from 'typed-inject';
import vscode from 'vscode';

export function createDiscoveredMutant(
  overrides?: Partial<DiscoveredMutant>,
): DiscoveredMutant {
  return {
    ...overrides,
    id: 'mutant-1',
    mutatorName: 'ConditionalExpression',
    location: {
      start: { line: 3, column: 5 },
      end: { line: 3, column: 15 },
    },
    replacement: 'true',
  };
}

export function injector<T = unknown>(): sinon.SinonStubbedInstance<
  Injector<T>
> {
  const injectorMock: sinon.SinonStubbedInstance<Injector<T>> = {
    dispose: sinon.stub(),
    injectClass: sinon.stub<any>(),
    injectFunction: sinon.stub<any>(),
    provideClass: sinon.stub<any>(),
    provideFactory: sinon.stub<any>(),
    provideValue: sinon.stub<any>(),
    resolve: sinon.stub<any>(),
    createChildInjector: sinon.stub<any>(),
  };
  injectorMock.provideClass.returnsThis();
  injectorMock.provideFactory.returnsThis();
  injectorMock.provideValue.returnsThis();
  return injectorMock;
}

export function workspaceFolder(): sinon.SinonStubbedInstance<vscode.WorkspaceFolder> {
  return new WorkspaceFolderMock();
}

export function testController(): sinon.SinonStubbedInstance<vscode.TestController> {
  return sinon.createStubInstance(TestControllerMock);
};


export class WorkspaceFolderMock implements vscode.WorkspaceFolder {
  uri: sinon.SinonStubbedInstance<vscode.Uri>;
  name: sinon.SinonStubbedInstance<string>;
  index: sinon.SinonStubbedInstance<number>;

  constructor() {
    this.uri = sinon.stub() as unknown as sinon.SinonStubbedInstance<vscode.Uri>;
    this.name = sinon.stub() as unknown as sinon.SinonStubbedInstance<string>;
    this.index = sinon.stub() as unknown as sinon.SinonStubbedInstance<number>;
  }
}

export class TestControllerMock implements vscode.TestController {
  readonly id: string = 'test-controller-mock';
  readonly label: string = 'Test Controller Mock';
  readonly items: vscode.TestItemCollection = {
    get: sinon.stub(),
    delete: sinon.stub(),
    forEach: sinon.stub(),
    replace: sinon.stub(),
    size: 0,
    add: sinon.stub(),
    [Symbol.iterator]: sinon.stub(),
  };
  createRunProfile = sinon.stub<any>();
  resolveHandler = sinon.stub<any>();
  createTestItem = sinon.stub<any>();
  refreshHandler: ((token: vscode.CancellationToken) => Thenable<void> | void) | undefined = sinon.stub<any>();
  createTestRun(request: vscode.TestRunRequest, name?: string, persist?: boolean): vscode.TestRun {
    return sinon.stub() as unknown as vscode.TestRun;
  }
  invalidateTestResults(items?: vscode.TestItem | readonly vscode.TestItem[]): void {
    return;
  }
  dispose = sinon.stub<any>();
  refresh = sinon.stub<any>();
}
