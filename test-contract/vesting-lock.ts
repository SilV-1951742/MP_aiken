import {
    Blockfrost,
    C,
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
        Deno.env.get("BLOCKFROST_API_KEY"),
    ),
    "Preview",
);

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./owner.sk"));

const validator = await readValidator();

// --- Supporting functions
async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[1];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

const beneficiaryPublicKeyHash =
    lucid.utils.getAddressDetails(await Deno.readTextFile("./beneficiary.addr"))
        .paymentCredential.hash;

const DatumSchema = Data.Object({
    lock_until: Data.Integer(), // this is POSIX time, you can check and set it here: https://www.unixtimestamp.com
    owner: Data.Bytes(), // we can pass owner's verification key hash as byte array but also as a string
    beneficiary: Data.Bytes(), // we can beneficiary's hash as byte array but also as a string
});

type Datum = Data.Static<typeof DatumSchema>;
const Datum = DatumSchema as unknown as Datum;

const datum = Data.to<Datum>(
    {
        lock_until: BigInt(new Date().getTime()) + 500n, // Wed Jan 04 2023 14:52:41 GMT+0000
        owner: ownerPublicKeyHash, // our own wallet verification key hash
        beneficiary: beneficiaryPublicKeyHash,
    },
    Datum
);

const txLock = await lock(1000000, { into: validator, datum: datum });

await lucid.awaitTx(txLock);

console.log(`1 ADA locked into the contract
      Tx ID: ${txLock}
      Datum: ${datum}
  `);

// --- Supporting functions

async function lock(lovelace, { into, datum }): Promise<TxHash> {
    const contractAddress = lucid.utils.validatorToAddress(into);

    const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datum }, { lovelace })
        .complete();

    const signedTx = await tx.sign().complete();

    return signedTx.submit();
}