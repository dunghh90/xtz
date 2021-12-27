import { BasePlatformCrawler, BlockchainPlatform, ICrawlerOptions } from 'worker-common';

export class XtzCrawler extends BasePlatformCrawler {
  protected _processingTimeout: number = 300000;
  constructor(options: ICrawlerOptions) {
    super(BlockchainPlatform.Tezos, options);
  }
}

export default XtzCrawler;
