from pycardano import PaymentKeyPair, StakeKeyPair, Address, Network

key_dir = "keys/"
payment_key_pair: PaymentKeyPair = PaymentKeyPair.generate()
payment_priv_key = payment_key_pair.signing_key
payment_pub_key = payment_key_pair.verification_key

payment_priv_key.save(key_dir + "key1.priv")
payment_pub_key.save(key_dir + "key1.pub")


stake_key_pair = StakeKeyPair.generate()
stake_priv_key = stake_key_pair.signing_key
stake_pub_key = stake_key_pair.verification_key

stake_priv_key.save(key_dir + "key1.spriv")
stake_pub_key.save(key_dir + "key1.spub")

base_address = Address(payment_part=payment_pub_key.hash(),
                       staking_part=stake_pub_key.hash(),
                       network=Network.TESTNET)

with open(key_dir + "key1.addr", "w") as f:
    f.write(base_address.encode())
