/**
 * `scope.precision` / `scope.recall` / `scope.forbidden` code checks.
 *
 * All three compare the pages a replay run actually touched
 * (`meta.touched`) against the case's declared `scope.in` (pages a good run
 * should touch) and `scope.out` (pages it must not touch). Generated index
 * files (`docs/AGENTS.md`, `docs/llms*.txt`) are excluded from the touched
 * set before any comparison — they aren't `.mdx` pages, so `isDocPage`
 * already filters them out; see PLAN.md Lane B item 1.
 */
import { mkCheck, isDocPage } from "./shared.mjs";

/**
 * @param {object} caseDef   parsed case JSON (see PLAN.md "Case file")
 * @param {{meta: object}} run
 * @returns {Array} checks[]
 */
export function checkScope(caseDef, run) {
  const checks = computeScope(caseDef, run);
  if (caseDef?.scope?.label_source !== "drafted") return checks;
  // Drafted labels come from the current route table and inherit its scope
  // creep (PLAN.md ground rules), so they can't grade the run yet. Keep the
  // entries visible but unscored: `pass: null` is what `summarize` skips.
  return checks.map((c) => ({ ...c, pass: null, detail: `unconfirmed drafted labels (${c.detail})` }));
}

function computeScope(caseDef, run) {
  const touched = (run?.meta?.touched || []).filter(isDocPage);
  const wanted = new Set((caseDef?.scope?.in || []).filter(isDocPage));
  const forbidden = new Set((caseDef?.scope?.out || []).filter(isDocPage));

  const checks = [];
  const hits = touched.filter((p) => wanted.has(p));

  // Precision: of the pages actually touched, how many were expected.
  // Vacuously perfect when the run touched nothing (nothing wrong was
  // touched either) — the "zero touched pages when scope.in is non-empty"
  // failure mode is an overall-score rule (see PLAN.md "Overall score"),
  // applied by grade.mjs, not this check.
  const precisionScore = touched.length === 0 ? 1 : hits.length / touched.length;
  checks.push(
    mkCheck(
      "scope.precision",
      "code",
      null,
      precisionScore >= 0.999,
      precisionScore,
      `${hits.length}/${touched.length || 0} touched page(s) were in scope.in`,
    ),
  );

  // Recall: of the pages expected, how many were touched. Vacuously
  // perfect when nothing was expected (drafted/unlabeled cases with an
  // empty scope.in).
  const recallScore = wanted.size === 0 ? 1 : hits.length / wanted.size;
  checks.push(
    mkCheck(
      "scope.recall",
      "code",
      null,
      recallScore >= 0.999,
      recallScore,
      `${hits.length}/${wanted.size} expected page(s) were touched`,
    ),
  );

  // Forbidden: one failing entry per touched page that scope.out named.
  // A case with no forbidden touches gets no entries at all rather than a
  // single vacuous pass, so the mean of code-check scores isn't diluted by
  // cases that had nothing to forbid.
  for (const page of touched) {
    if (forbidden.has(page)) {
      checks.push(
        mkCheck(
          "scope.forbidden",
          "code",
          page,
          false,
          0,
          "page is listed in scope.out but was touched by the run",
        ),
      );
    }
  }

  return checks;
}
