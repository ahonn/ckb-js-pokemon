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
  onClose?: () => void;
}

export function PokePointExchange({ onSuccess, onClose }: PokePointExchangeProps) {
  const { wallet, sendMessage } = useApp();
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
    if (!wallet.signer || points === 0n) return;

    try {
      setIsExchanging(true);
      console.log("Starting exchange process...");
      console.log("Points to exchange:", points.toString());
      console.log("Required CKB:", requiredCKB.toString());
      
      // Get user address and lock script using correct API
      const address = await wallet.signer.getInternalAddress();
      const addressObjs = await wallet.signer.getAddressObjs();
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
      await tx.completeInputsByCapacity(wallet.signer);

      // Add PokePoint output
      tx.outputs.push(ccc.CellOutput.from({
        capacity: requiredCKB,
        lock: lockScript,
        type: ccc.Script.from(pokePointTypeScript),
      }));
      tx.outputsData.push(pointsToHex(points) as `0x${string}`);

      // Complete fee
      await tx.completeFeeBy(wallet.signer);
      console.log("Transaction prepared:", tx);

      // Sign and send transaction
      const txHash = await wallet.signer.sendTransaction(tx);
      console.log("Transaction hash:", txHash);
      
      sendMessage("info", "Transaction Submitted", [
        `Exchange transaction submitted: ${ckbAmount} CKB → ${points} PokePoints`,
        `Transaction: ${txHash}`,
        `Balance will update after confirmation (~15-30 seconds)`
      ]);

      setCkbAmount("");
      
      // Close modal immediately
      if (onClose) {
        onClose();
      }
      
      // Refresh balance after a delay to allow for transaction confirmation
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 30000); // Wait 30 seconds for transaction confirmation
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
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            CKB Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={ckbAmount}
              onChange={(e) => setCkbAmount(e.target.value)}
              placeholder={`Minimum: ${minCKBRequired} CKB`}
              className={`w-full px-4 py-3 bg-white/50 backdrop-blur-sm border rounded-2xl focus:outline-none focus:ring-2 transition-all ${
                ckbAmount && !isValidAmount 
                  ? 'border-red-300/50 focus:ring-red-400/50 bg-red-50/30' 
                  : 'border-gray-200/50 focus:ring-yellow-400/50 hover:border-gray-300/50'
              }`}
              step="10"
              min={minCKBRequired}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">
              CKB
            </div>
          </div>
          {ckbAmount && !isValidAmount && (
            <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Minimum {minCKBRequired} CKB required
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-yellow-50/50 to-orange-50/50 backdrop-blur-sm p-4 rounded-2xl border border-yellow-200/30">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Exchange Rate</span>
              <span className="text-sm font-medium bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                10 CKB = 1 PP
              </span>
            </div>
            
            <div className="border-t border-yellow-200/30 pt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">You will receive</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-800">{actualPoints.toString()}</span>
                  <span className="text-sm font-medium text-gray-600">PP</span>
                </div>
              </div>
              
              {actualPoints > points && (
                <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-200/40 px-3 py-2 rounded-xl">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="text-amber-700 font-medium">
                    Minimum exchange: <span className="font-bold text-amber-800">{actualPoints.toString()} PokePoints</span>
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Total required</span>
                <span className="font-medium">{(Number(requiredCKB) / 100000000).toFixed(1)} CKB</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleExchange}
          disabled={!wallet.signer || !isValidAmount || isExchanging}
          className={`w-full px-6 py-3.5 rounded-2xl font-semibold transition-all duration-200 transform ${
            !wallet.signer || !isValidAmount || isExchanging
              ? 'bg-gray-200/50 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 hover:from-yellow-500 hover:to-yellow-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isExchanging ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exchanging...
            </span>
          ) : (
            "Exchange to PokePoints"
          )}
        </button>

        {!wallet.signer && (
          <p className="text-xs text-gray-500 text-center bg-gray-50/30 backdrop-blur-sm px-4 py-2 rounded-xl">
            Connect your wallet to exchange CKB
          </p>
        )}
      </div>
    </div>
  );
}

