pragma circom 2.1.6;

// ──────────────────────────────────────────────────────────────
// Minimal MiMC sponge for commitment binding (no external deps).
// Replaces invertible linear commitments with a non-invertible hash.
// Uses MiMC-p/p construction (Feistel) with x^3 round function in BN254.
// ──────────────────────────────────────────────────────────────

template MiMCFeistel(nRounds) {
    signal input xL_in;
    signal input xR_in;
    signal output xL_out;
    signal output xR_out;

    // Hardcoded round constants (derived from keccak256 of sequential indices)
    var c[20] = [
        0,
        7120861356467848435263064379192047478074060781135320967663101236819528304084,
        5024705281721889198577876841391132655519806253271513027649307379914550408543,
        18551411809012608885454604049760496832393961427903072891127642392506377103387,
        15255921313433251341520743036421118224601688618474949617616688779979753993633,
        9880463811798392099326997968498961977689340005498225351438437683394556303818,
        17935547571046755128740750857458175568255339260755250049035566444522917594844,
        2834789091757543066555209759254875879914508710820827487474615206032064524691,
        12728393700869984140891606915076105074939524656195578371737226495398413699570,
        7532377676760972377445061531795332022063578307853887680601873880746804052043,
        21282112630709430498552486713498242890410551819776841796141478496645429988898,
        8856054987922044830519680915178082294940955205566818498338626764780265364837,
        1005554894152825965140152550003442498717753720489818087688707473598977837885,
        14399839928289007620044906394363126375889674776844613936047724267880569108992,
        6950813825584886270750929282927893858684498969118238387024071534809435426561,
        12684811787838844987866432407058188877085978879696590401219242487942722210506,
        11619243637498413583102457652655372676400669564381560328766654432342913574027,
        17404736684455893792756927608829651155543969688721927516972973820297300587498,
        19718027044498942626761547634826896878179451929756903458130010300645258873182,
        2546579401474635830702532903274837793292088165165752556450047782817709894262
    ];

    // Feistel rounds: each round computes t = (xL + c[i])^3, then swap
    signal t[nRounds + 1][2];
    t[0][0] <== xL_in;
    t[0][1] <== xR_in;

    signal sq[nRounds];
    signal cu[nRounds];

    for (var i = 0; i < nRounds; i++) {
        var ci = c[i % 20];
        sq[i] <== (t[i][0] + ci) * (t[i][0] + ci);
        cu[i] <== sq[i] * (t[i][0] + ci);
        t[i + 1][0] <== t[i][1] + cu[i];
        t[i + 1][1] <== t[i][0];
    }

    xL_out <== t[nRounds][0];
    xR_out <== t[nRounds][1];
}

/// @dev Hash two field elements into one (Miyaguchi–Preneel mode)
template MiMCHash() {
    signal input in[2];
    signal output out;

    component feistel = MiMCFeistel(20);
    feistel.xL_in <== in[0];
    feistel.xR_in <== in[1];

    // Miyaguchi–Preneel: H = F(xL, xR) + xL + xR
    out <== feistel.xL_out + in[0] + in[1];
}

/// @dev Hash three field elements into one (sponge-style chaining)
template MiMCHash3() {
    signal input in[3];
    signal output out;

    component h1 = MiMCHash();
    h1.in[0] <== in[0];
    h1.in[1] <== in[1];

    component h2 = MiMCHash();
    h2.in[0] <== h1.out;
    h2.in[1] <== in[2];

    out <== h2.out;
}
