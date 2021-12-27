// const xrpl = require("xrpl")
import * as Sotez from "sotez";
const request1 = require('request-promise');

import { CurrencyRegistry, BlockchainPlatform, getLogger } from 'worker-common';

const logger = getLogger('sotez');

let tezos

CurrencyRegistry.onCurrencyConfigSet(async(currency, config) => {
  if (currency.symbol !== BlockchainPlatform.Tezos) {
    return;
  }

  logger.info(`xrpl::onCurrencyConfigSet currency=${currency.symbol} config=${JSON.stringify(config)}`);
  if (!config.restEndpoint) {
    return;
  }

  tezos = new Sotez.Sotez(config.restEndpoint);
});

export { tezos, Sotez, request1 };
