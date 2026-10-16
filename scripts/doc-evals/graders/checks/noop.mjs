/**
 * `noop` code check.
 *
 * When a case has a human `reference` answer, every page the reference PR
 * changed is a page a correct run should have edited too. A run that left
 * one of those pages byte-identical to `docs_base_commit` — reported via
 * `meta.touched` not containing it — silently missed a required edit. This
 * is a narrower, code-only signal than `scope.recall` (which only asks "was
 * the *page* touched", same as this) — kept as its own check id because it
 * is specifically about the reference, not the drafted/reviewer-derived
 * `scope.in`, and only applies when a reference exists. One entry per
 * reference page: pass when touched, fail when not.
 */
import { mkCheck, isDocPage } from "./shared.mjs";

/**
 * @param {object} caseDef
 * @param {{meta: object}} run
 * @returns {Array} checks[] — empty when the case has no reference
 */
export function checkNoop(caseDef, run) {
  if (!caseDef?.reference) return [];
  const touched = new Set((run?.meta?.touched || []).filter(isDocPage));
  const referencePages = (caseDef.reference.pages || []).filter(isDocPage);

  return referencePages.map((page) => {
    const wasTouched = touched.has(page);
    return mkCheck(
      "noop",
      "code",
      page,
      wasTouched,
      wasTouched ? 1 : 0,
      wasTouched
        ? "reference-changed page was touched"
        : "reference PR changed this page but the run left it unchanged",
    );
  });
}
