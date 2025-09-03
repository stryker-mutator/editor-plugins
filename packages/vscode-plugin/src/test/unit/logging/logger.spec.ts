import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { Logger } from '../../../logging/logger';

describe(Logger.name, () => {
  let mockOutputChannel: any;
  let createOutputChannelStub: sinon.SinonStub;
  let logger: Logger;
  const channelName = 'Test Channel';

  beforeEach(() => {
    mockOutputChannel = {
      appendLine: sinon.stub(),
      show: sinon.stub(),
      clear: sinon.stub(),
      hide: sinon.stub(),
      dispose: sinon.stub(),
      name: channelName,
      replace: sinon.stub(),
    };

    createOutputChannelStub = sinon
      .stub(vscode.window, 'createOutputChannel')
      .returns(mockOutputChannel);

    logger = new Logger(channelName);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('info', () => {
    it('should log info message without level prefix', () => {
      const message = 'Test info message';

      logger.info(message);

      expect(mockOutputChannel.appendLine.calledOnce).to.be.true;
      expect(mockOutputChannel.appendLine.calledWith(message)).to.be.true;
    });

    it('should log info message with single label', () => {
      const message = 'Test info message';
      const label = 'TestLabel';

      logger.info(message, label);

      expect(mockOutputChannel.appendLine.calledWith(`[${label}] ${message}`))
        .to.be.true;
    });

    it('should log info message with multiple labels', () => {
      const message = 'Test info message';
      const labels = ['Label1', 'Label2', 'Label3'];

      logger.info(message, ...labels);

      expect(
        mockOutputChannel.appendLine.calledWith(
          '[Label1] [Label2] [Label3] Test info message',
        ),
      ).to.be.true;
    });

    it('should not show output channel for info messages', () => {
      logger.info('Test message');

      expect(mockOutputChannel.show.called).to.be.false;
    });
  });

  describe('warn', () => {
    it('should log warning message with WARN level', () => {
      const message = 'Test warning message';

      logger.warn(message);

      expect(
        mockOutputChannel.appendLine.calledWith('[WARN] Test warning message'),
      ).to.be.true;
    });

    it('should log warning message with labels and WARN level', () => {
      const message = 'Test warning message';
      const labels = ['WarnLabel1', 'WarnLabel2'];

      logger.warn(message, ...labels);

      expect(
        mockOutputChannel.appendLine.calledWith(
          '[WarnLabel1] [WarnLabel2] [WARN] Test warning message',
        ),
      ).to.be.true;
    });

    it('should show output channel after logging warning', () => {
      logger.warn('Test warning');

      expect(mockOutputChannel.show.calledOnce).to.be.true;
      expect(mockOutputChannel.show.calledWith(sinon.match.any)).to.be.true;
    });

    it('should show output channel after appendLine', () => {
      logger.warn('Test warning');

      expect(mockOutputChannel.appendLine.calledBefore(mockOutputChannel.show))
        .to.be.true;
    });
  });

  describe('error', () => {
    it('should log error message with ERROR level', () => {
      const message = 'Test error message';

      logger.error(message);

      expect(
        mockOutputChannel.appendLine.calledWith('[ERROR] Test error message'),
      ).to.be.true;
    });

    it('should log error message with labels and ERROR level', () => {
      const message = 'Test error message';
      const labels = ['ErrorLabel1', 'ErrorLabel2'];

      logger.error(message, ...labels);

      expect(
        mockOutputChannel.appendLine.calledWith(
          '[ErrorLabel1] [ErrorLabel2] [ERROR] Test error message',
        ),
      ).to.be.true;
    });

    it('should show output channel after logging error', () => {
      logger.error('Test error');

      expect(mockOutputChannel.show.calledOnce).to.be.true;
      expect(mockOutputChannel.show.calledWith(sinon.match.any)).to.be.true;
    });

    it('should show output channel after appendLine', () => {
      logger.error('Test error');

      expect(mockOutputChannel.appendLine.calledBefore(mockOutputChannel.show))
        .to.be.true;
    });
  });

  describe('clear', () => {
    it('should call clear on output channel', () => {
      logger.clear();

      expect(mockOutputChannel.clear.calledOnce).to.be.true;
    });

    it('should call clear without arguments', () => {
      logger.clear();

      expect(mockOutputChannel.clear.calledWith()).to.be.true;
    });
  });

  describe('log formatting', () => {
    it('should handle empty labels array', () => {
      logger.info('Test message');

      expect(mockOutputChannel.appendLine.calledWith('Test message')).to.be
        .true;
    });

    it('should handle single empty string label', () => {
      logger.info('Test message', '');

      expect(mockOutputChannel.appendLine.calledWith('[] Test message')).to.be
        .true;
    });

    it('should format labels with brackets and spaces correctly', () => {
      logger.warn('Test message', 'Label1', 'Label2');

      expect(
        mockOutputChannel.appendLine.calledWith(
          '[Label1] [Label2] [WARN] Test message',
        ),
      ).to.be.true;
    });

    it('should handle special characters in labels', () => {
      const specialLabel = 'Label-With_Special#Characters';
      logger.error('Test message', specialLabel);

      expect(
        mockOutputChannel.appendLine.calledWith(
          `[${specialLabel}] [ERROR] Test message`,
        ),
      ).to.be.true;
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Message with special chars: @#$%^&*()';
      logger.info(specialMessage, 'Label');

      expect(
        mockOutputChannel.appendLine.calledWith(`[Label] ${specialMessage}`),
      ).to.be.true;
    });
  });

  describe('level formatting', () => {
    it('should not add level prefix for info messages', () => {
      logger.info('Test', 'Label');

      const expectedCall = mockOutputChannel.appendLine.firstCall;
      expect(expectedCall.args[0]).to.not.include('[INFO]');
      expect(expectedCall.args[0]).to.equal('[Label] Test');
    });

    it('should add WARN level prefix for warnings', () => {
      logger.warn('Test');

      expect(mockOutputChannel.appendLine.calledWith('[WARN] Test')).to.be.true;
    });

    it('should add ERROR level prefix for errors', () => {
      logger.error('Test');

      expect(mockOutputChannel.appendLine.calledWith('[ERROR] Test')).to.be
        .true;
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple logging calls independently', () => {
      logger.info('Info message', 'InfoLabel');
      logger.warn('Warning message', 'WarnLabel');
      logger.error('Error message', 'ErrorLabel');

      expect(mockOutputChannel.appendLine.calledThrice).to.be.true;
      expect(
        mockOutputChannel.appendLine.firstCall.calledWith(
          '[InfoLabel] Info message',
        ),
      ).to.be.true;
      expect(
        mockOutputChannel.appendLine.secondCall.calledWith(
          '[WarnLabel] [WARN] Warning message',
        ),
      ).to.be.true;
      expect(
        mockOutputChannel.appendLine.thirdCall.calledWith(
          '[ErrorLabel] [ERROR] Error message',
        ),
      ).to.be.true;

      expect(mockOutputChannel.show.calledTwice).to.be.true; // Only for warn and error
    });

    it('should handle long messages without truncation', () => {
      const longMessage = 'A'.repeat(1000);
      logger.info(longMessage);

      expect(mockOutputChannel.appendLine.calledWith(longMessage)).to.be.true;
    });

    it('should handle many labels', () => {
      const manyLabels = Array.from({ length: 10 }, (_, i) => `Label${i}`);
      logger.info('Test', ...manyLabels);

      const expectedPrefix = manyLabels.map((l) => `[${l}]`).join(' ') + ' ';
      expect(mockOutputChannel.appendLine.calledWith(`${expectedPrefix}Test`))
        .to.be.true;
    });
  });
});
