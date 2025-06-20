import * as bindings from '@ckb-js-std/bindings';
import { log } from '@ckb-js-std/core';
import { getTransactionType, TransactionType } from './utils';
import { validateIssueTransaction } from './issue';
import { validatePurchaseTransaction } from './purchase';
import { validateTransferTransaction } from './transfer';

log.setLevel(log.LogLevel.Debug);

function main(): number {
  log.debug('Pokemon contract starting');

  try {
    const transactionType = getTransactionType();
    log.debug(`Transaction type: ${transactionType}`);

    switch (transactionType) {
      case TransactionType.ISSUE:
        return validateIssueTransaction();
      case TransactionType.PURCHASE:
        return validatePurchaseTransaction();
      case TransactionType.TRANSFER:
        return validateTransferTransaction();
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
