import { createConnection, getConnection } from 'wallet-core/node_modules/typeorm';
import _ from 'lodash';
import {
  getLogger,
  CurrencyRegistry,
  EnvConfigRegistry,
  ICurrency,
  Utils,
  settleEnvironment,
  getRedisSubscriber,
} from 'worker-common';
import { entities, callbacks } from 'wallet-core';

const { CurrencyConfig, EnvConfig } = entities;
const { prepareWalletBalanceAll } = callbacks;

const logger = getLogger('prepareEnvironment');

export async function prepareEnvironment(): Promise<void> {
  logger.info(`Application has been started xtz`);
  logger.info(`Preparing DB connection xtz...`);
  await createConnection({
    name: 'default',
    type: 'mysql',
    host: process.env.TYPEORM_HOST,
    port: process.env.TYPEORM_PORT ? parseInt(process.env.TYPEORM_PORT, 10) : 3306,
    username: process.env.TYPEORM_USERNAME,
    password: process.env.TYPEORM_PASSWORD,
    database: process.env.TYPEORM_DATABASE,
    synchronize: false,
    logging: process.env.TYPEORM_LOGGING ? process.env.TYPEORM_LOGGING === 'true' : true,
    cache: process.env.TYPEORM_CACHE ? process.env.TYPEORM_CACHE === 'true' : true,
    entities: process.env.TYPEORM_ENTITIES.split(','),
  });

  logger.info(`DB connected successfully xtz...`);
  const connection = getConnection();
  logger.info(`Loading environment configurations from database xtz...`);

  const [currencyConfigs, envConfigs] = await Promise.all([
    connection.getRepository(CurrencyConfig).find({}),
    connection.getRepository(EnvConfig).find({}),
  ]);

  envConfigs.forEach((config) => {
    EnvConfigRegistry.setCustomEnvConfig(config.key, config.value);
  });

  const xtz20Currencies: ICurrency[] = [];

  currencyConfigs.forEach((config) => {
    if (!CurrencyRegistry.hasOneNativeCurrencyByPlatform(config.chain)) {
      throw new Error(`There's config for unknown chain: ${config.chain}`);
    }

    const currency = CurrencyRegistry.getOneNativeCurrency(config.chain);
    CurrencyRegistry.setCurrencyConfig(currency, config);
  });

  if (EnvConfigRegistry.isUsingRedis()) {
    const redisHost = EnvConfigRegistry.getCustomEnvConfig('REDIS_HOST') || process.env.REDIS_HOST;
    const redisPort = EnvConfigRegistry.getCustomEnvConfig('REDIS_PORT') || process.env.REDIS_PORT;
    const redisUrl = EnvConfigRegistry.getCustomEnvConfig('REDIS_URL') || process.env.REDIS_URL;
    if ((!redisHost && !redisUrl) || (!redisPort && !redisUrl)) {
      throw new Error(
        `Some redis configs are missing. REDIS_HOST=${redisHost}, REDIS_PORT=${redisPort}, REDIS_URL=${redisUrl}`,
      );
    }
  }

  const redisSubscriber = getRedisSubscriber();
  redisSubscriber.on('message', onRedisMessage);

  await settleEnvironment();

  // seperate command by platform
  await Utils.PromiseAll([prepareWalletBalanceAll([CurrencyRegistry.Tezos])]);

  logger.info(`Environment has been setup successfully xtz...`);
  return;
}

function onRedisMessage(channel: any, message: any) {
  const appId = EnvConfigRegistry.getAppId();
  if (appId !== channel) {
    return;
  }

  let messageObj: any = null;
  try {
    messageObj = JSON.parse(message);
  } catch (e) {
    logger.warn(`Unexpected message from redis: ${message}`);
  }

  if (!messageObj) {
    return;
  }
}
