import * as bindings from '@ckb-js-std/bindings';
import { log } from '@ckb-js-std/core';
import {
  loadPokePointAmount,
  loadCkbPerPoint,
  isCreationTransaction,
  ensureOnlyOne,
} from './utils';

log.setLevel(log.LogLevel.Debug);

function main(): number {
  log.debug('PokePoint contract starting');

  try {
    // Ensure this is a creation transaction (no PokePoint inputs)
    if (!isCreationTransaction()) {
      log.debug('Not a creation transaction - PokePoint inputs found');
      return 1;
    }

    // Ensure only one PokePoint output
    ensureOnlyOne(bindings.SOURCE_GROUP_OUTPUT);

    // Load the amount from the single PokePoint output
    const amount = loadPokePointAmount(0, bindings.SOURCE_GROUP_OUTPUT);
    log.debug(`PokePoint amount: ${amount}`);

    // Validate amount is not zero
    if (amount === 0n) {
      log.debug('Amount cannot be zero');
      return 1;
    }

    // Load the ckbPerPoint from script args
    let ckbPerPoint: bigint = loadCkbPerPoint();
    log.debug(`CKB per point: ${ckbPerPoint}`);

    // Load the cell capacity
    const capacityData = bindings.loadCellByField(
      0,
      bindings.SOURCE_GROUP_OUTPUT,
      bindings.CELL_FIELD_CAPACITY,
    );
    const cellCapacity = new DataView(capacityData).getBigUint64(0, true);
    log.debug(`Cell capacity: ${cellCapacity}`);

    // Validate capacity is sufficient for the points
    const requiredCapacity = amount * ckbPerPoint;
    if (cellCapacity < requiredCapacity) {
      log.debug(`Insufficient capacity: have ${cellCapacity}, need ${requiredCapacity}`);
      return 1;
    }

    log.debug('Contract execution successful');
    return 0;
  } catch (error: any) {
    log.debug(`Contract error: ${error.message || error}`);
    return 1;
  }
}

bindings.exit(main());
