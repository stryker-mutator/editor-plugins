import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

// Configure Chai with plugins
chai.use(sinonChai);
chai.use(chaiAsPromised);
