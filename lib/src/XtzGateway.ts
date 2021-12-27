import _ from 'lodash';
import * as web3_accounts from 'web3-eth-accounts';
import * as web3_types from 'web3-eth';
import * as web3_types2 from 'web3-core/types';
import { tezos, Sotez, request1 } from './sotez';
import { XtzTransaction } from './XtzTransaction';
import {
  Block,
  AccountBasedGateway,
  getLogger,
  IRawTransaction,
  ISignedRawTransaction,
  ISubmittedTransaction,
  TransactionStatus,
  override,
  Utils,
  Address,
  BigNumber,
  implement,
  CurrencyRegistry,
  GatewayRegistry,
  TokenType,
  BlockchainPlatform,
  getRedisClient,
  EnvConfigRegistry,
} from 'worker-common';
import LRU from 'lru-cache';
import { request } from 'http';

const logger = getLogger('XtzGateway');
const _cacheBlockNumber = {
  value: 0,
  updatedAt: 0,
  isRequesting: false,
};

const _cacheRawTxByHash: LRU<string, web3_types.Transaction> = new LRU({
  max: 1024,
  maxAge: 1000 * 60 * 5,
});
const _cacheRawTxReceipt: LRU<string, web3_types2.TransactionReceipt> = new LRU({
  max: 1024,
  maxAge: 1000 * 60 * 5,
});
const _isRequestingTx: Map<string, boolean> = new Map<string, boolean>();
const _isRequestingReceipt: Map<string, boolean> = new Map<string, boolean>();

GatewayRegistry.registerLazyCreateMethod(CurrencyRegistry.Tezos, () => new XtzGateway());

export class XtzGateway extends AccountBasedGateway {

  public constructor() {
    super(CurrencyRegistry.Tezos);
  }

  /**
   * Create a new random account/address
   *
   * @returns {IAccount} the account object
   */
   public async createAccountAsync(): Promise<any> {
    logger.info('create account xtz');
    const mnemonic = Sotez.cryptoUtils.generateMnemonic();
    const pass = process.env.XTZ_PASSWORD ? process.env.XTZ_PASSWORD : 'my_seed_password';
    const keys = await Sotez.cryptoUtils.generateKeys(mnemonic, pass);
    
    return {
      address: keys.pkh,
      privateKey: keys.sk
    };
  }

  /**
   * Check whether an address is valid
   * @param address
   */
   public async isValidAddressAsync(address: string): Promise<boolean> {
    return Sotez.cryptoUtils.checkAddress(address);
  }

  public async getAverageSeedingFee(): Promise<any> {
  }

  public async getBlockHeight(): Promise<any> {
  }

  public async getAccountFromPrivateKey(privateKey: string): Promise<any> {
  }

  public async getAddressBalance(address: string): Promise<any> {
  }

  public async getBlockCount(): Promise<number> {
    const now = Utils.nowInMillis();
    const CACHE_TIME = 10000;
    if (_cacheBlockNumber.value > 0 && now - _cacheBlockNumber.updatedAt < CACHE_TIME) {
      return _cacheBlockNumber.value;
    }

    if (_cacheBlockNumber.isRequesting) {
      await Utils.timeout(500);
      return this.getBlockCount();
    }

    _cacheBlockNumber.isRequesting = true;
    // Since there're some cases that newest block is not fully broadcasted to the network
    // We decrease latest block number by 1 for safety
    console.log("🚀 ~ file: XtzGateway.ts ~ line 109 ~ XtzGateway ~ getBlockCount ~ blockNum", await tezos.getHeader())
    const header = await tezos.getHeader();
    const blockNum = (header.level) - 1;
    const newUpdatedAt = Utils.nowInMillis();
    _cacheBlockNumber.value = blockNum;
    _cacheBlockNumber.updatedAt = newUpdatedAt;
    _cacheBlockNumber.isRequesting = false;
    logger.debug(`XrpGateway::getBlockCount value=${blockNum} updatedAt=${newUpdatedAt}`);
    return blockNum;
  }

  @implement
  public async constructRawTransaction(
    fromAddress: Address,
    toAddress: Address,
    value: BigNumber,
    options: {
      isConsolidate: false;
      destinationTag?: string;
      useLowerNetworkFee?: boolean;
      explicitGasPrice?: number,
      explicitGasLimit?: number,
      nonce?: number
    }
  ): Promise<IRawTransaction> {

    return {
      txid: `0x`,
      unsignedRaw: '',
      gasPrice: '',
      nonce:0,
    };
  }

  public async signRawTransaction(unsignedRaw: string, secret: string): Promise<any> {
  }

  public async sendRawTransaction(rawTx: string, retryCount?: number): Promise<any> {
  }

