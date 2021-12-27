import { BlockHeader, BigNumber, AccountBasedTransaction, BlockchainPlatform, CurrencyRegistry ,getLogger} from 'worker-common';
const logger = getLogger('rawdb::insertDeposit');
export class XtzTransaction extends AccountBasedTransaction {
  public readonly receiptStatus: boolean;
  public readonly block: BlockHeader;
  public readonly receipt: any;
  public readonly originalTx: any;
  public readonly coinSpecific: any;

  constructor(
    tx: any, //detail transaction
    block: BlockHeader,
    receipt: any,
    lastNetworkBlockNumber: number
  ) {
    const currency = CurrencyRegistry.getOneNativeCurrency(BlockchainPlatform.Tezos);
    const txProps = {
      confirmations: tx.meta.TransactionResult,
      height: tx.ledger_index,
      timestamp: block.timestamp,
      txid: tx.hash,
      fromAddress: tx.Account,
      toAddress: tx.Destination,
      amount: new BigNumber(tx.Amount),
    };

    super(currency, txProps, block);

    this.receiptStatus = tx.validated;
    this.block = block;
    this.receipt = tx;
    this.originalTx = tx;
    this.coinSpecific = tx?.DestinationTag;
  }

  // public getExtraDepositData(): any {
  //   return Object.assign({}, super.getExtraDepositData(), {
  //     txIndex: this.receipt.transactionIndex,
  //   });  
  // }

  public getNetworkFee(): BigNumber {
    const fee = this.receipt.Fee
    return fee
  }
}

export default XtzTransaction;
