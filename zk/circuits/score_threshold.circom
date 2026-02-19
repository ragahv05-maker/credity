pragma circom 2.1.6;

include "./lib/comparators.circom";
include "./lib/mimc_hash.circom";

// PRD v2.0 HARDENED: prove score > threshold without revealing score.
// Public inputs:
//  - threshold
//  - commitment (MiMC hash binding — non-invertible)
// Private inputs:
//  - score
//  - salt
//
// Security fixes applied:
//  1. Commitment uses MiMC hash instead of invertible linear formula
//  2. isValid is constrained to === 1 (proof only valid when score > threshold)

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

    // ── HARDENED: force the proof to only be generatable when condition holds ──
    isValid === 1;

    // ── HARDENED: non-invertible commitment binding ──
    // commitment = MiMCHash(score, salt)
    // An observer cannot reverse this to recover score or salt.
    component hasher = MiMCHash();
    hasher.in[0] <== score;
    hasher.in[1] <== salt;
    commitment === hasher.out;
}

component main { public [threshold, commitment] } = ScoreThreshold(32);
