import * as bindings from '@ckb-js-std/bindings';
import { log } from '@ckb-js-std/core';
import { loadPokePointAmount, loadCkbPerPoint, calculateTotalAmount } from './utils';

export function validateTransferTransaction(): number {
  log.debug('Validating transfer transaction');

  // Calculate total input and output amounts
  const inputTotal = calculateTotalAmount(bindings.SOURCE_GROUP_INPUT);
  const outputTotal = calculateTotalAmount(bindings.SOURCE_GROUP_OUTPUT);

  log.debug(`Input total: ${inputTotal}, Output total: ${outputTotal}`);

  // Validate conservation of PokePoints
  if (inputTotal !== outputTotal) {
    log.debug('PokePoint amounts do not match: input !== output');
    return 1;
  }

  // Validate all outputs have sufficient capacity
  const ckbPerPoint = loadCkbPerPoint();
  let outputIndex = 0;

  while (true) {
    try {
      const amount = loadPokePointAmount(outputIndex, bindings.SOURCE_GROUP_OUTPUT);
      if (amount === 0n) {
        log.debug(`Output ${outputIndex} has zero amount`);
        return 1;
      }

      // Load the cell capacity
      const capacityData = bindings.loadCellByField(
        outputIndex,
        bindings.SOURCE_GROUP_OUTPUT,
        bindings.CELL_FIELD_CAPACITY,
      );
      const cellCapacity = new DataView(capacityData).getBigUint64(0, true);

      // Validate exact capacity-to-points ratio
      const requiredCapacity = amount * ckbPerPoint;
      
      // Cell capacity must exactly match the required capacity for the points
      if (cellCapacity !== requiredCapacity) {
        log.debug(
          `Output ${outputIndex} capacity mismatch: have ${cellCapacity}, must be exactly ${requiredCapacity} for ${amount} points`,
        );
        return 1;
      }

      outputIndex++;
    } catch (error: any) {
      if (error.errorCode === bindings.INDEX_OUT_OF_BOUND) {
        break;
      } else {
        throw error;
      }
    }
  }

  log.debug('Transfer transaction validation successful');
  return 0;
}
