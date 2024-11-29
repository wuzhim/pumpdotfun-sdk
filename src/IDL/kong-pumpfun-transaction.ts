export class PumpFunTransaction {
    signature: string;
    processTime: number | null; // Use null for possible uninitialized values
    fee: number | null;
    tokenMint: string;
    userCa: string;
    transactionType: PumpFunTransactionType;
    solAmount: number | null;
    tokenAmount: number | null;
    userRemainSolAmount: number | null;
    userRemainTokenAmount: number | null;
    bondCurveSolAmount: number | null;
    bondCurveTokenAmount: number | null;
    tokenPrice: number | null;
    blockTimestamp: number | null;
    blockHash: string;
    parentSlot: number | null;
  
    constructor(data: Partial<PumpFunTransaction>) {
      this.signature = data.signature ?? '';
      this.processTime = data.processTime ?? null;
      this.fee = data.fee ?? null;
      this.tokenMint = data.tokenMint ?? '';
      this.userCa = data.userCa ?? '';
      this.transactionType = data.transactionType ?? PumpFunTransactionType.BUY; // Default type
      this.solAmount = data.solAmount ?? null;
      this.tokenAmount = data.tokenAmount ?? null;
      this.userRemainSolAmount = data.userRemainSolAmount ?? null;
      this.userRemainTokenAmount = data.userRemainTokenAmount ?? null;
      this.bondCurveSolAmount = data.bondCurveSolAmount ?? null;
      this.bondCurveTokenAmount = data.bondCurveTokenAmount ?? null;
      this.tokenPrice = data.tokenPrice ?? null;
      this.blockTimestamp = data.blockTimestamp ?? null;
      this.blockHash = data.blockHash ?? '';
      this.parentSlot = data.parentSlot ?? null;
    }
  }
  
  export enum PumpFunTransactionType {
    BUY = "BUY",
    SELL = "SELL",
    MINT = "MINT",
    RAYDIUM_MIGRATION = "RAYDIUM_MIGRATION",
  }