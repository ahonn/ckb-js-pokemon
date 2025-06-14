import * as bindings from '@ckb-js-std/bindings';
import { log } from '@ckb-js-std/core';
import { getTransactionType, TransactionType } from './utils';
import { validateMintTransaction } from './mint';
import { validateTransferTransaction } from './transfer';

log.setLevel(log.LogLevel.Debug);

function main(): number {
  log.debug('PokePoint contract starting');

  try {
    const transactionType = getTransactionType();
    log.debug(`Transaction type: ${transactionType}`);

    switch (transactionType) {
      case TransactionType.MINT:
        return validateMintTransaction();
      case TransactionType.TRANSFER:
        return validateTransferTransaction();
      case TransactionType.BURN:
        // Burn transactions don't need validation - the destruction of PokePoint inputs
        // and return of CKB capacity is handled automatically by the CKB VM
        log.debug('Burn transaction - no validation needed');
        return 0;
      default:
        log.debug(`Unknown transaction type: ${transactionType}`);
        return 1;
    }
  } catch (error: any) {
    log.debug(`Contract error: ${error.message || error}`);
    return 1;
  }
}

bindings.exit(main());
