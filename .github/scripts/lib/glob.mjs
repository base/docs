/**
 * Minimal path-glob matcher for the protected-path lists in .github/ia-governance.json.
 *
 * Supports exactly what those lists need and nothing more:
 *   *   matches within one path segment
 *   **  matches across segments
 *
 * A dependency-free matcher keeps the privileged gate job free of npm install.
 */

const REGEX_SPECIALS = /[.+^${}()|[\]\\?]/g;

function globToRegExp(glob) {
  let out = "";
  let i = 0;

  while (i < glob.length) {
    const rest = glob.slice(i);

    // "/**/" -> optional intermediate directories, so docs/a/**/*.mdx also
    // matches docs/a/b.mdx with no directory in between.
    if (rest.startsWith("/**/")) {
      out += "/(?:.*/)?";
      i += 4;
      continue;
    }
    // Trailing "/**" -> this directory and everything beneath it.
    if (rest === "/**") {
      out += "(?:/.*)?";
      i += 3;
      continue;
    }
    // Leading "**/" -> any number of leading directories.
    if (i === 0 && rest.startsWith("**/")) {
      out += "(?:.*/)?";
      i += 3;
      continue;
    }
    if (rest.startsWith("**")) {
      out += ".*";
      i += 2;
      continue;
    }
    if (rest.startsWith("*")) {
      out += "[^/]*";
      i += 1;
      continue;
    }
    out += glob[i].replace(REGEX_SPECIALS, "\\$&");
    i += 1;
  }

  return new RegExp(`^${out}$`);
}

const cache = new Map();

export function matchesGlob(filePath, glob) {
  let re = cache.get(glob);
  if (!re) {
    re = globToRegExp(glob);
    cache.set(glob, re);
  }
  return re.test(filePath);
}

/** True when filePath matches at least one glob. */
export function matchesAnyGlob(filePath, globs) {
  if (!Array.isArray(globs)) return false;
  return globs.some((g) => typeof g === "string" && matchesGlob(filePath, g));
}

/** Every path in filePaths that matches at least one glob. */
export function filterByGlobs(filePaths, globs) {
  return filePaths.filter((p) => matchesAnyGlob(p, globs));
}
