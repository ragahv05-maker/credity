import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function mustContain(file, snippets) {
  const content = readFileSync(file, "utf8");
  for (const s of snippets) {
    assert.ok(
      content.includes(s),
      `${path.basename(file)} missing snippet: ${s}`,
    );
  }
}

test("required circuits exist", () => {
  const files = [
    "circuits/score_threshold.circom",
    "circuits/age_verification.circom",
    "circuits/cross_vertical_aggregate.circom",
    "circuits/lib/comparators.circom",
  ];
  for (const f of files) {
    assert.equal(existsSync(path.join(root, f)), true, `${f} must exist`);
  }
});

test("score_threshold enforces strict threshold and witness binding", () => {
  mustContain(path.join(root, "circuits/score_threshold.circom"), [
    "ge.in[1] <== threshold + 1;",
    "commitment === score + salt * (1 << nBits);",
  ]);
});

test("age_verification enforces dob bounds and cutoff comparison", () => {
  mustContain(path.join(root, "circuits/age_verification.circom"), [
    "monthMin.in[1] <== 1;",
    "monthMax.in[1] <== 12;",
    "dayMax.in[1] <== 31;",
    "le.in[0] <== birthDate;",
    "le.in[1] <== cutoffDate;",
  ]);
});

test("cross_vertical_aggregate enforces boolean include + avg condition", () => {
  mustContain(path.join(root, "circuits/cross_vertical_aggregate.circom"), [
    "include[i] * (include[i] - 1) === 0;",
    "selectedSum <== selectedSum + scores[i] * include[i];",
    "enoughVerticals.in[0] <== selectedCount;",
    "enoughAvg.in[1] <== minAverageScore * selectedCount;",
  ]);
});
