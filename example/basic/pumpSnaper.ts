import { PumpFunTransaction } from "../../src/IDL/kong-pumpfun-transaction";
import logger from "../../src/logger/winstonLogger";
const { setTimeout } = require('timers/promises');
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
    getOrCreateKeypair,
    getSPLBalance,
    printSOLBalance,
    printSPLBalance,
  } from "../util";
import { DEFAULT_DECIMALS, PumpFunSDK } from "../../src";
import dotenv from "dotenv";
import { DEFAULT_COMMITMENT } from "pumpdotfun-sdk";
import { log } from "console";
import {
    CompleteEvent,
    CreateEvent,
    CreateTokenMetadata,
    PriorityFee,
    PumpFunEventHandlers,
    PumpFunEventType,
    SetParamsEvent,
    TradeEvent,
    TransactionResult,
  } from "../../src/types";
import { json } from "stream/consumers";
dotenv.config();

const max_snaper = 1;
const sell_max_retry = 3;
var current_snaper = 0;
const SLIPPAGE_BASIS_POINTS = 5000n;
const max_dev_Buy = 5;

const connection = new Connection(process.env.RPC_ENDPOINT || "");
const KEYS_FOLDER = __dirname + "/.keys";

const wallet = new NodeWallet(new Keypair()); //note this is not used
const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

const testAccount = getOrCreateKeypair(KEYS_FOLDER, "test-account");
console.log(testAccount.publicKey)
let sdk = new PumpFunSDK(provider);

const snaper = async (pumpfunMint: PumpFunTransaction) => {
    if (current_snaper >= max_snaper) {
        logger.debug('skip mint %s, for current snaper %d more than max %d', pumpfunMint.tokenMint , current_snaper, max_snaper);
    } else if (pumpfunMint.solAmount! > max_dev_Buy)  {
        logger.info('skip mint %s, for dev buy %d sol more than max %d sol', pumpfunMint.tokenMint, pumpfunMint.solAmount, max_dev_Buy);
    }  else {
        current_snaper = current_snaper + 1;
        logger.info('start snaper mint %s, current snaper %d', pumpfunMint.tokenMint, current_snaper);
        try {
            const buyResults = await snaperBuy(pumpfunMint)
            if (buyResults.success) {
                await setTimeout(60000)
                const tokenAccount = buyResults.results?.transaction.message.staticAccountKeys[1];
                reocdeBuy(buyResults)
                snaperSell(pumpfunMint, tokenAccount ? tokenAccount.toString() : '', sell_max_retry)
                // console.log(JSON.stringify(buyResults.results))
                logger.info('snaper mint %s finished, current snaper %s', pumpfunMint.tokenMint, current_snaper);  
            } else {
                logger.error('snaper buy failed %s', buyResults.results)
            }
        } catch (e) {
            console.error(e)
        }
        current_snaper = current_snaper - 1;
    }
}

function reocdeBuy(buyResults: TransactionResult) {
    const meta = buyResults.results?.meta;
    let pumpfunFee = 0;
    let buySolAmount = 0;
    if (meta && meta.postBalances && meta.preBalances) {
        pumpfunFee = meta.postBalances[2] - meta.preBalances[2];
        buySolAmount = meta.postBalances[3] - meta.preBalances[3];
    }
    let buyTokenAmount = 0;
    if (meta && meta.postTokenBalances && meta.preTokenBalances) {
        buyTokenAmount = meta.postTokenBalances[0].uiTokenAmount.uiAmount ?? 0
    }
    logger.info('snaper buy successed, transaction fee cost %d, pumpfun fee cost %d, buy sol amount %d, buy token amount %d, buy price %d', 
        meta?.fee, pumpfunFee, buySolAmount, buyTokenAmount, buyTokenAmount / buySolAmount)
}

const snaperBuy = async (pumpfunMint: PumpFunTransaction): Promise<TransactionResult> => {
    const mint = new PublicKey(pumpfunMint.tokenMint)
    return await sdk.buy(
        testAccount,
        mint,
        BigInt(0.01 * LAMPORTS_PER_SOL),
        SLIPPAGE_BASIS_POINTS,
        {
            unitLimit: 250000,
            unitPrice: 250000,
        },
        'confirmed',
        'confirmed'
        );
}

const snaperSell = async(pumpfunMint: PumpFunTransaction, tokenAccount: String, retry: number) => {

    const mint = new PublicKey(pumpfunMint.tokenMint)
    try {
        let currentSPLBalance = await getSPLBalance(
            connection,
            mint,
            testAccount.publicKey
        );
        console.log("currentSPLBalance", currentSPLBalance);
        if (currentSPLBalance) {
            let sellResults = await sdk.sell(
            testAccount,
            mint,
            BigInt(Math.round(currentSPLBalance * Math.pow(10, DEFAULT_DECIMALS))),
            SLIPPAGE_BASIS_POINTS,
            {
                unitLimit: 250000,
                unitPrice: 250000,
            },
            'confirmed',
            'confirmed',
            tokenAccount
            );
            if (sellResults.success) {
              await printSOLBalance(
                connection,
                testAccount.publicKey,
                "Test Account keypair"
              );
            } else {
              console.log(sellResults.results)
              console.log("Sell failed");
              snaperSell(pumpfunMint, tokenAccount, retry - 1)
            }
        }
    } catch (e) {
        console.log(e)
        if (retry > 0) {
          console.log('retry sell for %s remain retry time %s', pumpfunMint.tokenMint, retry)
          snaperSell(pumpfunMint, tokenAccount, retry - 1)
        }
    }
}

export default snaper