import dotenv from "dotenv";
import {
    getOrCreateKeypair
} from "./util";
const { Connection, PublicKey } = require('@solana/web3.js');


dotenv.config();

export const rpcConnection = new Connection(process.env.RPC_ENDPOINT!);

const KEYS_FOLDER = __dirname + "/../example/basic/.keys";
console.log(KEYS_FOLDER)
export const mainAccount = getOrCreateKeypair(KEYS_FOLDER, "test-account");
console.log(mainAccount.publicKey)
