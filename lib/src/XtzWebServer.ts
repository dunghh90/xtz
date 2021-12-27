import { BaseWebServer, BlockchainPlatform, getLogger } from 'worker-common';

const logger = getLogger('XtzWebServer');

export class XtzWebServer extends BaseWebServer {
  public constructor() {
    super(BlockchainPlatform.Tezos);
  }
}
