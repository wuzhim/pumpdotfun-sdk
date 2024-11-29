import dotenv from "dotenv";
import {PumpFunTransaction} from "../../src/IDL/kong-pumpfun-transaction"
import logger from "../../src/logger/winstonLogger"
import { Worker } from 'worker_threads';
import snaper from "./pumpSnaper";


dotenv.config();
const { Kafka } = require('kafkajs')
const broker = process.env.KAFAK_BROKER!;
const transactionTpoic = process.env.RESOLVED_TRANSACTIONS_TOPIC!;
const kafka = new Kafka({
    clientId: 'pumpfun-sniper',
    brokers: [broker],
    sasl: {
        mechanism: 'plain', // scram-sha-256 or scram-sha-512
        username: 'admin',
        password: 'Jueyi@1573...'
    }
});
interface User {
    name: string;
    age: number;
}

const admin = kafka.admin();

const resetOffsets = async () => {
  await admin.connect();
  
  // 将偏移量设置为最新
  const topic = transactionTpoic;
  const partitions = await admin.fetchTopicOffsets(topic);
  await Promise.all(
    partitions.map(partition => 
      admin.setOffsets({
        groupId: 'pumpfun-sniper',
        topic: topic,
        partitions: [
          { partition: Number(partition.partition), offset: partition.offset }
        ]
      })
    )
  );
  
  await admin.disconnect();
};

const consumer = kafka.consumer({ groupId: 'pumpfun-sniper' });
const run = async () => {
  await resetOffsets();
  await consumer.connect();
  logger.info(transactionTpoic)
  await consumer.subscribe({ topic: transactionTpoic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const parsedData:PumpFunTransaction = JSON.parse(message.value.toString()) as PumpFunTransaction
      snaper(parsedData)
    },
  });
};

export default run;

