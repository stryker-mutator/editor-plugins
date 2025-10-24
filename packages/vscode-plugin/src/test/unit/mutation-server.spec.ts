import { expect } from 'chai';
import sinon from 'sinon';
import { Subject } from 'rxjs';
import vscode from 'vscode';
import { MutationServer } from '../../mutation-server.ts';
import { Process } from '../../process.ts';
import { ContextualLogger } from '../../logging/index.ts';
import { JSONRPCErrorResponse, JSONRPCRequest, JSONRPCResponse } from 'json-rpc-2.0';
import { Configuration } from '../../config/index.ts';
import { Constants } from '../../constants.ts';
import {
  ConfigureResult,
  DiscoverParams,
  DiscoverResult,
  MutationTestParams,
} from 'mutation-server-protocol';
import { createMutationTestResult, createMutantResult } from '../factory';

describe(MutationServer.name, () => {
  let sandbox: sinon.SinonSandbox;
  let sut: MutationServer;
  let loggerMock: sinon.SinonStubbedInstance<ContextualLogger>;
  let workspaceFolderMock: vscode.WorkspaceFolder;
  let processMock: sinon.SinonStubbedInstance<Process>;
  let transportMock: {
    init: sinon.SinonStub;
    send: sinon.SinonStub;
    dispose: sinon.SinonStub;
    messages: Subject<JSONRPCResponse>;
    notifications: Subject<JSONRPCRequest>;
  };
  let configurationStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    loggerMock = sandbox.createStubInstance(ContextualLogger);
    processMock = sandbox.createStubInstance(Process);

    workspaceFolderMock = {
      uri: { fsPath: '/test/workspace' } as vscode.Uri,
      name: 'test-workspace',
      index: 0,
    };

    // Create transport mock with proper subjects
    transportMock = {
      init: sandbox.stub(),
      send: sandbox.stub(),
      dispose: sandbox.stub(),
      messages: new Subject<JSONRPCResponse>(),
      notifications: new Subject<JSONRPCRequest>(),
    };

    configurationStub = sandbox.stub(Configuration, 'getSetting');

    sut = new MutationServer(
      workspaceFolderMock,
      processMock,
      transportMock as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('init', () => {
    it('should initialize process and transport', async () => {
      // Arrange
      const configResult: ConfigureResult = {
        version: Constants.SupportedMspVersion,
      };

      configurationStub.returns(undefined); // No config file path

      transportMock.send = sandbox.stub().callsFake((message: string) => {
        // Simulate successful configure response
        const request = JSON.parse(message);
        if (request.method === 'configure') {
          const response: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: request.id,
            result: configResult,
          };
          transportMock.messages.next(response);
        }
      });

      // Act
      await sut.init();

      // Assert
      expect(processMock.init.calledOnce).to.be.true;
      expect(transportMock.init.calledOnce).to.be.true;
    });

    it('should call configure with undefined config file path if not set in settings', async () => {
      // Arrange
      const configResult: ConfigureResult = {
        version: Constants.SupportedMspVersion,
      };

      configurationStub.returns(undefined); // No config file path

      transportMock.send = sandbox.stub().callsFake((message: string) => {
        // Simulate successful configure response
        const request = JSON.parse(message);
        if (request.method === 'configure') {
          const response: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: request.id,
            result: configResult,
          };
          transportMock.messages.next(response);
        }
      });

      // Act
      await sut.init();

      // Assert
      expect(transportMock.send.calledWithMatch((message: string) => {
        const request = JSON.parse(message);
        return request.method === 'configure' && request.params.configFilePath === undefined;
      })).to.be.true;
    });

    it('should call configure with config file path from settings if set', async () => {
      // Arrange
      const configFilePath = '/path/to/stryker-config.json';
      const configResult: ConfigureResult = {
        version: Constants.SupportedMspVersion,
      };

      configurationStub.returns(configFilePath); // Config file path set

      transportMock.send = sandbox.stub().callsFake((message: string) => {
        // Simulate successful configure response
        const request = JSON.parse(message);
        if (request.method === 'configure') {
          const response: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: request.id,
            result: configResult,
          };
          transportMock.messages.next(response);
        }
      });

      // Act
      await sut.init();

      // Assert
      expect(transportMock.send.calledWithMatch((message: string) => {
        const request = JSON.parse(message);
        return request.method === 'configure' && request.params.configFilePath === configFilePath;
      })).to.be.true;
    });

    it('should throw error when server version mismatch', async () => {
      // Arrange
      const configResult: ConfigureResult = {
        version: '0.0.0', // Wrong version
      };

      configurationStub.returns(undefined);

      transportMock.send.callsFake((message: string) => {
        const request = JSON.parse(message);
        if (request.method === 'configure') {
          const response: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: request.id,
            result: configResult,
          };
          transportMock.messages.next(response);
        }
      });

      // Act & Assert
      await expect(sut.init()).to.eventually.be.rejectedWith(
        `Mismatched server version. Expected: ${Constants.SupportedMspVersion}, got: 0.0.0`
      );
    });
  });

  describe('discover', () => {
    beforeEach(async () => {
      // Set up successful init
      configurationStub.returns(undefined);
      transportMock.send = sandbox.stub().callsFake((message: string) => {
        const request = JSON.parse(message);
        if (request.method === 'configure') {
          setTimeout(() => {
            const response: JSONRPCResponse = {
              jsonrpc: '2.0',
              id: request.id,
              result: { version: Constants.SupportedMspVersion },
            };
            transportMock.messages.next(response);
          }, 0);
        }
      });
      await sut.init();
    });

    it('should send discover request and return result', async () => {
      // Arrange
      const discoverParams: DiscoverParams = {
        files: [{ path: 'foo/bar.js' }],
      };
      const expectedResult: DiscoverResult = {
        files: {
          'foo/bar.js': {
            mutants: [
              {
                id: '1',
                location: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
                mutatorName: 'EqualityOperator',
                replacement: '!==',
              },
            ],
          },
        },
      };

      let capturedParams: DiscoverParams | undefined;
      transportMock.send.callsFake((message: string) => {
        const request = JSON.parse(message);
        if (request.method === 'discover') {
          capturedParams = request.params;
          const response: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: request.id,
            result: expectedResult,
          };
          transportMock.messages.next(response);
        }
      });

      // Act
      const result = await sut.discover(discoverParams);

      // Assert
      expect(capturedParams).to.deep.equal(discoverParams);
      expect(result).to.deep.equal(expectedResult);
    });
  });

  describe('mutationTest', () => {
    beforeEach(async () => {
      // Set up successful init
      configurationStub.returns(undefined);
      transportMock.send = sandbox.stub().callsFake((message: string) => {
        const request = JSON.parse(message);
        if (request.method === 'configure') {
          setTimeout(() => {
            const response: JSONRPCResponse = {
              jsonrpc: '2.0',
              id: request.id,
              result: { version: Constants.SupportedMspVersion },
            };
            transportMock.messages.next(response);
          }, 0);
        }
      });
      await sut.init();
    });

    it('should send mutation test request and handle progress notifications', async () => {
      // Arrange
      const mutationTestParams: MutationTestParams = {
        files: [{ path: 'src/foo/bar.js' }],
      };
      const partialResult = createMutationTestResult();
      const finalResult = createMutationTestResult({
        files: {
          'src/foo/bar.js': {
            mutants: [
              createMutantResult(),
              createMutantResult({
                id: '2',
                status: 'Survived',
                location: { start: { line: 2, column: 0 }, end: { line: 2, column: 5 } },
                mutatorName: 'BooleanLiteral',
                replacement: 'false',
              }),
            ],
          },
        },
      });

      const progressCallback = sandbox.stub();
      let capturedParams: MutationTestParams | undefined;

      transportMock.send = sandbox.stub().callsFake((message: string) => {
        const request = JSON.parse(message);
        if (request.method === 'mutationTest') {
          capturedParams = request.params;

          // Simulate progress notification
          const progressNotification: JSONRPCRequest = {
            jsonrpc: '2.0',
            method: 'reportMutationTestProgress',
            params: partialResult,
          };
          transportMock.notifications.next(progressNotification);

          // Simulate final response
          const response: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: request.id,
            result: finalResult,
          };
          transportMock.messages.next(response);
        }
      });

      // Act
      const result = await sut.mutationTest(mutationTestParams, progressCallback);

      // Assert
      expect(capturedParams).to.deep.equal(mutationTestParams);
      expect(progressCallback.calledOnceWith(partialResult)).to.be.true;
      expect(result).to.deep.equal(finalResult);
    });

    it('should handle JSON-RPC errors properly', async () => {
      // Arrange
      const mutationTestParams: MutationTestParams = {
        files: [{ path: 'src/example.js' }],
      };
      const errorMessage = 'The initial test run failed';

      transportMock.send.callsFake((message: string) => {
        const request = JSON.parse(message);
        if (request.method === 'mutationTest') {
          const errorResponse: JSONRPCErrorResponse = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -1,
              message: errorMessage,
            },
          };
          transportMock.messages.next(errorResponse);
        }
      });

      const progressCallback = sandbox.stub();

      // Act & Assert
      await expect(sut.mutationTest(mutationTestParams, progressCallback))
        .to.eventually.be.rejectedWith(errorMessage);
    });
  });
  describe('dispose', () => {
    it('should dispose transport and process', async () => {
      // Act
      await sut.dispose();

      // Assert
      expect(transportMock.dispose.calledOnce).to.be.true;
      expect(processMock.dispose.calledOnce).to.be.true;
    });
  });
});
