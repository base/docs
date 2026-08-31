/**
 * Approval counting for the IA gates.
 *
 * Pure logic, no network -- everything here is unit tested in
 * .github/scripts/__tests__/check-ia-approvals.test.mjs.
 *
 * Rules, from the "CI Approval Workflows" spec:
 *   - only approvals for the current pull request head SHA count
 *   - the pull request author cannot count toward the total
 *   - approvers must be distinct
 *
 * Everything below fails closed: an entry we cannot confidently interpret is
 * discarded rather than counted.
 */

/** Review states that decide a user's standing. COMMENTED and PENDING are not decisive. */
const DECISIVE_STATES = new Set(["APPROVED", "CHANGES_REQUESTED", "DISMISSED"]);

/**
 * Reduce a PR's review list to the set of users whose current, head-SHA-scoped
 * standing is "approved".
 *
 * @param {Array<object>} reviews  raw GET /pulls/{n}/reviews entries, any order
 * @param {object} opts
 * @param {string} opts.headSha    the head SHA re-read from GET /pulls/{n}
 * @param {number} [opts.authorId] numeric id of the PR author, excluded from the tally
 * @returns {{approvers: Array<{id:number,login:string}>, discarded: Array<{login:string,reason:string}>}}
 */
export function summarizeApprovals(reviews, { headSha, authorId } = {}) {
  const discarded = [];
  const note = (login, reason) => discarded.push({ login, reason });

  if (typeof headSha !== "string" || headSha === "") {
    throw new Error("summarizeApprovals requires a non-empty headSha");
  }
  if (!Array.isArray(reviews)) {
    throw new Error("summarizeApprovals requires an array of reviews");
  }

  // The API documents chronological order, but sort defensively: submitted_at is
  // optional in the schema, so fall back to the monotonically increasing review id.
  const ordered = [...reviews].sort((a, b) => {
    const ta = Date.parse(a?.submitted_at ?? "") || 0;
    const tb = Date.parse(b?.submitted_at ?? "") || 0;
    if (ta !== tb) return ta - tb;
    return (a?.id ?? 0) - (b?.id ?? 0);
  });

  // Last decisive review per user wins. A dismissal mutates the existing record's
  // state to DISMISSED in place rather than appending, so last-wins covers it.
  const latestByUser = new Map();

  for (const review of ordered) {
    const user = review?.user;

    // Deleted and ghost accounts surface as a null user.
    if (!user || typeof user !== "object") {
      note("(unknown)", "review has no associated user account");
      continue;
    }
    const login = typeof user.login === "string" ? user.login : "(unknown)";
    const id = user.id;
    if (typeof id !== "number") {
      note(login, "review user has no numeric id");
      continue;
    }

    // Allowlist real users: the type set also includes Bot, Organization and Mannequin.
    if (user.type !== "User") {
      note(login, `reviewer type is ${user.type ?? "unset"}, not User`);
      continue;
    }

    const state = typeof review.state === "string" ? review.state.toUpperCase() : "";
    if (!DECISIVE_STATES.has(state)) {
      // COMMENTED and PENDING carry no standing; not worth reporting as discarded.
      continue;
    }

    // commit_id is nullable in the schema. Compare explicitly rather than relying on
    // null never equalling a SHA.
    if (typeof review.commit_id !== "string" || review.commit_id === "") {
      note(login, "review is not attached to a commit");
      continue;
    }
    if (review.commit_id !== headSha) {
      note(login, `review is on ${review.commit_id.slice(0, 7)}, not current head`);
      continue;
    }

    latestByUser.set(id, { id, login, state });
  }

  const approvers = [];
  for (const entry of latestByUser.values()) {
    if (entry.state !== "APPROVED") {
      note(entry.login, `latest review on current head is ${entry.state}`);
      continue;
    }
    if (typeof authorId === "number" && entry.id === authorId) {
      note(entry.login, "pull request author cannot approve their own change");
      continue;
    }
    approvers.push({ id: entry.id, login: entry.login });
  }

  return { approvers, discarded };
}

/**
 * True when a collaborator-permission payload denotes write access.
 *
 * Reads the boolean rather than the `permission` string: the API maps the maintain
 * role onto "write" in that field, and `role_name` returns org-defined custom role
 * names that no fixed allowlist can cover.
 */
export function hasWriteAccess(permissionPayload) {
  return permissionPayload?.user?.permissions?.push === true;
}

/**
 * Decide a gate from its approver set.
 *
 * @param {object} opts
 * @param {Array<{id:number,login:string}>} opts.approvers
 * @param {"writers"|"governanceOwners"} opts.requires
 * @param {number} opts.count
 * @param {Set<number>} opts.writerIds  approver ids confirmed to have write access
 * @param {Set<number>} opts.ownerIds   approver ids that are governance owners
 */
export function evaluateRequirement({ approvers, requires, count, writerIds, ownerIds }) {
  const qualifying = approvers.filter((a) =>
    requires === "governanceOwners" ? ownerIds.has(a.id) : writerIds.has(a.id)
  );
  const label = requires === "governanceOwners" ? "Governance Owner" : "Writer";
  const satisfied = qualifying.length >= count;
  const missing = Math.max(0, count - qualifying.length);

  return {
    satisfied,
    qualifying,
    summary: satisfied
      ? `${qualifying.length}/${count} ${label} approval${count === 1 ? "" : "s"} on the current head SHA.`
      : `${qualifying.length}/${count} ${label} approval${count === 1 ? "" : "s"} on the current head SHA — ${missing} more needed.`,
  };
}
