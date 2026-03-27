import sinon from 'sinon';
import vscode from 'vscode';
import { expect } from 'chai';
import { of, throwError } from 'rxjs';
import { TestRunner } from '../../test-runner.ts';
import { MutationServer } from '../../mutation-server.ts';
import { ContextualLogger } from '../../logging/contextual-logger.ts';
import { testControllerUtils, testItemUtils } from '../../utils/index.ts';
import * as factory from '../factory.ts';

describe(TestRunner.name, () => {
  function createWorkspaceFolder(): vscode.WorkspaceFolder {
    return {
      uri: vscode.Uri.file('/workspace'),
      name: 'workspace',
      index: 0,
    } as vscode.WorkspaceFolder;
  }

  function createTestRunStubs() {
    return {
      appendOutput: sinon.stub(),
      passed: sinon.stub(),
      failed: sinon.stub(),
      skipped: sinon.stub(),
      errored: sinon.stub(),
      started: sinon.stub(),
      end: sinon.stub(),
    };
  }

  function createTestController(
    testRun: ReturnType<typeof createTestRunStubs>,
    items?: Iterable<[string, vscode.TestItem]>,
  ): vscode.TestController {
    return {
      items: {
        [Symbol.iterator]: function* () {
          if (items) {
            yield* items;
          }
        },
      },
      createTestRun: sinon
        .stub()
        .returns(testRun as unknown as vscode.TestRun),
    } as unknown as vscode.TestController;
  }

  function createSut(
    mutationServerMock: sinon.SinonStubbedInstance<MutationServer>,
    testController: vscode.TestController,
    loggerMock: sinon.SinonStubbedInstance<ContextualLogger>,
  ) {
    return new TestRunner(
      mutationServerMock,
      createWorkspaceFolder(),
      '.',
      testController,
      loggerMock,
    );
  }

  function createToken(
    onRegister?: (callback: () => void) => void,
  ): vscode.CancellationToken {
    return {
      isCancellationRequested: false,
      onCancellationRequested: (callback: () => void) => {
        onRegister?.(callback);
        return { dispose() {} } as vscode.Disposable;
      },
    } as vscode.CancellationToken;
  }

  beforeEach(() => {
    sinon = sinon.createsinon();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('runs file-scoped mutation testing without queue tree preconditions', async () => {
    const mutationServerMock = sinon.createStubInstance(MutationServer);
    const loggerMock = sinon.createStubInstance(ContextualLogger);

    const testItem = {
      id: 'mutant-item',
    } as vscode.TestItem;

    const testRun = createTestRunStubs();
    const testController = createTestController(testRun);

    sinon.stub(vscode.workspace, 'asRelativePath').returns('src/file.ts');
    sinon
      .stub(testControllerUtils, 'upsertMutantTestItem')
      .returns(testItem as unknown as vscode.TestItem);
    const isMutantInTestTreeStub = sinon
      .stub(testItemUtils, 'isMutantInTestTree')
      .returns(true);

    mutationServerMock.mutationTest.returns(
      of(
        factory.createMutationTestResult({
          files: {
            'src/file.ts': {
              mutants: [
                factory.createMutantResult({
                  status: 'Killed',
                }),
              ],
            },
          },
        }),
      ),
    );

    const sut = createSut(mutationServerMock, testController, loggerMock);

    await sut.runMutationTestsForFile(
      vscode.Uri.file('/workspace/src/file.ts'),
    );

    expect(
      mutationServerMock.mutationTest.calledOnceWithExactly({
        files: [{ path: 'src/file.ts' }],
      }),
    ).to.be.true;
    expect(testRun.passed.calledOnce).to.be.true;
    expect(testRun.end.calledOnce).to.be.true;
    expect(isMutantInTestTreeStub.called).to.be.false;
  });

  it('marks existing file test items as started before file-scoped mutation run', async () => {
    const mutationServerMock = sinon.createStubInstance(MutationServer);
    const loggerMock = sinon.createStubInstance(ContextualLogger);

    const fileUri = vscode.Uri.file('/workspace/src/file.ts');
    const fileTestItem = {
      id: 'file.ts',
      uri: fileUri,
      children: {
        size: 1,
        [Symbol.iterator]: function* () {
          yield ['mutant', mutantItem] as [string, vscode.TestItem];
        },
      },
    } as unknown as vscode.TestItem;
    const mutantItem = {
      id: 'mutant-item',
      uri: fileUri,
      children: {
        size: 0,
        [Symbol.iterator]: function* () {},
      },
    } as unknown as vscode.TestItem;

    const testRun = createTestRunStubs();
    const testController = createTestController(testRun, [
      ['file.ts', fileTestItem],
    ]);

    sinon.stub(vscode.workspace, 'asRelativePath').returns('src/file.ts');
    sinon
      .stub(testControllerUtils, 'upsertMutantTestItem')
      .returns(mutantItem);

    mutationServerMock.mutationTest.returns(
      of(
        factory.createMutationTestResult({
          files: {
            'src/file.ts': {
              mutants: [factory.createMutantResult({ status: 'Killed' })],
            },
          },
        }),
      ),
    );

    const sut = createSut(mutationServerMock, testController, loggerMock);

    await sut.runMutationTestsForFile(fileUri);

    expect(testRun.started.callCount).to.equal(2);
    expect(testRun.started.firstCall.args[0]).to.equal(fileTestItem);
    expect(testRun.started.secondCall.args[0]).to.equal(mutantItem);
  });

  it('filters out mutants not present in queue for regular runs', async () => {
    const mutationServerMock = sinon.createStubInstance(MutationServer);
    const loggerMock = sinon.createStubInstance(ContextualLogger);
    const queuedItem = { id: 'queued-item' } as vscode.TestItem;
    const testRun = createTestRunStubs();
    const testController = createTestController(testRun, [
      ['queued-item', queuedItem],
    ]);

    const traverseStub = sinon
      .stub(testControllerUtils, 'traverse')
      .callsFake((item, action) => action(item));
    const toMutationTestParamsStub = sinon
      .stub(testItemUtils, 'toMutationTestParams')
      .returns({ files: [{ path: 'src/file.ts' }] });
    const isMutantInTestTreeStub = sinon
      .stub(testItemUtils, 'isMutantInTestTree')
      .returns(false);
    const upsertStub = sinon.stub(
      testControllerUtils,
      'upsertMutantTestItem',
    );

    mutationServerMock.mutationTest.returns(
      of(
        factory.createMutationTestResult({
          files: {
            'src/file.ts': {
              mutants: [factory.createMutantResult({ status: 'Killed' })],
            },
          },
        }),
      ),
    );

    const sut = createSut(mutationServerMock, testController, loggerMock);
    const request = {
      include: [queuedItem],
      exclude: undefined,
      profile: undefined,
      preserveFocus: false,
    } as unknown as vscode.TestRunRequest;
    await sut.runMutationTests(request, testController, createToken());

    expect(traverseStub.called).to.be.true;
    expect(toMutationTestParamsStub.calledOnceWithExactly([queuedItem])).to.be
      .true;
    expect(isMutantInTestTreeStub.called).to.be.true;
    expect(upsertStub.called).to.be.false;
    expect(testRun.passed.called).to.be.false;
  });

  it('marks queued items as errored when regular run throws', async () => {
    const mutationServerMock = sinon.createStubInstance(MutationServer);
    const loggerMock = sinon.createStubInstance(ContextualLogger);
    const queuedItem = { id: 'queued-item' } as vscode.TestItem;
    const testRun = createTestRunStubs();
    const testController = createTestController(testRun, [
      ['queued-item', queuedItem],
    ]);

    sinon
      .stub(testControllerUtils, 'traverse')
      .callsFake((item, action) => action(item));
    sinon
      .stub(testItemUtils, 'toMutationTestParams')
      .returns({ files: [{ path: 'src/file.ts' }] });
    mutationServerMock.mutationTest.returns(
      throwError(() => new Error('boom')),
    );

    const sut = createSut(mutationServerMock, testController, loggerMock);
    const request = {
      include: [queuedItem],
      exclude: undefined,
      profile: undefined,
      preserveFocus: false,
    } as unknown as vscode.TestRunRequest;
    await sut.runMutationTests(request, testController, createToken());

    expect(testRun.errored.calledOnce).to.be.true;
    expect(testRun.end.called).to.be.true;
    expect(loggerMock.error.called).to.be.true;
  });

  it('appends cancellation message when token is cancelled', async () => {
    const mutationServerMock = sinon.createStubInstance(MutationServer);
    const loggerMock = sinon.createStubInstance(ContextualLogger);
    const queuedItem = { id: 'queued-item' } as vscode.TestItem;
    const testRun = createTestRunStubs();
    const testController = createTestController(testRun, [
      ['queued-item', queuedItem],
    ]);

    sinon
      .stub(testControllerUtils, 'traverse')
      .callsFake((item, action) => action(item));
    sinon
      .stub(testItemUtils, 'toMutationTestParams')
      .returns({ files: [{ path: 'src/file.ts' }] });
    mutationServerMock.mutationTest.returns(of({ files: {} }));

    const sut = createSut(mutationServerMock, testController, loggerMock);
    const request = {
      include: [queuedItem],
      exclude: undefined,
      profile: undefined,
      preserveFocus: false,
    } as unknown as vscode.TestRunRequest;
    await sut.runMutationTests(
      request,
      testController,
      createToken((callback) => callback()),
    );

    expect(
      testRun.appendOutput.calledWith(
        'Test run cancellation requested, ending test run.',
      ),
    ).to.be.true;
  });

  it('marks ignored mutants as skipped in file-scoped runs', async () => {
    const mutationServerMock = sinon.createStubInstance(MutationServer);
    const loggerMock = sinon.createStubInstance(ContextualLogger);
    const testItem = { id: 'mutant-item' } as vscode.TestItem;
    const testRun = createTestRunStubs();
    const testController = createTestController(testRun);

    sinon.stub(vscode.workspace, 'asRelativePath').returns('src/file.ts');
    sinon
      .stub(testControllerUtils, 'upsertMutantTestItem')
      .returns(testItem as unknown as vscode.TestItem);
    mutationServerMock.mutationTest.returns(
      of(
        factory.createMutationTestResult({
          files: {
            'src/file.ts': {
              mutants: [factory.createMutantResult({ status: 'Ignored' })],
            },
          },
        }),
      ),
    );

    const sut = createSut(mutationServerMock, testController, loggerMock);
    await sut.runMutationTestsForFile(
      vscode.Uri.file('/workspace/src/file.ts'),
    );

    expect(testRun.skipped.calledOnce).to.be.true;
    expect(testRun.passed.called).to.be.false;
  });
});
