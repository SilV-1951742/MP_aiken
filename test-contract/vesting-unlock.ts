import {
    Blockfrost,
    C,
    Data,
    Constr,
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

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./beneficiary.sk"));

const validator = await readValidator();

// --- Supporting functions

async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[1];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

const scriptAddress = lucid.utils.validatorToAddress(validator);

// we get all the UTXOs sitting at the script address
const scriptUtxos = await lucid.utxosAt(scriptAddress);

const DatumSchema = Data.Object({
    lock_until: Data.Integer(), // this is POSIX time, you can check and set it here: https://www.unixtimestamp.com
    owner: Data.Bytes(), // we can pass owner's verification key hash as byte array but also as a string
    beneficiary: Data.Bytes(), // we can beneficiary's hash as byte array but also as a string
});

type Datum = Data.Static<typeof DatumSchema>;
const Datum = DatumSchema as unknown as Datum;

type Datum = Data.Static<typeof Datum>;

const currentTime = BigInt(new Date().getTime());
const beneficiaryPublicKeyHash =
    lucid.utils.getAddressDetails(await Deno.readTextFile("./beneficiary.addr"))
        .paymentCredential.hash;

// we filter out all the UTXOs by beneficiary and lock_until
const utxos = scriptUtxos.filter((utxo) => {
    let datum = Data.from<Datum>(
        utxo.datum,
        Datum,
    );

    console.log(datum.lock_until)
    console.log(currentTime)

    return datum.beneficiary === beneficiaryPublicKeyHash &&
        datum.lock_until <= currentTime;
});

if (utxos.length === 0) {
    console.log("No redeemable utxo found. You need to wait a little longer...");
    throw new Error();
}

// we don't have any redeemer in our contract but it needs to be empty
const redeemer = Data.empty;

const txUnlock = await unlock(utxos, Number(currentTime), { from: validator, using: redeemer });

await lucid.awaitTx(txUnlock);

console.log(`1 ADA recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);

// --- Supporting functions

async function unlock(utxos, currentTime, { from, redeemer }): Promise<TxHash> {
    const laterTime = new Date(currentTime + 2 * 60 * 60 * 1000); // add two hours (TTL: time to live)

    const tx = await lucid
        .newTx()
        .collectFrom(utxos, redeemer)
        .addSigner(await lucid.wallet.address()) // this should be beneficiary address
        .validFrom(currentTime)
        .validTo(laterTime)
        .attachSpendingValidator(from)
        .complete();

    const signedTx = await tx
        .sign()
        .complete();

    return signedTx.submit();
}