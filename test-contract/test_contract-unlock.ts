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
    fromText,
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
    const validator = JSON.parse(await Deno.readTextFile("plutus.json"))
      .validators[0];
    return {
      type: "PlutusV2",
      script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
  }

const utxo: OutRef = { txHash: Deno.args[0], outputIndex: 0 };

const redeemer = Data.to(new Constr(0, [fromText("Hello, World!")]));
 
const txHash = await unlock(utxo, {
  from: validator,
  using: redeemer,
});
 
await lucid.awaitTx(txHash);
 
console.log(`1 tADA unlocked from the contract
    Tx ID:    ${txHash}
    Redeemer: ${redeemer}
`);
 
// --- Supporting functions
 
async function unlock(
  ref: OutRef,
  { from, using }: { from: SpendingValidator; using: Redeemer }
): Promise<TxHash> {
  const [utxo] = await lucid.utxosByOutRef([ref]);
 
  const tx = await lucid
    .newTx()
    .collectFrom([utxo], using)
    .addSigner(await lucid.wallet.address())
    .attachSpendingValidator(from)
    .complete();
 
  const signedTx = await tx
    .sign()
    .complete();
 
  return signedTx.submit();
}