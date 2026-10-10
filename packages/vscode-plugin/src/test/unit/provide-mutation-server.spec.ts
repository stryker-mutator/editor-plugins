import { expect } from 'chai';
import sinon from 'sinon';
import type { Injector } from 'typed-inject';
import type vscode from 'vscode';

import { Configuration, Platforms, Settings } from '../../config/index.ts';
import { DotNetMutationServer } from '../../dotnet-mutation-server.ts';
import { JsMutationServer } from '../../js-mutation-server.ts';
import {
  type MutationServerContext,
  provideMutationServer,
} from '../../provide-mutation-server.ts';

describe(provideMutationServer.name, () => {
  const sandbox = sinon.createSandbox();
  const workspaceFolder = {} as vscode.WorkspaceFolder;
  let injectorMock: sinon.SinonStubbedInstance<
    Injector<MutationServerContext>
  >;
  let getSettingOrDefaultStub: sinon.SinonStub;

  beforeEach(() => {
    injectorMock = {
      injectClass: sandbox.stub(),
    } as unknown as sinon.SinonStubbedInstance<Injector<MutationServerContext>>;
    getSettingOrDefaultStub = sandbox.stub(Configuration, 'getSettingOrDefault');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should provide the JS mutation server by default', () => {
    getSettingOrDefaultStub.callsFake(
      (_setting: string, defaultValue: unknown) => defaultValue,
    );

    provideMutationServer(
      injectorMock,
      workspaceFolder,
    );

    expect(getSettingOrDefaultStub).calledWith(
      Settings.Platform,
      Platforms.Js,
      workspaceFolder,
    );
    expect(injectorMock.injectClass).calledOnceWithExactly(JsMutationServer);
  });

  it('should provide the JS mutation server for platform "js"', () => {
    getSettingOrDefaultStub.returns(Platforms.Js);

    provideMutationServer(
      injectorMock,
      workspaceFolder,
    );

    expect(injectorMock.injectClass).calledOnceWithExactly(JsMutationServer);
  });

  it('should provide the .NET mutation server for platform "dotnet"', () => {
    getSettingOrDefaultStub.returns(Platforms.DotNet);

    provideMutationServer(
      injectorMock,
      workspaceFolder,
    );

    expect(injectorMock.injectClass).calledOnceWithExactly(
      DotNetMutationServer,
    );
  });

  it('should throw for an unsupported platform', () => {
    getSettingOrDefaultStub.returns('cobol');

    expect(() =>
      provideMutationServer(
        injectorMock,
        workspaceFolder,
      ),
    ).throws('Unsupported platform: cobol');
  });
});
