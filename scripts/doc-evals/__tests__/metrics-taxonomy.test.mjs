import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { classifyComment, classifyFindings, tallyTaxonomy, isBotLogin, TAXONOMY_TYPES } from "../metrics/taxonomy.mjs";

describe("isBotLogin", () => {
  test("skips the two named CI bots even without a [bot] suffix", () => {
    assert.equal(isBotLogin("mintlify[bot]"), true);
    assert.equal(isBotLogin("cb-heimdall"), true);
  });

  test("skips any other GitHub App identity by suffix", () => {
    assert.equal(isBotLogin("dependabot[bot]"), true);
  });

  test("does not flag a human reviewer", () => {
    assert.equal(isBotLogin("soheimam"), false);
    assert.equal(isBotLogin("rayyan224"), false);
  });

  test("handles missing logins", () => {
    assert.equal(isBotLogin(null), false);
    assert.equal(isBotLogin(undefined), false);
  });
});

describe("classifyComment", () => {
  // These mirror the real review comments recorded in PLAN.md's failure
  // table and the live PRs this taxonomy was built from (#1928, #1939,
  // #1968, #1919).
  const cases = [
    ["would drop this - don't need to update an old changelog", "scope"],
    ["why these changes ?", "scope"],
    ["I don't think this needs to be here ?", "scope"],
    ["Question why not just follow what we written in the base-std documentation ?", "paraphrase"],
    ["The agent might have updated this instead of copying verbatim we can add logic to stop that", "paraphrase"],
    ["enum selectors hashed wrong, invented constants, effectiveAt() does not reset at maturity", "fact"],
    ["13 source file removed banners on pages that never changed", "housekeeping"],
    ["is this necessary? do we need to add Markus' last name?", "naming"],
    ["please use title case for this heading and drop the em dash", "style"],
    ["looks good, ship it", "other"],
  ];

  for (const [text, expected] of cases) {
    test(`classifies "${text.slice(0, 40)}..." as ${expected}`, () => {
      assert.equal(classifyComment(text), expected);
    });
  }

  test("empty or missing text classifies as other instead of throwing", () => {
    assert.equal(classifyComment(""), "other");
    assert.equal(classifyComment(null), "other");
    assert.equal(classifyComment(undefined), "other");
  });
});

describe("classifyFindings", () => {
  test("classifies untyped findings and leaves pre-typed ones alone", () => {
    const findings = [
      { text: "drop this, out of scope" },
      { text: "irrelevant text here", type: "fact" }, // pre-labeled, e.g. by --llm
    ];
    const result = classifyFindings(findings);
    assert.equal(result[0].type, "scope");
    assert.equal(result[1].type, "fact");
  });
});

describe("tallyTaxonomy", () => {
  test("counts every type, including zero-hit types", () => {
    const counts = tallyTaxonomy([{ type: "scope" }, { type: "scope" }, { type: "fact" }]);
    assert.equal(counts.scope, 2);
    assert.equal(counts.fact, 1);
    assert.equal(counts.style, 0);
    assert.deepEqual(Object.keys(counts).sort(), [...TAXONOMY_TYPES].sort());
  });

  test("empty input still returns every type at zero", () => {
    const counts = tallyTaxonomy([]);
    for (const type of TAXONOMY_TYPES) assert.equal(counts[type], 0);
  });
});
