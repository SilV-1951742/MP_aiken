use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{VerificationKey}
use aiken/list.{and, or}
use aiken/transaction.{Transaction, ScriptContext, Spend, ValidityRange}
use aiken/interval.{Finite, Interval, IntervalBound, PositiveInfinity}

// --- --- INTERFACE --- ---

type Datum {
  /// POSIX time in second, e.g. 1672843961000
  lock_until: POSIXTime,
  /// Owner's credentials
  owner: VerificationKeyHash,
  /// Beneficiary's credentials
  beneficiary: VerificationKeyHash,
}
 
type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>
 
type POSIXTime =
  Int

// --- --- VALIDATOR -- --- ---

validator {
  fn vesting(datum: Datum, _redeemer: Void, ctx: ScriptContext) {
    // In principle, scripts can be used for different purpose (e.g. minting
    // assets). Here we make sure it's only used when 'spending' from a eUTxO
    when ctx.purpose is {
      Spend(_) ->
        or([
          must_be_signed_by(ctx.transaction, datum.owner),
          and([
            must_be_signed_by(ctx.transaction, datum.beneficiary),
            must_start_after(ctx.transaction.validity_range, datum.lock_until),
          ])
        ])
      _ ->
      False
    }
  }
}
 
fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash) {
  list.has(transaction.extra_signatories, vk)
}
 
fn must_start_after(range: ValidityRange, lower_bound: POSIXTime) {
  when range.lower_bound.bound_type is {
    Finite(now) -> now >= lower_bound
    _ -> False
  }
}

// --- --- TESTS --- ---

test must_start_after_succeed_when_lower_bound_is_after() {
  let range: ValidityRange =
    Interval {
      lower_bound: IntervalBound { bound_type: Finite(2), is_inclusive: True },
      upper_bound: IntervalBound { bound_type: PositiveInfinity, is_inclusive: False },
    }
 
  must_start_after(range, 1)
}
 
test must_start_after_succeed_when_lower_bound_is_equal() {
  let range: ValidityRange =
    Interval {
      lower_bound: IntervalBound { bound_type: Finite(2), is_inclusive: True },
      upper_bound: IntervalBound { bound_type: PositiveInfinity, is_inclusive: False },
    }
 
  must_start_after(range, 2)
}
 
test must_start_after_fail_when_lower_bound_is_after() {
  let range: ValidityRange =
    Interval {
      lower_bound: IntervalBound { bound_type: Finite(2), is_inclusive: True },
      upper_bound: IntervalBound { bound_type: PositiveInfinity, is_inclusive: False },
    }
 
  !must_start_after(range, 3)
}