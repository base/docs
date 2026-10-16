/**
 * Code-check aggregator. See PLAN.md, "Lane B: graders", item 1.
 *
 * Every individual check lives in its own module under `graders/checks/`
 * (kept small — see PLAN.md's "keep each file you write small" note) and
 * exports a pure `check*(caseDef, run) -> checks[]` function. This file
 * just concatenates their output; it holds no rule logic of its own.
 *
 * `run` is the in-memory shape `grade.mjs` builds from a replay rep
 * directory (see PLAN.md, "Replay output"):
 *   {
 *     meta:   parsed meta.json,
 *     before: Map<repoRelativePath, string>  — before/<path> contents,
 *     after:  Map<repoRelativePath, string>  — after/<path> contents,
 *   }
 * `caseDef` is the parsed case JSON (see PLAN.md, "Case file").
 */
import { checkScope } from "./checks/scope.mjs";
import { checkGrounding } from "./checks/grounding.mjs";
import { checkSelector } from "./checks/selector.mjs";
import { checkLint } from "./checks/lint.mjs";
import { checkHousekeeping } from "./checks/housekeeping.mjs";
import { checkChangelogShape, checkChangelogFidelity } from "./checks/changelog.mjs";
import { checkNoop } from "./checks/noop.mjs";

/**
 * @param {object} caseDef
 * @param {{meta: object, before: Map<string,string>, after: Map<string,string>}} run
 * @returns {Array} the `checks[]` array's `layer: "code"` entries
 */
export function runCodeChecks(caseDef, run) {
  return [
    ...checkScope(caseDef, run),
    ...checkGrounding(caseDef, run),
    ...checkSelector(caseDef, run),
    ...checkLint(caseDef, run),
    ...checkHousekeeping(caseDef, run),
    ...checkChangelogShape(caseDef, run),
    ...checkChangelogFidelity(caseDef, run),
    ...checkNoop(caseDef, run),
  ];
}
