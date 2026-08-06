"use client";
import { useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { directSimulateContract } from "@/lib/client/directClient";
import { buildContractCall, submitContract } from "@/lib/client/apiClient";
import { signTx } from "@/lib/wallets/walletKit";
import { showToast } from "./Toast";
interface SorobanDemoProps { contractId: string; }
export default function SorobanDemo({ contractId }: SorobanDemoProps) { return <div>{contractId}</div>; }
