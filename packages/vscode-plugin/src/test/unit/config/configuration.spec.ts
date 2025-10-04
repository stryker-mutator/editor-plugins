import { expect } from 'chai';
import sinon from 'sinon';
import vscode from 'vscode';
import { Configuration } from '../../../config/configuration.ts';
import { Settings, SettingSections } from '../../../config/index.ts';

describe(Configuration.name, () => {
  let getConfigurationStub: sinon.SinonStub;
  let mockWorkspaceConfig: any;

  beforeEach(() => {
    mockWorkspaceConfig = {
      get: sinon.stub(),
      update: sinon.stub(),
      has: sinon.stub(),
      inspect: sinon.stub(),
    };
    getConfigurationStub = sinon
      .stub(vscode.workspace, 'getConfiguration')
      .returns(mockWorkspaceConfig);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getSetting', () => {
    it('should get setting from correct section', () => {
      const setting = Settings.enable;
      const expectedSection = SettingSections[setting];
      const expectedValue = true;
      mockWorkspaceConfig.get.returns(expectedValue);

      const result = Configuration.getSetting<boolean>(setting);

      expect(getConfigurationStub.calledWith(expectedSection, undefined)).to.be
        .true;
      expect(mockWorkspaceConfig.get.calledWith(setting)).to.be.true;
      expect(result).to.equal(expectedValue);
    });

    it('should return undefined when value is undefined', () => {
      mockWorkspaceConfig.get.returns(undefined);

      const result = Configuration.getSetting<string>(Settings.ServerPath);

      expect(result).to.be.undefined;
    });

    it('should return undefined when value is empty string', () => {
      mockWorkspaceConfig.get.returns('');

      const result = Configuration.getSetting<string>(Settings.ServerPath);

      expect(result).to.be.undefined;
    });

    it('should return the value when it is valid', () => {
      const expectedValue = 'node_modules/.bin/stryker';
      mockWorkspaceConfig.get.returns(expectedValue);

      const result = Configuration.getSetting<string>(Settings.ServerPath);

      expect(result).to.equal(expectedValue);
    });

    it('should use provided scope', () => {
      const scope = {} as vscode.ConfigurationScope;
      const setting = Settings.ServerPath;
      const expectedSection = SettingSections[setting];

      Configuration.getSetting<string>(setting, scope);

      expect(getConfigurationStub.calledWith(expectedSection, scope)).to.be
        .true;
    });
  });

  describe('getSettingOrDefault', () => {
    it('should return the setting value when it exists', () => {
      const expectedValue = 'custom-stryker-path';
      const defaultValue = 'default-path';
      mockWorkspaceConfig.get.returns(expectedValue);

      const result = Configuration.getSettingOrDefault<string>(
        Settings.ServerPath,
        defaultValue,
      );

      expect(result).to.equal(expectedValue);
    });

    it('should return default value when setting is undefined', () => {
      const defaultValue = 'default-path';
      mockWorkspaceConfig.get.returns(undefined);

      const result = Configuration.getSettingOrDefault<string>(
        Settings.ServerPath,
        defaultValue,
      );

      expect(result).to.equal(defaultValue);
    });

    it('should return default value when setting is empty string', () => {
      const defaultValue = 'default-path';
      mockWorkspaceConfig.get.returns('');

      const result = Configuration.getSettingOrDefault<string>(
        Settings.ServerPath,
        defaultValue,
      );

      expect(result).to.equal(defaultValue);
    });

    it('should use provided scope', () => {
      const scope = {} as vscode.ConfigurationScope;
      const setting = Settings.ServerPath;
      const expectedSection = SettingSections[setting];
      const defaultValue = 'default-path';

      Configuration.getSettingOrDefault<string>(setting, defaultValue, scope);

      expect(getConfigurationStub.calledWith(expectedSection, scope)).to.be
        .true;
    });
  });

  describe('updateSetting', () => {
    it('should update setting in correct section', async () => {
      const setting = Settings.enable;
      const value = true;
      const expectedSection = SettingSections[setting];
      mockWorkspaceConfig.update.resolves();

      await Configuration.updateSetting(setting, value);

      expect(getConfigurationStub.calledWith(expectedSection, undefined)).to.be
        .true;
      expect(mockWorkspaceConfig.update.calledWith(setting, value)).to.be.true;
    });

    it('should use provided scope', async () => {
      const scope = {} as vscode.ConfigurationScope;
      const setting = Settings.ServerPath;
      const value = 'new-path';
      const expectedSection = SettingSections[setting];
      mockWorkspaceConfig.update.resolves();

      await Configuration.updateSetting(setting, value, scope);

      expect(getConfigurationStub.calledWith(expectedSection, scope)).to.be
        .true;
      expect(mockWorkspaceConfig.update.calledWith(setting, value)).to.be.true;
    });

    it('should handle update errors', async () => {
      const setting = Settings.ServerPath;
      const value = 'new-path';
      const error = new Error('Update failed');
      mockWorkspaceConfig.update.rejects(error);

      try {
        await Configuration.updateSetting(setting, value);
        expect.fail('Should have thrown an error');
      } catch (e) {
        expect(e).to.equal(error);
      }
    });
  });

  describe('updateSettingIfChanged', () => {
    it('should update setting when value has changed', async () => {
      const setting = Settings.ServerPath;
      const currentValue = 'old-path';
      const newValue = 'new-path';
      mockWorkspaceConfig.get.returns(currentValue);
      mockWorkspaceConfig.update.resolves();

      await Configuration.updateSettingIfChanged(setting, newValue);

      expect(mockWorkspaceConfig.update.calledWith(setting, newValue)).to.be
        .true;
    });

    it('should not update setting when value has not changed', async () => {
      const setting = Settings.ServerPath;
      const currentValue = 'same-path';
      mockWorkspaceConfig.get.returns(currentValue);

      await Configuration.updateSettingIfChanged(setting, currentValue);

      expect(mockWorkspaceConfig.update.called).to.be.false;
    });

    it('should update setting when current value is undefined and new value is not', async () => {
      const setting = Settings.ServerPath;
      const newValue = 'new-path';
      mockWorkspaceConfig.get.returns(undefined);
      mockWorkspaceConfig.update.resolves();

      await Configuration.updateSettingIfChanged(setting, newValue);

      expect(mockWorkspaceConfig.update.calledWith(setting, newValue)).to.be
        .true;
    });

    it('should handle complex objects', async () => {
      const setting = Settings.ServerArgs;
      const currentValue = ['old', 'args'];
      const newValue = ['new', 'args'];
      mockWorkspaceConfig.get.returns(currentValue);
      mockWorkspaceConfig.update.resolves();

      await Configuration.updateSettingIfChanged(setting, newValue);

      expect(mockWorkspaceConfig.update.calledWith(setting, newValue)).to.be
        .true;
    });

    it('should not update when complex objects are the same', async () => {
      const setting = Settings.ServerArgs;
      const value = ['same', 'args'];
      mockWorkspaceConfig.get.returns(value);

      await Configuration.updateSettingIfChanged(setting, value);

      expect(mockWorkspaceConfig.update.called).to.be.false;
    });

    it('should use provided scope', async () => {
      const scope = {} as vscode.ConfigurationScope;
      const setting = Settings.ServerPath;
      const newValue = 'new-path';
      const expectedSection = SettingSections[setting];
      mockWorkspaceConfig.get.returns('old-path');
      mockWorkspaceConfig.update.resolves();

      await Configuration.updateSettingIfChanged(setting, newValue, scope);

      expect(getConfigurationStub.calledWith(expectedSection, scope)).to.be
        .true;
      expect(mockWorkspaceConfig.update.calledWith(setting, newValue)).to.be
        .true;
    });
  });
});
