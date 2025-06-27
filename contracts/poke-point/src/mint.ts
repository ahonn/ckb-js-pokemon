import * as bindings from '@ckb-js-std/bindings';
import { log } from '@ckb-js-std/core';
import { loadPokePointAmount, loadCkbPerPoint, ensureOnlyOne } from './utils';

export function validateMintTransaction(): number {
  log.debug('Validating mint transaction');

  // Ensure only one PokePoint output
  ensureOnlyOne(bindings.SOURCE_GROUP_OUTPUT);

  // Load the amount from the single PokePoint output
  const amount = loadPokePointAmount(0, bindings.SOURCE_GROUP_OUTPUT);
  log.debug(`PokePoint amount: ${amount}`);
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

  // Validate exact capacity-to-points ratio
  const requiredCapacity = amount * ckbPerPoint;
  
  // Cell capacity must exactly match the required capacity for the points
  if (cellCapacity !== requiredCapacity) {
    log.debug(`Capacity mismatch: have ${cellCapacity}, must be exactly ${requiredCapacity} for ${amount} points`);
    return 1;
  }

  log.debug('Mint transaction validation successful');
  return 0;
}