  public async getTransactionStatus(txid: string): Promise<any> {
  }

  public async getRawTransaction(txid: string): Promise<any> {
    console.log("------------------------------xxxxxxxxaaaaaaawwww", txid)
    const operations = await request1(`http://api.hangzhou2net.tzkt.io/v1/operations/${txid}`)
    // const operations = () => {
    //   return request1(`https://api.hangzhou2net.tzkt.io/v1/operations/${txid}`)
    //     .then(body => JSON.parse(body));
    // }
    console.log("🚀 ~ file: XtzGateway.ts ~ line 129 ~ XtzGateway ~ getRawTransaction ~ operations", operations)
    const key = '_cacheRawTxByHash_' + this.getCurrency().symbol + txid;
    let redisClient;
    let cachedTx: any;
    if (!!EnvConfigRegistry.isUsingRedis()) {
      redisClient = getRedisClient();
      const cachedData = await redisClient.get(key);
      if (!!cachedData) {
        cachedTx = JSON.parse(cachedData);
      }
    } else {
      cachedTx = _cacheRawTxByHash.get(key);
    }
    if (cachedTx) {
      return cachedTx;
    }

    if (_isRequestingTx.get(txid)) {
      await Utils.timeout(500);
      return this.getRawTransaction(txid);
    }

    _isRequestingTx.set(txid, true);
    let tx = null;
    try {
      tx = ''
      // tx = await request({
      //   "transaction": txid
      // });
    } catch (err) {
      logger.debug('Error get transaction: ' + JSON.stringify(err))
      return null;
    }

    _isRequestingTx.delete(txid);

    if (!tx) {
      return null;
    }

    if (!tx.result.ledger_index) {
      const gwName = this.constructor.name;
      throw new Error(`${gwName}::getRawTransaction tx doesn't have block number txid=${txid}`);
    }

    if (redisClient) {
      // redis cache tx in 2mins
      redisClient.setex(key, 120, JSON.stringify(tx.result));
    } else {
      _cacheRawTxByHash.set(key, tx.result);
    }
    return tx.result;
  }

  public async getRawTransactionReceipt(txid: string): Promise<any> {
    const key = '_cacheRawTxReceipt_' + this.getCurrency().symbol + txid;
    let redisClient;
    let cachedReceipt: any;
    if (!!EnvConfigRegistry.isUsingRedis()) {
      redisClient = getRedisClient();
      const cachedData = await redisClient.get(key);
      cachedReceipt = JSON.parse(cachedData);
    } else {
      cachedReceipt = _cacheRawTxReceipt.get(key);
    }
    if (cachedReceipt) {
      return cachedReceipt;
    }

    if (_isRequestingReceipt.get(txid)) {
      await Utils.timeout(500);
      return this.getRawTransactionReceipt(txid);
    }

    _isRequestingReceipt.set(txid, true);
    const receipt = ""; ///////////////// TODO
    _isRequestingReceipt.delete(txid);
    if (!receipt) {
      const gwName = this.constructor.name;
      throw new Error(`${gwName}::getRawTransactionReceipt could not get receipt txid=${txid}`);
    }

    if (redisClient) {
      // redis cache receipt in 2mins
      redisClient.setex(key, 120, JSON.stringify(receipt));
    } else {
      _cacheRawTxReceipt.set(key, receipt);
    }
    return receipt;
  }

  public async _getOneBlock(blockNumber: string | number): Promise<Block> {
    const blocks = await tezos.query(`/chains/main/blocks/${blockNumber}`);
    console.log("🚀 ~ file: XtzGateway.ts ~ line 131 ~ XtzGateway ~ _getOneBlock ~ blocks", blocks)
    if (!blocks) {
      return null;
    }
    const block = {
      number : blocks?.header.level,
      hash : blocks?.hash,
      timestamp : blocks?.header.timestamp
    }

    console.log("te=====", blocks?.operations[0])

    const txids = blocks?.operations[0]?.map(tx => (tx.hash ? tx.hash : tx.toString()));
    return new Block(Object.assign({}, block), txids);
  }

  protected async _getOneTransaction(txid: string): Promise<any> {
    console.log("🚀 ~ file: XtzGateway.ts ~ line 265 ~ XtzGateway ~ _getOneTransaction ~ txid", txid)
    const tx = await this.getRawTransaction(txid);
    if (!tx) {
      return null;
    }

    const [receipt, block, lastNetworkBlockNumber] = await Promise.all([
      this.getRawTransactionReceipt(txid),
      this._getOneBlock(tx.ledger_index),
      this.getBlockCount(),
    ]);

    return new XtzTransaction(tx, block, receipt, lastNetworkBlockNumber);
  }
}

export default XtzGateway;
