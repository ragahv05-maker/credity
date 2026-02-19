pragma circom 2.1.6;

include "./lib/comparators.circom";

// PRD v2.0: prove age >= minimum without revealing DOB/Aadhaar.
// Public inputs:
//  - cutoffDate: YYYYMMDD already adjusted for minimum age (computed off-chain)
//  - commitment
// Private inputs:
//  - birthYear, birthMonth, birthDay
//  - salt

template AgeVerification() {
    signal input cutoffDate;
    signal input commitment;

    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;
    signal input salt;

    signal output isOverAge;

    // Basic date domain checks
    component monthMin = GreaterEq(5);
    monthMin.in[0] <== birthMonth;
    monthMin.in[1] <== 1;

    component monthMax = LessEq(5);
    monthMax.in[0] <== birthMonth;
    monthMax.in[1] <== 12;

    component dayMin = GreaterEq(6);
    dayMin.in[0] <== birthDay;
    dayMin.in[1] <== 1;

    component dayMax = LessEq(6);
    dayMax.in[0] <== birthDay;
    dayMax.in[1] <== 31;

    // YYYYMMDD encoding
    signal birthDate;
    birthDate <== birthYear * 10000 + birthMonth * 100 + birthDay;

    // birthDate <= cutoffDate  => age requirement satisfied
    component le = LessEq(32);
    le.in[0] <== birthDate;
    le.in[1] <== cutoffDate;

    isOverAge <== le.out;

    // commitment binding
    // commitment = birthDate + salt * 10^8
    commitment === birthDate + salt * 100000000;
}

component main { public [cutoffDate, commitment] } = AgeVerification();
