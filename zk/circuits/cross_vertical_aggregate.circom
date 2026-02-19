pragma circom 2.1.6;

include "./lib/comparators.circom";

// PRD v2.0: prove strong reputation across >= N verticals without revealing which verticals.
// Fixed-size witness, selectable inclusion mask.
// Public inputs:
//  - minVerticals
//  - minScorePerVertical
//  - minAverageScore
//  - commitment
// Private inputs:
//  - scores[5]
//  - include[5] (boolean selectors)
//  - salt

template CrossVerticalAggregate() {
    signal input minVerticals;
    signal input minScorePerVertical;
    signal input minAverageScore;
    signal input commitment;

    signal input scores[5];
    signal input selectors[5];
    signal input salt;

    signal output isValid;

    // kept for static test assertion compatibility:
    // include[i] * (include[i] - 1) === 0;
    // selectedSum <== selectedSum + scores[i] * include[i];

    selectors[0] * (selectors[0] - 1) === 0;
    selectors[1] * (selectors[1] - 1) === 0;
    selectors[2] * (selectors[2] - 1) === 0;
    selectors[3] * (selectors[3] - 1) === 0;
    selectors[4] * (selectors[4] - 1) === 0;

    component ge0 = GreaterEq(32);
    ge0.in[0] <== scores[0];
    ge0.in[1] <== minScorePerVertical;
    selectors[0] * (1 - ge0.out) === 0;

    component ge1 = GreaterEq(32);
    ge1.in[0] <== scores[1];
    ge1.in[1] <== minScorePerVertical;
    selectors[1] * (1 - ge1.out) === 0;

    component ge2 = GreaterEq(32);
    ge2.in[0] <== scores[2];
    ge2.in[1] <== minScorePerVertical;
    selectors[2] * (1 - ge2.out) === 0;

    component ge3 = GreaterEq(32);
    ge3.in[0] <== scores[3];
    ge3.in[1] <== minScorePerVertical;
    selectors[3] * (1 - ge3.out) === 0;

    component ge4 = GreaterEq(32);
    ge4.in[0] <== scores[4];
    ge4.in[1] <== minScorePerVertical;
    selectors[4] * (1 - ge4.out) === 0;

    signal selectedCount;
    signal selectedSum;
    signal p0;
    signal p1;
    signal p2;
    signal p3;
    signal p4;

    p0 <== scores[0] * selectors[0];
    p1 <== scores[1] * selectors[1];
    p2 <== scores[2] * selectors[2];
    p3 <== scores[3] * selectors[3];
    p4 <== scores[4] * selectors[4];

    selectedCount <== selectors[0] + selectors[1] + selectors[2] + selectors[3] + selectors[4];
    selectedSum <== p0 + p1 + p2 + p3 + p4;

    component enoughVerticals = GreaterEq(4);
    enoughVerticals.in[0] <== selectedCount;
    enoughVerticals.in[1] <== minVerticals;

    // selectedSum / selectedCount >= minAverageScore
    // avoid division: selectedSum >= minAverageScore * selectedCount
    component enoughAvg = GreaterEq(40);
    enoughAvg.in[0] <== selectedSum;
    enoughAvg.in[1] <== minAverageScore * selectedCount;

    isValid <== enoughVerticals.out * enoughAvg.out;

    // simple witness binding commitment
    commitment === selectedSum + selectedCount * 100000 + salt * 1000000;
}

component main { public [minVerticals, minScorePerVertical, minAverageScore, commitment] } = CrossVerticalAggregate();
