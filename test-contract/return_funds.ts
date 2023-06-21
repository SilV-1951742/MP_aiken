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

try {
    const tx = await lucid.newTx()
        .payToAddress("addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3", {lovelace: 9999000000n})
        .complete();
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(txHash);
} catch(e) {
    console.log(e)
}