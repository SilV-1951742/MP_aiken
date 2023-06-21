import {
    Blockfrost,
    C,
    Constr,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    utf8ToHex,
  } from "https://deno.land/x/lucid@0.10.4/mod.ts";
  import * as cbor from "https://deno.land/x/cbor@v1.5.2/index.js";
  
  const lucid = await Lucid.new(
    new Blockfrost(
      "https://cardano-preview.blockfrost.io/api/v0",
      Deno.env.get("BLOCKFROST_API_KEY")
    ),
    "Preview"
  );

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./key.sk"));

const validator = await readValidator();

// --- Supporting functions

async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

const publicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
  ).paymentCredential?.hash;
  
  const datum = Data.to(new Constr(0, [publicKeyHash]));
  
  const txHash = await lock(1000000n, { into: validator, owner: datum });
  
  await lucid.awaitTx(txHash);
  
  console.log(`1 tADA locked into the contract at:
      Tx ID: ${txHash}
      Datum: ${datum}
  `);
  
  // --- Supporting functions
  
  async function lock(
    lovelace: bigint,
    { into, owner }: { into: SpendingValidator; owner: string }
  ): Promise<TxHash> {
    const contractAddress = lucid.utils.validatorToAddress(into);
  
    const tx = await lucid
      .newTx()
      .payToContract(contractAddress, { inline: owner }, { lovelace })
      .complete();
  
    const signedTx = await tx.sign().complete();
  
    return signedTx.submit();
  }