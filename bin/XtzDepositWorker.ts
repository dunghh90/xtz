import 'worker-xtz';
import { callbacks } from 'wallet-core';
import { ICrawlerOptions, BlockchainPlatform, BasePlatformCrawler } from 'worker-common';
import { prepareEnvironment } from './prepareEnvironment';

class XtzCrawler extends BasePlatformCrawler {
  protected _processingTimeout = 300000;
  constructor(options: ICrawlerOptions) {
    super(BlockchainPlatform.Tezos, options);
  }
}

prepareEnvironment()
  .then(start)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

function start() {
  const { getLatestCrawledBlockNumber, onCrawlingTxs, onBlockCrawled } = callbacks;
  const crawlerOpts: ICrawlerOptions = {
    getLatestCrawledBlockNumber,
    onCrawlingTxs,
    onBlockCrawled,
  };

  const crawler = new XtzCrawler(crawlerOpts);
  crawler.start();
}
