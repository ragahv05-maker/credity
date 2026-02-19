pragma circom 2.1.6;

include "./lib/comparators.circom";
include "./lib/mimc_hash.circom";

// PRD v2.0 HARDENED: prove age >= minimum without revealing DOB/Aadhaar.
// Public inputs:
//  - cutoffDate: YYYYMMDD already adjusted for minimum age (computed off-chain)
//  - commitment (MiMC hash — non-invertible)
// Private inputs:
//  - birthYear, birthMonth, birthDay
//  - salt
//
// Security fixes applied:
//  1. Commitment uses MiMC hash instead of invertible linear formula
//  2. isOverAge is constrained to === 1 (proof only valid when age check passes)
//  3. Per-month day-max validation (rejects Feb 30, Jun 31, etc.)

template AgeVerification() {
    signal input cutoffDate;
    signal input commitment;

    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;
    signal input salt;

    signal output isOverAge;

    // ── Month range: 1..12 ──
    component monthMin = GreaterEq(5);
    monthMin.in[0] <== birthMonth;
    monthMin.in[1] <== 1;
    monthMin.out === 1;

    component monthMax = LessEq(5);
    monthMax.in[0] <== birthMonth;
    monthMax.in[1] <== 12;
    monthMax.out === 1;

    // ── Day range: 1..31 (basic) ──
    component dayMin = GreaterEq(6);
    dayMin.in[0] <== birthDay;
    dayMin.in[1] <== 1;
    dayMin.out === 1;

    component dayMax = LessEq(6);
    dayMax.in[0] <== birthDay;
    dayMax.in[1] <== 31;
    dayMax.out === 1;

    // ── Enhanced date validation ──
    // Months with max 30 days: April(4), June(6), September(9), November(11)
    // For these months, day must be <= 30
    // February: day must be <= 29 (allows leap years; exact leap year check is
    //           impractical in arithmetic circuits but this catches Feb 30/31)

    // Check: if month is February (2), day <= 29
    signal isFeb;
    signal febDayOk;
    component isFebCheck = LessThan(5);
    isFebCheck.in[0] <== birthMonth;
    isFebCheck.in[1] <== 3;  // month < 3
    component isFebGe = GreaterEq(5);
    isFebGe.in[0] <== birthMonth;
    isFebGe.in[1] <== 2;  // month >= 2
    isFeb <== isFebCheck.out * isFebGe.out;  // 1 iff month == 2

    component febDayMax = LessEq(6);
    febDayMax.in[0] <== birthDay;
    febDayMax.in[1] <== 29;
    // If Feb, day must be <= 29: isFeb * (1 - febDayOk) === 0
    febDayOk <== febDayMax.out;
    isFeb * (1 - febDayOk) === 0;

    // Check: 30-day months (4, 6, 9, 11)
    // For months 4, 6, 9, 11: day <= 30
    // We check each individually:

    // Month 4 (April)
    signal isApr;
    component isAprLt = LessThan(5);
    isAprLt.in[0] <== birthMonth;
    isAprLt.in[1] <== 5;
    component isAprGe = GreaterEq(5);
    isAprGe.in[0] <== birthMonth;
    isAprGe.in[1] <== 4;
    isApr <== isAprLt.out * isAprGe.out;

    // Month 6 (June)
    signal isJun;
    component isJunLt = LessThan(5);
    isJunLt.in[0] <== birthMonth;
    isJunLt.in[1] <== 7;
    component isJunGe = GreaterEq(5);
    isJunGe.in[0] <== birthMonth;
    isJunGe.in[1] <== 6;
    isJun <== isJunLt.out * isJunGe.out;

    // Month 9 (September)
    signal isSep;
    component isSepLt = LessThan(5);
    isSepLt.in[0] <== birthMonth;
    isSepLt.in[1] <== 10;
    component isSepGe = GreaterEq(5);
    isSepGe.in[0] <== birthMonth;
    isSepGe.in[1] <== 9;
    isSep <== isSepLt.out * isSepGe.out;

    // Month 11 (November)
    signal isNov;
    component isNovLt = LessThan(5);
    isNovLt.in[0] <== birthMonth;
    isNovLt.in[1] <== 12;
    component isNovGe = GreaterEq(5);
    isNovGe.in[0] <== birthMonth;
    isNovGe.in[1] <== 11;
    isNov <== isNovLt.out * isNovGe.out;

    signal is30DayMonth;
    is30DayMonth <== isApr + isJun + isSep + isNov;

    component day30Max = LessEq(6);
    day30Max.in[0] <== birthDay;
    day30Max.in[1] <== 30;
    // If 30-day month, day must be <= 30
    // is30DayMonth is 0 or 1, so this constraint works:
    signal day30Ok;
    day30Ok <== day30Max.out;
    is30DayMonth * (1 - day30Ok) === 0;

    // ── YYYYMMDD encoding ──
    signal birthDate;
    birthDate <== birthYear * 10000 + birthMonth * 100 + birthDay;

    // birthDate <= cutoffDate  => age requirement satisfied
    component le = LessEq(32);
    le.in[0] <== birthDate;
    le.in[1] <== cutoffDate;

    isOverAge <== le.out;

    // ── HARDENED: force the proof to only be generatable when age check passes ──
    isOverAge === 1;

    // ── HARDENED: non-invertible commitment binding ──
    // commitment = MiMCHash(birthDate, salt)
    component hasher = MiMCHash();
    hasher.in[0] <== birthDate;
    hasher.in[1] <== salt;
    commitment === hasher.out;
}

component main { public [cutoffDate, commitment] } = AgeVerification();
