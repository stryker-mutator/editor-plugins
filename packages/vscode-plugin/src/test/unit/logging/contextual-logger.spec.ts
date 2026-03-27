import { expect } from 'chai';
import sinon from 'sinon';

import { ContextualLogger } from '../../../logging/contextual-logger.ts';
import type { Logger } from '../../../logging/logger.ts';

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
    } as unknown as sinon.SinonStubbedInstance<Logger>;

    contextualLogger = new ContextualLogger(mockLogger, testContext);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('info', () => {
    it('should call logger.info with context label and message', () => {
      const message = 'Test info message';

      contextualLogger.info(message);

      expect(mockLogger.info.calledOnce).to.be.true;
      expect(mockLogger.info.calledWith(message, { labels: [testContext] })).to
        .be.true;
    });

    it('should call logger.info with context label, message and additional labels', () => {
      const message = 'Test info message';
      const additionalLabels = ['Label1', 'Label2'];

      contextualLogger.info(message, { labels: additionalLabels });

      expect(mockLogger.info.calledOnce).to.be.true;
      expect(
        mockLogger.info.calledWith(message, {
          labels: [testContext, 'Label1', 'Label2'],
        }),
      ).to.be.true;
    });

    it('should handle empty additional labels', () => {
      const message = 'Test info message';

      contextualLogger.info(message);

      expect(mockLogger.info.calledWith(message, { labels: [testContext] })).to
        .be.true;
    });

    it('should handle multiple additional labels', () => {
      const message = 'Test info message';

      contextualLogger.info(message, {
        labels: ['Extra1', 'Extra2', 'Extra3'],
      });

      expect(
        mockLogger.info.calledWith(message, {
          labels: [testContext, 'Extra1', 'Extra2', 'Extra3'],
        }),
      ).to.be.true;
    });

    it('should forward notify option after labels', () => {
      const message = 'Test info message';

      contextualLogger.info(message, {
        labels: ['Extra1'],
        notify: true,
      });

      expect(
        mockLogger.info.calledWith(message, {
          labels: [testContext, 'Extra1'],
          notify: true,
        }),
      ).to.be.true;
    });
  });

  describe('warn', () => {
    it('should call logger.warn with context label and message', () => {
      const message = 'Test warning message';

      contextualLogger.warn(message);

      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.calledWith(message, { labels: [testContext] })).to
        .be.true;
    });

    it('should call logger.warn with context label, message and additional labels', () => {
      const message = 'Test warning message';
      const additionalLabels = ['WarnLabel1', 'WarnLabel2'];

      contextualLogger.warn(message, { labels: additionalLabels });

      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(
        mockLogger.warn.calledWith(message, {
          labels: [testContext, 'WarnLabel1', 'WarnLabel2'],
        }),
      ).to.be.true;
    });

    it('should handle single additional label', () => {
      const message = 'Test warning message';

      contextualLogger.warn(message, { labels: ['SingleLabel'] });

      expect(
        mockLogger.warn.calledWith(message, {
          labels: [testContext, 'SingleLabel'],
        }),
      ).to.be.true;
    });

    it('should forward notify option', () => {
      const message = 'Test warning message';

      contextualLogger.warn(message, { notify: true });

      expect(
        mockLogger.warn.calledWith(message, {
          labels: [testContext],
          notify: true,
        }),
      ).to.be.true;
    });
  });

  describe('error', () => {
    it('should call logger.error with context label and message', () => {
      const message = 'Test error message';

      contextualLogger.error(message);

      expect(mockLogger.error.calledOnce).to.be.true;
      expect(mockLogger.error.calledWith(message, { labels: [testContext] })).to
        .be.true;
    });

    it('should call logger.error with context label, message and additional labels', () => {
      const message = 'Test error message';
      const additionalLabels = ['ErrorLabel1', 'ErrorLabel2'];

      contextualLogger.error(message, { labels: additionalLabels });

      expect(mockLogger.error.calledOnce).to.be.true;
      expect(
        mockLogger.error.calledWith(message, {
          labels: [testContext, 'ErrorLabel1', 'ErrorLabel2'],
        }),
      ).to.be.true;
    });

    it('should preserve label order with context first', () => {
      const message = 'Test error message';

      contextualLogger.error(message, { labels: ['Second', 'Third'] });

      const [actualMessage, args] = mockLogger.error.firstCall.args;
      expect(actualMessage).to.equal(message);
      expect(args).to.deep.equal({
        labels: [testContext, 'Second', 'Third'],
      });
    });

    it('should forward notify option after labels', () => {
      const message = 'Test error message';

      contextualLogger.error(message, {
        labels: ['Second'],
        notify: true,
      });

      expect(
        mockLogger.error.calledWith(message, {
          labels: [testContext, 'Second'],
          notify: true,
        }),
      ).to.be.true;
    });
  });

  describe('clear', () => {
    it('should call logger.clear', () => {
      contextualLogger.clear();

      expect(mockLogger.clear.calledOnce).to.be.true;
    });
  });
});
