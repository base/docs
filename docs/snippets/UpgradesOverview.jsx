// Docs port of the Upgrades page at https://chain.base.org/upgrades
// (source: github.com/base/ui, app/upgrades). Same data model — an upgrade
// carries a per-network lifecycle that is either a confirmed timestamp or a
// coarse estimate — so status is derived at render time and never goes stale.
//
// Two Mintlify constraints shape this file:
//   1. Only the imported export is in scope, so data and helpers shared by the
//      two views live inside the component rather than at module level.
//   2. Tailwind classes are rewritten to a `mint-` prefixed subset, and any
//      utility outside that subset silently no-ops (emerald and amber, for
//      instance). Styling therefore goes through the token + <style> pattern
//      the other demo snippets use.
// No imports allowed either; useState is injected globally.

export const UpgradesOverview = () => {
  const [view, setView] = useState('grid');

  const UPGRADES = [
    {
      id: 'denim',
      name: 'Denim',
      summary:
        'Denim introduces native blocks at a 200ms cadence, millisecond-resolution RPC timestamps, and onchain millisecond time through BaseTime.',
      lifecycle: { sepolia: {}, mainnet: {} },
      estimate: { sepolia: 'November 2026', mainnet: 'November 2026' },
      changeCount: 1,
      href: '/base-chain/specs/upgrades/denim/200ms-blocks',
    },
    {
      id: 'cobalt',
      name: 'Cobalt',
      summary:
        'Cobalt adds native account abstraction with EIP-8130, makes improvements to the B20 token standard, and introduces dynamic node upgrades.',
      lifecycle: { sepolia: {}, mainnet: {} },
      estimate: { sepolia: 'September 2026', mainnet: 'September 2026' },
      changeCount: 3,
      href: '/base-chain/specs/upgrades/cobalt/overview',
    },
    {
      id: 'beryl',
      name: 'Beryl',
      summary:
        'Beryl makes Base a first-class issuance platform with B20 tokens, more capital efficient with reduced withdrawal delays, and more scalable with Reth V2.',
      lifecycle: {
        sepolia: { timestamp: '2026-06-18T18:00:00Z' },
        mainnet: { timestamp: '2026-06-25T18:00:00Z' },
      },
      changeCount: 3,
      href: '/base-chain/specs/upgrades/beryl/overview',
    },
    {
      id: 'azul',
      name: 'Azul',
      summary:
        "Azul is Base's first independent network upgrade. It focuses on increasing security and decentralization, accelerating the path to 1 gigagas/s, and improving developer experience.",
      lifecycle: {
        sepolia: { timestamp: '2026-04-20T18:00:00Z' },
        mainnet: { timestamp: '2026-05-28T18:00:00Z' },
      },
      changeCount: 11,
      href: '/base-chain/specs/upgrades/azul/overview',
    },
  ];

  const NETWORKS = ['sepolia', 'mainnet'];
  const NETWORK_LABELS = { sepolia: 'Sepolia', mainnet: 'Mainnet' };
  const LIFECYCLE_LABELS = { live: 'Live', scheduled: 'Scheduled', planning: 'Planning' };
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const nowMs = Date.now();

  // A network with no timestamp is still being planned; otherwise it is live
  // once its activation time has passed and scheduled until then.
  const lifecycleState = (entry) => {
    if (!entry || !entry.timestamp) return 'planning';
    return Date.parse(entry.timestamp) <= nowMs ? 'live' : 'scheduled';
  };

  // A confirmed timestamp wins, then a coarse estimate, then a placeholder.
  const lifecycleDate = (entry, estimate) => {
    if (entry && entry.timestamp) {
      const d = new Date(entry.timestamp);
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${MONTHS[d.getUTCMonth()]} ${day}, ${d.getUTCFullYear()}`;
    }
    return estimate || 'Coming soon';
  };

  const changeLabel = (n) => `${n} ${n === 1 ? 'change' : 'changes'}`;

  const statusPill = (state) => (
    <span className="upg-pill" data-state={state}>
      <span className="upg-dot" />
      {LIFECYCLE_LABELS[state]}
    </span>
  );

  const timelineRow = (key, dateLabel, upgrade, state, meta) => (
    <div className="upg-row" key={key}>
      <div className="upg-row-date">{dateLabel}</div>
      <div className="upg-row-marker">
        <span className="upg-node" />
      </div>
      <a className="upg-row-body" href={upgrade.href}>
        <span className="upg-row-name">{upgrade.name}</span>
        <span className="upg-row-summary">{upgrade.summary}</span>
        <span className="upg-meta">
          {statusPill(state)}
          {meta.map((item) => (
            <span className="upg-meta-item" key={item}>
              <span className="upg-sep">·</span>
              {item}
            </span>
          ))}
        </span>
      </a>
    </div>
  );

  const grid = (
    <div className="upg-grid">
      {UPGRADES.map((upgrade) => (
        <div className="upg-card" key={upgrade.id}>
          <div className="upg-card-head">
            <span className="upg-card-name">{upgrade.name}</span>
            <img
              className="upg-illo"
              src={`/images/upgrades/${upgrade.id}-illo.svg`}
              alt=""
              aria-hidden="true"
            />
          </div>

          <p className="upg-card-summary">{upgrade.summary}</p>

          <div className="upg-card-foot">
            <div className="upg-dates">
              {NETWORKS.map((network) => (
                <div className="upg-date" key={network}>
                  <span className="upg-date-label">{NETWORK_LABELS[network]}</span>
                  <span className="upg-date-value">
                    {lifecycleDate(
                      upgrade.lifecycle[network],
                      upgrade.estimate && upgrade.estimate[network],
                    )}
                  </span>
                </div>
              ))}
            </div>

            <a className="upg-button" href={upgrade.href}>
              View features
            </a>
          </div>
        </div>
      ))}
    </div>
  );

  // Upgrades with no activation time on either network have nowhere to sit on a
  // dated timeline, so they lead the view under "Upcoming" instead.
  const planning = UPGRADES.filter(
    (u) => !u.lifecycle.sepolia.timestamp && !u.lifecycle.mainnet.timestamp,
  );

  const entries = [];
  for (const upgrade of UPGRADES) {
    for (const network of NETWORKS) {
      const entry = upgrade.lifecycle[network];
      if (!entry.timestamp) continue;
      const date = new Date(entry.timestamp);
      entries.push({
        key: `${upgrade.id}-${network}`,
        time: date.getTime(),
        month: MONTHS[date.getUTCMonth()],
        dateLabel: `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`,
        upgrade,
        network,
        state: lifecycleState(entry),
      });
    }
  }
  entries.sort((a, b) => b.time - a.time);

  const months = [];
  for (const entry of entries) {
    const last = months[months.length - 1];
    if (last && last.label === entry.month) {
      last.entries.push(entry);
    } else {
      months.push({ label: entry.month, entries: [entry] });
    }
  }

  const timeline = (
    <div className="upg-timeline">
      <span className="upg-rail" />

      {planning.length > 0 && (
        <div className="upg-month">
          <p className="upg-month-label">Upcoming</p>
          <div className="upg-rows">
            {planning.map((upgrade) =>
              timelineRow(
                upgrade.id,
                (upgrade.estimate &&
                  (upgrade.estimate.mainnet || upgrade.estimate.sepolia)) ||
                  'Coming soon',
                upgrade,
                'planning',
                [changeLabel(upgrade.changeCount)],
              ),
            )}
          </div>
        </div>
      )}

      {months.map((month) => (
        <div className="upg-month" key={month.label}>
          <p className="upg-month-label">{month.label}</p>
          <div className="upg-rows">
            {month.entries.map((entry) =>
              timelineRow(entry.key, entry.dateLabel, entry.upgrade, entry.state, [
                NETWORK_LABELS[entry.network],
                changeLabel(entry.upgrade.changeCount),
              ]),
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const tab = (value, label) => (
    <button
      type="button"
      className="upg-tab"
      data-active={view === value}
      aria-pressed={view === value}
      onClick={() => setView(value)}
    >
      {label}
    </button>
  );

  return (
    <div className="upg">
      <style>{`
        /* ---- Base design system: color tokens (light) ---- */
        .upg {
          --upg-ink: #0a0b0d;
          --upg-body: #32353d;
          --upg-sec: #5b616e;
          --upg-sub: #717886;
          --upg-border: #dee1e7;
          --upg-panel: #eef0f3;
          --upg-surface: #ffffff;
          --upg-hover: #f6f7f9;
          --upg-live-fg: #3f7d00;
          --upg-live-bg: rgba(102,200,0,.12);
          --upg-live-br: rgba(102,200,0,.35);
          --upg-live-dot: #66c800;
          --upg-sched-fg: #8a6400;
          --upg-sched-bg: rgba(255,209,47,.16);
          --upg-sched-br: rgba(255,209,47,.45);
          --upg-sched-dot: #ffd12f;
          --upg-plan-fg: #5b616e;
          --upg-plan-bg: #eef0f3;
          --upg-plan-br: #dee1e7;
          --upg-plan-dot: #9aa1ae;
          --upg-accent: #0000ff;
        }
        /* ---- Dark theme: system preference ---- */
        @media (prefers-color-scheme: dark) {
          .upg {
            --upg-ink: #ffffff;
            --upg-body: #dee1e7;
            --upg-sec: #b1b7c3;
            --upg-sub: #8a91a0;
            --upg-border: #2b2f36;
            --upg-panel: #17181b;
            --upg-surface: rgba(255,255,255,.05);
            --upg-hover: rgba(255,255,255,.09);
            --upg-live-fg: #9ae05a;
            --upg-live-bg: rgba(124,212,66,.16);
            --upg-live-br: rgba(124,212,66,.35);
            --upg-live-dot: #7cd442;
            --upg-sched-fg: #ffd97a;
            --upg-sched-bg: rgba(255,209,47,.14);
            --upg-sched-br: rgba(255,209,47,.35);
            --upg-sched-dot: #ffd12f;
            --upg-plan-fg: #b1b7c3;
            --upg-plan-bg: rgba(255,255,255,.06);
            --upg-plan-br: #2b2f36;
            --upg-plan-dot: #6d7482;
            --upg-accent: #578bfa;
          }
        }
        /* ---- Dark theme: docs explicit toggle wins over system ---- */
        html.dark .upg, :root[data-theme="dark"] .upg, [data-theme="dark"] .upg {
          --upg-ink: #ffffff;
          --upg-body: #dee1e7;
          --upg-sec: #b1b7c3;
          --upg-sub: #8a91a0;
          --upg-border: #2b2f36;
          --upg-panel: #17181b;
          --upg-surface: rgba(255,255,255,.05);
          --upg-hover: rgba(255,255,255,.09);
          --upg-live-fg: #9ae05a;
          --upg-live-bg: rgba(124,212,66,.16);
          --upg-live-br: rgba(124,212,66,.35);
          --upg-live-dot: #7cd442;
          --upg-sched-fg: #ffd97a;
          --upg-sched-bg: rgba(255,209,47,.14);
          --upg-sched-br: rgba(255,209,47,.35);
          --upg-sched-dot: #ffd12f;
          --upg-plan-fg: #b1b7c3;
          --upg-plan-bg: rgba(255,255,255,.06);
          --upg-plan-br: #2b2f36;
          --upg-plan-dot: #6d7482;
          --upg-accent: #578bfa;
        }
        /* ---- Light theme: docs explicit toggle wins over system dark ---- */
        html.light .upg, :root[data-theme="light"] .upg, [data-theme="light"] .upg {
          --upg-ink: #0a0b0d;
          --upg-body: #32353d;
          --upg-sec: #5b616e;
          --upg-sub: #717886;
          --upg-border: #dee1e7;
          --upg-panel: #eef0f3;
          --upg-surface: #ffffff;
          --upg-hover: #f6f7f9;
          --upg-live-fg: #3f7d00;
          --upg-live-bg: rgba(102,200,0,.12);
          --upg-live-br: rgba(102,200,0,.35);
          --upg-live-dot: #66c800;
          --upg-sched-fg: #8a6400;
          --upg-sched-bg: rgba(255,209,47,.16);
          --upg-sched-br: rgba(255,209,47,.45);
          --upg-sched-dot: #ffd12f;
          --upg-plan-fg: #5b616e;
          --upg-plan-bg: #eef0f3;
          --upg-plan-br: #dee1e7;
          --upg-plan-dot: #9aa1ae;
          --upg-accent: #0000ff;
        }

        .upg, .upg * { box-sizing: border-box; }
        .upg { margin: 24px 0 8px; color: var(--upg-body); }

        /* Docs links are globally blue and get an underline border from the
           the .link class; here the link is the whole card or row, so it inherits
           the surrounding text color and drops the rule. */
        .upg a, #content-area .upg a {
          color: inherit; text-decoration: none; border-bottom: 0;
        }

        /* ---- View toggle ---- */
        .upg-tabs { display: flex; justify-content: center; margin-bottom: 24px; }
        .upg-tablist {
          display: inline-flex; gap: 4px; padding: 4px;
          background: var(--upg-panel); border-radius: 999px;
        }
        .upg-tab {
          padding: 6px 16px; border: 0; border-radius: 999px; cursor: pointer;
          background: transparent; color: var(--upg-sec);
          font: inherit; font-size: 14px; line-height: 1.4;
          transition: background-color .15s ease, color .15s ease;
        }
        .upg-tab:hover { color: var(--upg-ink); }
        .upg-tab[data-active="true"] { background: var(--upg-surface); color: var(--upg-ink); }

        /* ---- Grid view ---- */
        .upg-grid { display: grid; gap: 16px; }
        @media (min-width: 1024px) { .upg-grid { grid-template-columns: 1fr 1fr; } }

        .upg-card {
          display: flex; flex-direction: column;
          padding: 12px 20px 20px; border: 1px solid var(--upg-border);
          border-radius: 16px; background: var(--upg-surface);
          transition: background-color .15s ease;
        }
        .upg-card:hover { background: var(--upg-hover); }
        .upg-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .upg-card-name { font-size: 18px; line-height: 26px; letter-spacing: -0.02em; color: var(--upg-ink); }
        .upg-illo { width: 48px; height: 48px; flex-shrink: 0; margin: -4px -6px 0 0; }
        /* The bottom margin is the floor: margin-top:auto on the footer only
           adds space when the card is the taller of its row. */
        .upg-card-summary {
          margin: 2px 0 16px; max-width: 85%;
          font-size: 15px; line-height: 1.5; color: var(--upg-sec);
        }
        .upg-card-foot {
          display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
          gap: 12px; margin-top: auto; padding-top: 16px;
          border-top: 1px solid var(--upg-border);
        }
        .upg-dates { display: flex; flex-wrap: wrap; gap: 4px 40px; }
        .upg-date { display: flex; flex-direction: column; gap: 2px; }
        .upg-date-label { font-size: 10px; letter-spacing: .04em; text-transform: uppercase; color: var(--upg-sub); }
        .upg-date-value { font-size: 14px; white-space: nowrap; color: var(--upg-ink); }
        .upg-button {
          padding: 8px 14px; border: 1px solid var(--upg-border); border-radius: 10px;
          font-size: 14px; white-space: nowrap; color: var(--upg-ink);
          transition: background-color .15s ease;
        }
        .upg-button:hover { background: var(--upg-panel); }

        /* ---- Timeline view ---- */
        /* The rail sits under the node centers: a 96px date column, a 12px gap,
           then half of the 8px node. */
        .upg-timeline { position: relative; }
        .upg-rail {
          position: absolute; top: 0; bottom: 0; left: 112px;
          width: 1px; background: var(--upg-border);
        }
        .upg-month + .upg-month { margin-top: 48px; }
        .upg-month-label {
          margin: 0 0 32px; padding-left: 128px;
          font-size: 16px; color: var(--upg-sub);
        }
        .upg-rows { display: flex; flex-direction: column; gap: 40px; }
        .upg-row { position: relative; display: flex; align-items: flex-start; gap: 12px; }
        .upg-row-date {
          width: 96px; flex-shrink: 0; padding-top: 2px;
          text-align: right; font-size: 13px; color: var(--upg-sub);
        }
        .upg-row-marker { position: relative; z-index: 1; flex-shrink: 0; padding-top: 8px; }
        .upg-node { display: block; width: 8px; height: 8px; border-radius: 999px; background: var(--upg-plan-dot); }
        .upg-row-body { min-width: 0; flex: 1; }
        .upg-row-name {
          display: block; font-size: 18px; line-height: 26px; letter-spacing: -0.02em;
          color: var(--upg-ink); transition: color .15s ease;
        }
        .upg-row-body:hover .upg-row-name { color: var(--upg-accent); }
        .upg-row-summary { display: block; margin-top: 6px; font-size: 14px; line-height: 1.5; color: var(--upg-sec); }
        .upg-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
        .upg-meta-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--upg-sub); }
        .upg-sep { color: var(--upg-border); }

        /* ---- Status pills ---- */
        .upg-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 4px 10px; border: 1px solid transparent; border-radius: 999px;
          font-size: 12px; line-height: 1;
        }
        .upg-dot { display: block; width: 8px; height: 8px; flex-shrink: 0; border-radius: 999px; }
        .upg-pill[data-state="live"] { color: var(--upg-live-fg); background: var(--upg-live-bg); border-color: var(--upg-live-br); }
        .upg-pill[data-state="live"] .upg-dot { background: var(--upg-live-dot); }
        .upg-pill[data-state="scheduled"] { color: var(--upg-sched-fg); background: var(--upg-sched-bg); border-color: var(--upg-sched-br); }
        .upg-pill[data-state="scheduled"] .upg-dot { background: var(--upg-sched-dot); }
        .upg-pill[data-state="planning"] { color: var(--upg-plan-fg); background: var(--upg-plan-bg); border-color: var(--upg-plan-br); }
        .upg-pill[data-state="planning"] .upg-dot { background: var(--upg-plan-dot); }

        /* Narrow screens drop the date gutter and left-align the whole row. */
        @media (max-width: 640px) {
          .upg-rail { left: 3px; }
          .upg-row { flex-wrap: wrap; }
          .upg-row-marker { order: 1; padding-top: 6px; }
          .upg-row-date { order: 2; width: auto; padding-top: 0; text-align: left; }
          .upg-row-body { order: 3; flex-basis: 100%; padding-left: 20px; }
          .upg-month-label { padding-left: 20px; }
        }
      `}</style>

      <div className="upg-tabs">
        <div className="upg-tablist" role="group" aria-label="View mode">
          {tab('grid', 'Grid')}
          {tab('timeline', 'Timeline')}
        </div>
      </div>

      {view === 'grid' ? grid : timeline}
    </div>
  );
};
