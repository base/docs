const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const {
  findInvalidRedirects,
  findNewInvalidRedirects,
  routesFromFilePaths,
} = require("./validate-redirects.js");

const routes = routesFromFilePaths([
  "docs/apps/index.mdx",
  "docs/apps/quickstart/build-app.mdx",
  "docs/base-chain/api-reference/ethereum-json-rpc-api/eth_call.mdx",
], "docs/");

describe("redirect validation", () => {
  it("accepts page destinations and redirect chains", () => {
    const redirects = [
      { source: "/old-apps", destination: "/apps-v1" },
      { source: "/apps-v1", destination: "/apps" },
    ];

    assert.deepEqual(findInvalidRedirects(redirects, routes), []);
  });

  it("accepts dynamic destinations backed by a docs directory", () => {
    const redirects = [{
      source: "/rpc/:method",
      destination: "/base-chain/api-reference/ethereum-json-rpc-api/:method",
    }];

    assert.deepEqual(findInvalidRedirects(redirects, routes), []);
  });

  it("resolves wildcard redirect chains", () => {
    const redirects = [
      { source: "/legacy/:slug*", destination: "/moved/:slug*" },
      { source: "/moved/:slug*", destination: "/apps/quickstart/build-app" },
    ];

    assert.deepEqual(findInvalidRedirects(redirects, routes), []);
  });

  it("reports missing destinations and cycles", () => {
    const redirects = [
      { source: "/missing", destination: "/not-a-page" },
      { source: "/cycle-a", destination: "/cycle-b" },
      { source: "/cycle-b", destination: "/cycle-a" },
    ];

    const invalid = findInvalidRedirects(redirects, routes);
    assert.equal(invalid.length, 3);
    assert.equal(invalid[0].reason, "missing destination");
    assert.equal(invalid[1].reason, "redirect cycle");
    assert.equal(invalid[2].reason, "redirect cycle");
  });

  it("fails only invalid redirects introduced after the baseline", () => {
    const existing = [{
      source: "/known-broken",
      destination: "/missing-before-this-change",
      reason: "missing destination",
      terminal: "/missing-before-this-change",
    }];
    const current = [
      ...existing,
      {
        source: "/new-broken",
        destination: "/new-missing-page",
        reason: "missing destination",
        terminal: "/new-missing-page",
      },
    ];

    assert.deepEqual(findNewInvalidRedirects(current, existing), [current[1]]);
  });
});
