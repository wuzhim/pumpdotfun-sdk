import {rpcConnection,mainAccount} from "../../src/env";
import {ComputeBudgetProgram, TransactionMessage, VersionedTransaction, PublicKey, Keypair} from "@solana/web3.js";
import {createCloseAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import bs58 from "bs58";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { PumpFunSDK } from "../../src/pumpfun";
import { getOrCreateKeypair } from "../util";

const blacklist = [
    "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
];
const SLIPPAGE_BASIS_POINTS = 5000n;
let wallet = new NodeWallet(new Keypair()); //note this is not used
const provider = new AnchorProvider(rpcConnection, wallet, {
  commitment: "confirmed",
});

let sdk = new PumpFunSDK(provider);

(async function close_atas() {
    const atas = await rpcConnection.getParsedTokenAccountsByOwner(mainAccount.publicKey, {
        programId: TOKEN_PROGRAM_ID
    });
    var inst = [
        ComputeBudgetProgram.setComputeUnitPrice({microLamports: 1000}),
        ComputeBudgetProgram.setComputeUnitLimit({units: 45000})
    ];

    const block = await rpcConnection.getLatestBlockhash({commitment: "processed"});
    var clouseCount = 0
    for(const ata of atas.value.slice(0, 15)) {
        const data = (<TokenAccountData> ata.account.data.parsed).info;
        if(blacklist.includes(data.mint)) continue;
        if(data.tokenAmount.amount != "0") {
            if (data.tokenAmount.uiAmount < 1) {
                console.log("burn %s %d", data.mint, data.tokenAmount.uiAmount)
                inst.push(
                    createBurnInstruction(
                        ata.pubkey,
                        new PublicKey(data.mint),
                        mainAccount.publicKey,
                        BigInt(data.tokenAmount.amount)
                    )
                )
            } else{
                console.log("sell %d %s", data.tokenAmount.uiAmount, data.mint);
                const sellRes = await sdk.sell(
                    mainAccount,
                    new PublicKey(data.mint),
                    BigInt(data.tokenAmount.amount),
                    SLIPPAGE_BASIS_POINTS,
                    {
                        unitLimit: 250000,
                        unitPrice: 250000,
                    },
                    'confirmed',
                    'confirmed',
                    ata.pubkey.toString()
                    )
                // console.log(sellRes)
                continue;
            }
        }
        console.log("mint:", data.mint)
        clouseCount++
        inst.push(
            createCloseAccountInstruction(
              ata.pubkey,
              mainAccount.publicKey,
              mainAccount.publicKey
            )
        );
    }
    if (clouseCount == 0) {
        console.log("close count is 0")
        return
    }
    const txn = new VersionedTransaction(new TransactionMessage({
        instructions: inst,
        payerKey: mainAccount.publicKey,
        recentBlockhash: block.blockhash
    }).compileToV0Message());
    txn.sign([mainAccount]);
    let sig = bs58.encode(txn.signatures[0]);

    await rpcConnection.sendTransaction(txn, {
        preflightCommitment: "processed",
        skipPreflight: false,
        maxRetries: 10
    });

    let res = await rpcConnection.confirmTransaction({
        ...block,
        signature: sig
    }, "processed");
    if(!res.value.err)
        console.log("14 token accounts successfully closed");
})();

interface TokenAccountData {
    info: {
        isNative: boolean,
        mint: string,
        owner: string,
        state: string,
        tokenAmount: {
            amount: string,
            decimals: number,
            uiAmount: number,
            uiAmountString: string
        }
    }
}