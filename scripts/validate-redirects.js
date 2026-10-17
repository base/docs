#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const CONFIG_PATH = path.join(DOCS_DIR, "docs.json");

function normalizeRoute(route) {
  const pathname = route.split(/[?#]/, 1)[0];
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/$/, "") : withLeadingSlash;
}

function routesFromFilePaths(filePaths, docsPrefix = "") {
  const routes = new Set();

  for (const filePath of filePaths) {
    let relative = filePath.replaceAll("\\", "/");
    if (docsPrefix && relative.startsWith(docsPrefix)) {
      relative = relative.slice(docsPrefix.length);
    }
    if (!relative || relative === "docs.json") continue;

    routes.add(normalizeRoute(relative));
    if (!/\.mdx?$/.test(relative)) continue;

    const withoutExtension = relative.replace(/\.mdx?$/, "");
    routes.add(normalizeRoute(withoutExtension));
    if (withoutExtension.endsWith("/index")) {
      routes.add(normalizeRoute(withoutExtension.slice(0, -"/index".length)));
    }
  }

  return routes;
}

function walkFiles(directory, files = [], root = directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files, root);
    } else {
      files.push(path.relative(root, fullPath));
    }
  }
  return files;
}

function compileRedirects(redirects) {
  const exact = new Map();
  const dynamic = [];

  for (const redirect of redirects) {
    if (!redirect.source.includes(":")) {
      exact.set(normalizeRoute(redirect.source), redirect.destination);
      continue;
    }

    const names = [];
    const escaped = normalizeRoute(redirect.source)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/:([A-Za-z][A-Za-z0-9_]*)(\*)?/g, (_, name, wildcard) => {
        names.push({ name, wildcard: Boolean(wildcard) });
        return wildcard ? "(.*)" : "([^/]+)";
      });

    dynamic.push({
      ...redirect,
      names,
      pattern: new RegExp(`^${escaped}$`),
    });
  }

  return { exact, dynamic };
}

function redirectTarget(route, compiled) {
  if (compiled.exact.has(route)) return compiled.exact.get(route);

  for (const redirect of compiled.dynamic) {
    const match = route.match(redirect.pattern);
    if (!match) continue;

    let destination = redirect.destination;
    redirect.names.forEach(({ name, wildcard }, index) => {
      const token = `:${name}${wildcard ? "*" : ""}`;
      destination = destination.replace(token, match[index + 1]);
    });
    return destination;
  }

  return undefined;
}

function terminalExists(destination, routes) {
  if (/^https?:\/\//.test(destination)) return true;

  const route = normalizeRoute(destination);
  if (routes.has(route)) return true;

  const parameterIndex = route.indexOf("/:");
  if (parameterIndex === -1) return false;

  const prefix = route.slice(0, parameterIndex);
  return [...routes].some(candidate => candidate.startsWith(`${prefix}/`));
}

function resolveDestination(destination, compiled, routes) {
  let route = normalizeRoute(destination);
  const seen = new Set();

  for (let depth = 0; depth < 50; depth += 1) {
    if (/^https?:\/\//.test(destination) || terminalExists(route, routes)) {
      return { valid: true, terminal: route };
    }
    if (seen.has(route)) {
      return { valid: false, reason: "redirect cycle", terminal: route };
    }

    seen.add(route);
    const target = redirectTarget(route, compiled);
    if (!target) {
      return { valid: false, reason: "missing destination", terminal: route };
    }
    destination = target;
    route = normalizeRoute(target);
  }

  return { valid: false, reason: "redirect chain exceeds 50 hops", terminal: route };
}

function findInvalidRedirects(redirects, routes) {
  const compiled = compileRedirects(redirects);
  return redirects.flatMap(redirect => {
    const result = resolveDestination(redirect.destination, compiled, routes);
    return result.valid ? [] : [{ ...redirect, ...result }];
  });
}

function invalidKey(redirect) {
  return `${redirect.source}\n${redirect.destination}`;
}

function findNewInvalidRedirects(current, baseline) {
  const baselineKeys = new Set(baseline.map(invalidKey));
  return current.filter(redirect => !baselineKeys.has(invalidKey(redirect)));
}

function currentRoutes() {
  return routesFromFilePaths(walkFiles(DOCS_DIR));
}

function routesAtRef(ref) {
  const files = execFileSync("git", ["ls-tree", "-r", "--name-only", ref, "--", "docs"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean);
  return routesFromFilePaths(files, "docs/");
}

function configAtRef(ref) {
  return JSON.parse(execFileSync("git", ["show", `${ref}:docs/docs.json`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }));
}

function printInvalid(redirects) {
  for (const redirect of redirects) {
    console.error(
      `- ${redirect.source} -> ${redirect.destination} (${redirect.reason}: ${redirect.terminal})`,
    );
  }
}

function main() {
  const baseRefIndex = process.argv.indexOf("--base-ref");
  const baseRef = baseRefIndex === -1 ? undefined : process.argv[baseRefIndex + 1];
  if (baseRefIndex !== -1 && !baseRef) {
    console.error("--base-ref requires a Git ref");
    process.exit(2);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const invalid = findInvalidRedirects(config.redirects ?? [], currentRoutes());
  const failures = baseRef
    ? findNewInvalidRedirects(
        invalid,
        findInvalidRedirects(configAtRef(baseRef).redirects ?? [], routesAtRef(baseRef)),
      )
    : invalid;

  if (failures.length > 0) {
    console.error(`Found ${failures.length} new invalid redirect${failures.length === 1 ? "" : "s"}:`);
    printInvalid(failures);
    process.exit(1);
  }

  const scope = baseRef ? `relative to ${baseRef}` : "in docs.json";
  console.log(`Redirect validation passed ${scope}.`);
}

module.exports = {
  compileRedirects,
  findInvalidRedirects,
  findNewInvalidRedirects,
  normalizeRoute,
  resolveDestination,
  routesFromFilePaths,
};

if (require.main === module) main();
