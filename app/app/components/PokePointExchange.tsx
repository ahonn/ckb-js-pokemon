"use client";

import { useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { useApp } from "../context";
import {
  CKB_PER_POINT,
  MIN_CELL_CAPACITY,
  MIN_POINTS_FOR_CELL,
  createPokePointTypeScript,
  pointsToHex,
  calculatePointsFromCKB,
  calculateRequiredCKB,
  addPokePointCellDeps,
} from "../utils/pokepoint";

interface PokePointExchangeProps {
  onSuccess?: () => void;
}

export function PokePointExchange({ onSuccess }: PokePointExchangeProps) {
  const { signer, sendMessage } = useApp();
  const [ckbAmount, setCkbAmount] = useState("");
  const [isExchanging, setIsExchanging] = useState(false);

  const parsePoints = (ckb: string): bigint => {
    if (!ckb || isNaN(Number(ckb))) return 0n;
    const ckbShannon = BigInt(Math.floor(Number(ckb) * 100000000));
    return calculatePointsFromCKB(ckbShannon);
  };

  const points = parsePoints(ckbAmount);
  const requiredCKB = calculateRequiredCKB(points);
  
  // Validation
  const minCKBRequired = Number(MIN_POINTS_FOR_CELL * CKB_PER_POINT) / 100000000; // 200 CKB
  const isValidAmount = ckbAmount && Number(ckbAmount) >= minCKBRequired;
  const actualPoints = points < MIN_POINTS_FOR_CELL ? MIN_POINTS_FOR_CELL : points;

  const handleExchange = async () => {
    if (!signer || points === 0n) return;

    try {
      setIsExchanging(true);
      console.log("Starting exchange process...");
      console.log("Points to exchange:", points.toString());
      console.log("Required CKB:", requiredCKB.toString());
      
      // Get user address and lock script using correct API
      const address = await signer.getInternalAddress();
      const addressObjs = await signer.getAddressObjs();
      const lockScript = addressObjs[0].script;
      console.log("User address:", address);
      console.log("Lock script:", lockScript);
      
      // Create PokePoint type script
      const pokePointTypeScript = createPokePointTypeScript({
        targetLockHash: lockScript.hash(),
        ckbPerPoint: CKB_PER_POINT,
      });
      console.log("PokePoint type script:", pokePointTypeScript);
      
      // Build transaction
      const tx = ccc.Transaction.from({
        inputs: [],
        outputs: [],
        outputsData: [],
        cellDeps: [],
        headerDeps: [],
        witnesses: [],
      });

      // Add PokePoint contract cell dependency
      addPokePointCellDeps(tx);

      // Collect enough CKB inputs - simplified approach
      const totalNeeded = requiredCKB + MIN_CELL_CAPACITY; // Points capacity + minimum for change
      console.log("Total CKB needed:", totalNeeded.toString());

      // Complete inputs automatically using CCC's built-in methods
      await tx.completeInputsByCapacity(signer);

      // Add PokePoint output
      tx.outputs.push(ccc.CellOutput.from({
        capacity: requiredCKB,
        lock: lockScript,
        type: ccc.Script.from(pokePointTypeScript),
      }));
      tx.outputsData.push(pointsToHex(points) as `0x${string}`);

      // Complete fee
      await tx.completeFeeBy(signer);
      console.log("Transaction prepared:", tx);

      // Sign and send transaction
      const txHash = await signer.sendTransaction(tx);
      console.log("Transaction hash:", txHash);
      
      sendMessage("info", "Exchange Successful", [
        `Exchanged ${ckbAmount} CKB for ${points} PokePoints`,
        `Transaction: ${txHash}`,
      ]);

      setCkbAmount("");
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Exchange error:", error);
      sendMessage("error", "Exchange Failed", [
        error instanceof Error ? error.message : String(error),
      ]);
    } finally {
      setIsExchanging(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Exchange CKB to PokePoints</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            CKB Amount (minimum {minCKBRequired} CKB)
          </label>
          <input
            type="number"
            value={ckbAmount}
            onChange={(e) => setCkbAmount(e.target.value)}
            placeholder={`Enter CKB amount (min: ${minCKBRequired})`}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              ckbAmount && !isValidAmount 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            step="10"
            min={minCKBRequired}
          />
          {ckbAmount && !isValidAmount && (
            <p className="text-red-500 text-sm mt-1">
              Minimum {minCKBRequired} CKB required (20 PokePoints minimum)
            </p>
          )}
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex justify-between text-sm">
            <span>Exchange Rate:</span>
            <span>10 CKB = 1 PokePoint</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>You will receive:</span>
            <span className="font-bold">{actualPoints.toString()} PokePoints</span>
          </div>
          {actualPoints > points && (
            <div className="flex justify-between text-xs mt-1 text-orange-600">
              <span>Actual minimum:</span>
              <span>{actualPoints.toString()} PokePoints (20 min)</span>
            </div>
          )}
          <div className="flex justify-between text-sm mt-1">
            <span>Required CKB:</span>
            <span className="text-blue-600">{(Number(requiredCKB) / 100000000).toFixed(1)} CKB</span>
          </div>
        </div>

        <button
          onClick={handleExchange}
          disabled={!signer || !isValidAmount || isExchanging}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isExchanging ? "Exchanging..." : "Exchange to PokePoints"}
        </button>

        {!signer && (
          <p className="text-sm text-gray-500 text-center">
            Connect your wallet to exchange CKB
          </p>
        )}
      </div>
    </div>
  );
}

