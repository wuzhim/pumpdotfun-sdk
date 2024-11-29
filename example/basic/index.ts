import dotenv from "dotenv";
import fs from "fs";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { DEFAULT_DECIMALS, PumpFunSDK } from "../../src";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance,
} from "../util";
import run from "./transactionComsumer"
import { Logger } from "winston";
import logger from "../../src/logger/winstonLogger";

const KEYS_FOLDER = __dirname + "/.keys";
const SLIPPAGE_BASIS_POINTS = 100n;

const main = async () => {
  dotenv.config();

  if (!process.env.RPC_ENDPOINT) {
    console.error("Please set HELIUS_RPC_URL in .env file");
    console.error(
      "Example: RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=<your api key>"
    );
    console.error("Get one at: https://www.helius.dev");
    return;
  }

  let connection = new Connection(process.env.RPC_ENDPOINT || "");

  let wallet = new NodeWallet(new Keypair()); //note this is not used
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const testAccount = getOrCreateKeypair(KEYS_FOLDER, "test-account");

  await printSOLBalance(
    connection,
    testAccount.publicKey,
    "Test Account keypair"
  );

  let sdk = new PumpFunSDK(provider);

  let globalAccount = await sdk.getGlobalAccount();
  console.log(globalAccount);
  const mint = new PublicKey("3doZL2XKzzLGdkjEQ9AenbNLTdNznh6b1EgZLqqrpump")

  let currentSolBalance = await connection.getBalance(testAccount.publicKey);
  if (currentSolBalance == 0) {
    console.log(
      "Please send some SOL to the test-account:",
      testAccount.publicKey.toBase58()
    );
    return;
  }

  console.log(await sdk.getGlobalAccount());

  //Check if mint already exists
  let boundingCurveAccount = await sdk.getBondingCurveAccount(mint);

  let buyResults = await sdk.buy(
    testAccount,
    mint,
    BigInt(0.0001 * LAMPORTS_PER_SOL),
    SLIPPAGE_BASIS_POINTS,
    {
      unitLimit: 250000,
      unitPrice: 250000,
    },
  );

  if (buyResults.success) {
    printSPLBalance(connection, mint, testAccount.publicKey);
    console.log("Bonding curve after buy", await sdk.getBondingCurveAccount(mint));
  } else {
    console.log("Buy failed");
  }

  //sell all tokens
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
      BigInt(currentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)),
      SLIPPAGE_BASIS_POINTS,
      {
        unitLimit: 250000,
        unitPrice: 250000,
      },
    );
    if (sellResults.success) {
      await printSOLBalance(
        connection,
        testAccount.publicKey,
        "Test Account keypair"
      );

      printSPLBalance(connection, mint, testAccount.publicKey, "After SPL sell all");
      console.log("Bonding curve after sell", await sdk.getBondingCurveAccount(mint));
    } else {
      console.log("Sell failed");
    }
  }
};

const { Kafka } = require('kafkajs')
const broker = process.env.KAFAK_BROKER!

const kafka = new Kafka({
  clientId: 'pumpfun-sniper',
  brokers: [broker]
})

const consume_kafka = async () => {
  run().catch(console.error)
}

consume_kafka();
// main();
