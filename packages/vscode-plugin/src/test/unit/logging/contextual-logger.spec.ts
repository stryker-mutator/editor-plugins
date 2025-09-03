import { expect } from 'chai';
import * as sinon from 'sinon';
import { ContextualLogger } from '../../../logging/contextual-logger';
import { Logger } from '../../../logging/logger';

describe(ContextualLogger.name, () => {
  let mockLogger: sinon.SinonStubbedInstance<Logger>;
  let contextualLogger: ContextualLogger;
  const testContext = 'TestContext';

  beforeEach(() => {
    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      clear: sinon.stub(),
    } as any;

    contextualLogger = new ContextualLogger(mockLogger as any, testContext);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('info', () => {
    it('should call logger.info with context label and message', () => {
      const message = 'Test info message';

      contextualLogger.info(message);

      expect(mockLogger.info.calledOnce).to.be.true;
      expect(mockLogger.info.calledWith(message, testContext)).to.be.true;
    });

    it('should call logger.info with context label, message and additional labels', () => {
      const message = 'Test info message';
      const additionalLabels = ['Label1', 'Label2'];

      contextualLogger.info(message, ...additionalLabels);

      expect(mockLogger.info.calledOnce).to.be.true;
      expect(
        mockLogger.info.calledWith(message, testContext, 'Label1', 'Label2'),
      ).to.be.true;
    });

    it('should handle empty additional labels', () => {
      const message = 'Test info message';

      contextualLogger.info(message);

      expect(mockLogger.info.calledWith(message, testContext)).to.be.true;
    });

    it('should handle multiple additional labels', () => {
      const message = 'Test info message';

      contextualLogger.info(message, 'Extra1', 'Extra2', 'Extra3');

      expect(
        mockLogger.info.calledWith(
          message,
          testContext,
          'Extra1',
          'Extra2',
          'Extra3',
        ),
      ).to.be.true;
    });
  });

  describe('warn', () => {
    it('should call logger.warn with context label and message', () => {
      const message = 'Test warning message';

      contextualLogger.warn(message);

      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.calledWith(message, testContext)).to.be.true;
    });

    it('should call logger.warn with context label, message and additional labels', () => {
      const message = 'Test warning message';
      const additionalLabels = ['WarnLabel1', 'WarnLabel2'];

      contextualLogger.warn(message, ...additionalLabels);

      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(
        mockLogger.warn.calledWith(
          message,
          testContext,
          'WarnLabel1',
          'WarnLabel2',
        ),
      ).to.be.true;
    });

    it('should handle single additional label', () => {
      const message = 'Test warning message';

      contextualLogger.warn(message, 'SingleLabel');

      expect(mockLogger.warn.calledWith(message, testContext, 'SingleLabel')).to
        .be.true;
    });
  });

  describe('error', () => {
    it('should call logger.error with context label and message', () => {
      const message = 'Test error message';

      contextualLogger.error(message);

      expect(mockLogger.error.calledOnce).to.be.true;
      expect(mockLogger.error.calledWith(message, testContext)).to.be.true;
    });

    it('should call logger.error with context label, message and additional labels', () => {
      const message = 'Test error message';
      const additionalLabels = ['ErrorLabel1', 'ErrorLabel2'];

      contextualLogger.error(message, ...additionalLabels);

      expect(mockLogger.error.calledOnce).to.be.true;
      expect(
        mockLogger.error.calledWith(
          message,
          testContext,
          'ErrorLabel1',
          'ErrorLabel2',
        ),
      ).to.be.true;
    });

    it('should preserve label order with context first', () => {
      const message = 'Test error message';

      contextualLogger.error(message, 'Second', 'Third');

      const [actualMessage, firstLabel, secondLabel, thirdLabel] =
        mockLogger.error.firstCall.args;
      expect(actualMessage).to.equal(message);
      expect(firstLabel).to.equal(testContext);
      expect(secondLabel).to.equal('Second');
      expect(thirdLabel).to.equal('Third');
    });
  });

  describe('clear', () => {
    it('should call logger.clear', () => {
      contextualLogger.clear();

      expect(mockLogger.clear.calledOnce).to.be.true;
    });
  });
});
