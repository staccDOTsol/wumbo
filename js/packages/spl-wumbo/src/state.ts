import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { deserializeUnchecked, Schema } from "borsh";
import { MintInfo, MintLayout, u64 } from "@solana/spl-token";

export class TokenRef {
  // @ts-ignore
  publicKey: PublicKey; // Gets set on retrieve
  wumboInstance: PublicKey;
  tokenBonding: PublicKey;
  owner?: PublicKey;
  name?: PublicKey;
  is_claimed: boolean;
  initialized: boolean;

  static LEN = 1 + 32 * 4 + 2 + 1 + 1;

  static schema: Schema = new Map([
    [
      TokenRef,
      {
        kind: "struct",
        fields: [
          ["key", 'u8'],
          ["wumboInstance", [32]],
          ["tokenBonding", [32]],
          ["ownerOrName", [32]],
          ["initialized", [1]],
        ],
      },
    ],
  ]);

  constructor(obj: {
    key: number;
    wumboInstance: Uint8Array;
    tokenBonding: Uint8Array;
    ownerOrName: Uint8Array;
    initialized: Uint8Array;
  }) {
    this.is_claimed = obj.key === 2
    this.wumboInstance = new PublicKey(obj.wumboInstance);
    this.tokenBonding = new PublicKey(obj.tokenBonding);
    this.owner = this.is_claimed ? new PublicKey(obj.ownerOrName) : undefined;
    this.name = this.is_claimed ?  undefined : new PublicKey(obj.ownerOrName);
    this.initialized = obj.initialized[0] === 1;
  }

  static fromAccount(
    key: PublicKey,
    account: AccountInfo<Buffer>
  ): TokenRef {
    const value = deserializeUnchecked(
      TokenRef.schema,
      TokenRef,
      account.data
    );
    value.publicKey = key;

    return value;
  }

  static async retrieve(
    connection: Connection,
    wumboCreator: PublicKey
  ): Promise<TokenRef | null> {
    let account = await connection.getAccountInfo(wumboCreator);

    if (!account) {
      return account;
    }

    return this.fromAccount(wumboCreator, account);
  }
}

export class Mint {
  static fromAccount(account: AccountInfo<Buffer>): MintInfo {
    if (!account) {
      return account;
    }

    const data = Buffer.from(account.data);
    const mintInfo = MintLayout.decode(data);
    if (mintInfo.mintAuthorityOption === 0) {
      mintInfo.mintAuthority = null;
    } else {
      mintInfo.mintAuthority = new PublicKey(mintInfo.mintAuthority);
    }

    mintInfo.supply = u64.fromBuffer(mintInfo.supply);

    return mintInfo;
  }

  static async retrieve(
    connection: Connection,
    key: PublicKey
  ): Promise<MintInfo | null> {
    const info = await connection.getAccountInfo(key);

    if (!info) {
      return info;
    }

    if (info.data.length != MintLayout.span) {
      throw new Error(`Invalid mint size`);
    }

    return this.fromAccount(info);
  }
}

export class WumboInstance {
  wumboMint: PublicKey;
  baseCurve: PublicKey;
  nameProgramId: PublicKey;
  initialized: boolean;

  static schema: Schema = new Map([
    [
      WumboInstance,
      {
        kind: "struct",
        fields: [
          ["key", [1]],
          ["wumboMint", [32]],
          ["baseCurve", [32]],
          ["nameProgramId", [32]],
          ["initialized", [1]],
        ],
      },
    ],
  ]);

  constructor(obj: {
    key: Uint8Array;
    wumboMint: Uint8Array;
    baseCurve: Uint8Array;
    nameProgramId: Uint8Array;
    initialized: Uint8Array;
  }) {
    this.wumboMint = new PublicKey(obj.wumboMint);
    this.baseCurve = new PublicKey(obj.baseCurve);
    this.nameProgramId = new PublicKey(obj.nameProgramId);
    this.initialized = obj.initialized[0] === 1;
  }

  static fromAccount(
    key: PublicKey,
    account: AccountInfo<Buffer>
  ): WumboInstance {
    const value = deserializeUnchecked(
      WumboInstance.schema,
      WumboInstance,
      account.data
    );
    value.publicKey = key;

    return value;
  }

  static async retrieve(
    connection: Connection,
    wumboInstance: PublicKey
  ): Promise<WumboInstance> {
    let account = await connection.getAccountInfo(wumboInstance);
    if (!account) {
      throw new Error(`Invalid account provided ${wumboInstance.toString()}`);
    }

    return this.fromAccount(wumboInstance, account);
  }

  static LEN = 1 + 32 * 4 + 2 + 1;
}
