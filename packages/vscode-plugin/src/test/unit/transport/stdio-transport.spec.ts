import { expect } from 'chai';
import sinon from 'sinon';
import { StdioTransport } from '../../../transport/stdio-transport.ts';
import { Process } from '../../../process.ts';
import { ContextualLogger } from '../../../logging/index.ts';
import { JSONRPCRequest, JSONRPCResponse } from 'json-rpc-2.0';

describe(StdioTransport.name, () => {
  let sandbox: sinon.SinonSandbox;
  let sut: StdioTransport;
  let loggerMock: sinon.SinonStubbedInstance<ContextualLogger>;
  let processMock: sinon.SinonStubbedInstance<Process>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    loggerMock = sandbox.createStubInstance(ContextualLogger);
    processMock = sandbox.createStubInstance(Process);

    sut = new StdioTransport(loggerMock, processMock);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('init', () => {
    it('should set up event listeners and mark as connected', async () => {
      // Act
      await sut.init();

      // Assert
      expect(processMock.on.calledWith('stdout')).to.be.true;
      expect(processMock.on.calledWith('stderr')).to.be.true;
      expect(sut.isConnected()).to.be.true;
    });

    it('should handle stderr data by logging it', async () => {
      const testData = Buffer.from('error message\n');

      // Act
      await sut.init();

      // Simulate stderr event
      const stderrCallback = processMock.on.getCall(1).args[1];
      stderrCallback(testData);

      // Assert
      expect(loggerMock.info.calledWith('error message\n', 'Server')).to.be
        .true;
    });
  });

  describe('send', () => {
    beforeEach(async () => {
      await sut.init();
    });

    it('should send message with Content-Length header when connected', () => {
      const message = '{"jsonrpc":"2.0","method":"test","params":{}}';
      const expectedContent = Buffer.from(message);

      // Act
      sut.send(message);

      // Assert
      expect(
        processMock.write.calledWith(
          `Content-Length: ${expectedContent.byteLength}\r\n\r\n${expectedContent}`,
        ),
      ).to.be.true;
    });

    it('should throw error when not connected', () => {
      // Arrange
      const sut = new StdioTransport(loggerMock, processMock);
      const message = '{"jsonrpc":"2.0","method":"test","params":{}}';

      // Act & Assert
      expect(() => sut.send(message)).to.throw(
        'Stdio transport is not connected',
      );
    });
  });

  describe('dispose', () => {
    it('should mark as disconnected and complete subjects', async () => {
      // Arrange
      await sut.init();
      const notificationsSpy = sandbox.spy(sut.notifications, 'complete');
      const messagesSpy = sandbox.spy(sut.messages, 'complete');

      // Act
      await sut.dispose();

      // Assert
      expect(sut.isConnected()).to.be.false;
      expect(notificationsSpy.calledOnce).to.be.true;
      expect(messagesSpy.calledOnce).to.be.true;
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(sut.isConnected()).to.be.false;
    });

    it('should return true after init', async () => {
      await sut.init();
      expect(sut.isConnected()).to.be.true;
    });

    it('should return false after dispose', async () => {
      await sut.init();
      await sut.dispose();
      expect(sut.isConnected()).to.be.false;
    });
  });

  describe('message handling', () => {
    let notificationCallback: (notification: JSONRPCRequest) => void;
    let messageCallback: (message: JSONRPCResponse) => void;

    beforeEach(async () => {
      await sut.init();

      // Set up subscribers to capture emitted events
      sut.notifications.subscribe((notification) => {
        notificationCallback?.(notification);
      });

      sut.messages.subscribe((message) => {
        messageCallback?.(message);
      });
    });

    it('should emit notifications for JSON-RPC messages without id', async () => {
      const testNotification: JSONRPCRequest = {
        jsonrpc: '2.0',
        method: 'test/notification',
        params: { data: 'test' },
      };

      const jsonData = JSON.stringify(testNotification);
      const testData = Buffer.from(
        `Content-Length: ${jsonData.length}\r\n\r\n${jsonData}`,
      );

      let receivedNotification: JSONRPCRequest | undefined;
      notificationCallback = (notification) => {
        receivedNotification = notification;
      };

      // Simulate stdout data
      const stdoutCallback = processMock.on.getCall(0).args[1];
      stdoutCallback(testData);

      // Assert
      expect(receivedNotification).to.deep.equal(testNotification);
    });

    it('should emit messages for JSON-RPC responses with id', async () => {
      const testResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 123,
        result: { data: 'test' },
      };

      const jsonData = JSON.stringify(testResponse);
      const testData = Buffer.from(
        `Content-Length: ${jsonData.length}\r\n\r\n${jsonData}`,
      );

      let receivedMessage: JSONRPCResponse | undefined;
      messageCallback = (message) => {
        receivedMessage = message;
      };

      // Simulate stdout data
      const stdoutCallback = processMock.on.getCall(0).args[1];
      stdoutCallback(testData);

      // Assert
      expect(receivedMessage).to.deep.equal(testResponse);
    });

    it('should handle malformed JSON by logging error', async () => {
      const malformedJson = '{invalid}';
      const malformedData = Buffer.from(
        `Content-Length: ${malformedJson.length}\r\n\r\n${malformedJson}`,
      );

      // Simulate stdout data
      const stdoutCallback = processMock.on.getCall(0).args[1];
      stdoutCallback(malformedData);

      // Assert - should log error but not crash
      expect(loggerMock.error.called).to.be.true;
    });

    it('should handle partial messages correctly', async () => {
      const testResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 456,
        result: { data: 'partial' },
      };

      const jsonData = JSON.stringify(testResponse);
      const fullData = `Content-Length: ${jsonData.length}\r\n\r\n${jsonData}`;
      const part1 = Buffer.from(fullData.slice(0, 20));
      const part2 = Buffer.from(fullData.slice(20));

      let receivedMessage: JSONRPCResponse | undefined;
      messageCallback = (message) => {
        receivedMessage = message;
      };

      // Simulate stdout data in two parts
      const stdoutCallback = processMock.on.getCall(0).args[1];
      stdoutCallback(part1);
      expect(receivedMessage).to.be.undefined; // Not complete yet
      stdoutCallback(part2);

      // Assert
      expect(receivedMessage).to.deep.equal(testResponse);
    });

    it('should handle junk data between messages', async () => {
      const testResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 789,
        result: { data: 'clean' },
      };

      const jsonData = JSON.stringify(testResponse);
      const validData = `Content-Length: ${jsonData.length}\r\n\r\n${jsonData}`;
      const junkData = 'JUNK_DATA';
      const combinedData = Buffer.from(`${junkData}${validData}`);

      let receivedMessage: JSONRPCResponse | undefined;
      messageCallback = (message) => {
        receivedMessage = message;
      };

      // Simulate stdout data with junk
      const stdoutCallback = processMock.on.getCall(0).args[1];
      stdoutCallback(combinedData);

      // Assert
      expect(receivedMessage).to.deep.equal(testResponse);
    });
  });
});
