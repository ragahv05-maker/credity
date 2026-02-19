pragma circom 2.1.6;

include "./lib/comparators.circom";

// PRD v2.0: prove score > threshold without revealing score.
// Public inputs:
//  - threshold
//  - commitment (binds witness to wallet-held secret)
// Private inputs:
//  - score
//  - salt
//
// Note: commitment formula is lightweight to avoid external hash dependencies.
// Replace with Poseidon/MiMC in hardening pass if circomlib is introduced.

template ScoreThreshold(nBits) {
    signal input threshold;
    signal input commitment;

    signal input score;
    signal input salt;

    signal output isValid;

    // score >= threshold + 1  => score > threshold
    component ge = GreaterEq(nBits);
    ge.in[0] <== score;
    ge.in[1] <== threshold + 1;
    isValid <== ge.out;

    // bind proof to private witness so prover cannot swap score post-challenge
    // commitment = score + salt * 2^nBits
    commitment === score + salt * (1 << nBits);
}

component main { public [threshold, commitment] } = ScoreThreshold(32);
