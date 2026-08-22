"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "All" | "Study" | "Projects" | "Career" | "Personal" | "Focus";
type EntityType =
  | "project"
  | "person"
  | "document"
  | "task"
  | "event"
  | "repository"
  | "idea"
  | "memory";

type Entity = {
  id: string;
  label: string;
  type: EntityType;
  mode: Mode[];
  x: number;
  y: number;
  weight: number;
  summary: string;
  signal: string;
  detail: string;
};

type Relation = {
  from: string;
  to: string;
  label: string;
  strength: number;
};

type Activity = {
  time: string;
  source: string;
  title: string;
  cluster: string;
};

const modes: Mode[] = ["All", "Study", "Projects", "Career", "Personal", "Focus"];

const entities: Entity[] = [
  {
    id: "haemologix",
    label: "Haemologix",
    type: "project",
    mode: ["All", "Projects", "Career", "Focus"],
    x: 52,
    y: 45,
    weight: 1,
    summary: "Donor alert architecture moved from sketch to implementation plan.",
    signal: "changed today",
    detail:
      "Repository commits, a collaborator email, and the edited architecture note all point to the same unresolved decision: alert routing thresholds.",
  },
  {
    id: "anika",
    label: "Anika Rao",
    type: "person",
    mode: ["All", "Projects"],
    x: 30,
    y: 31,
    weight: 0.68,
    summary: "Collaborator waiting on the alert routing answer.",
    signal: "last contact 6d",
    detail:
      "She appears in two meetings, owns the copy review task, and asked for a shorter donor-facing flow.",
  },
  {
    id: "repo",
    label: "donor-alert repo",
    type: "repository",
    mode: ["All", "Projects", "Career"],
    x: 70,
    y: 28,
    weight: 0.62,
    summary: "Three commits touched triage, notifications, and audit logging.",
    signal: "3 commits",
    detail:
      "The commit trail suggests notification fallback is stable, but audit log naming still disagrees with the architecture note.",
  },
  {
    id: "architecture",
    label: "Alert architecture note",
    type: "document",
    mode: ["All", "Projects", "Study"],
    x: 69,
    y: 61,
    weight: 0.72,
    summary: "The source of truth for donor severity and escalation.",
    signal: "edited 10:42",
    detail:
      "Mentioned by the meeting transcript, linked from the repo README, and cited by two open tasks.",
  },
  {
    id: "task-thresholds",
    label: "Set threshold policy",
    type: "task",
    mode: ["All", "Projects", "Focus"],
    x: 43,
    y: 70,
    weight: 0.56,
    summary: "Blocks integration QA and Anika's copy review.",
    signal: "due tomorrow",
    detail:
      "The task matters because two downstream decisions depend on whether donor risk is scored by count, source, or recency.",
  },
  {
    id: "meeting",
    label: "Clinical advisor sync",
    type: "event",
    mode: ["All", "Projects", "Focus"],
    x: 38,
    y: 53,
    weight: 0.44,
    summary: "Tomorrow's meeting needs a concise decision brief.",
    signal: "tomorrow 11:00",
    detail:
      "The agenda mentions escalation language, audit trail concerns, and a demo of the changed alert flow.",
  },
  {
    id: "exam",
    label: "Systems exam",
    type: "event",
    mode: ["All", "Study", "Focus"],
    x: 18,
    y: 64,
    weight: 0.5,
    summary: "Two unfinished topics carry most of the revision risk.",
    signal: "in 4 days",
    detail:
      "Scheduling and memory hierarchy are under-reviewed compared with the operating systems notes you touched this week.",
  },
  {
    id: "os-notes",
    label: "OS revision notebook",
    type: "document",
    mode: ["All", "Study"],
    x: 19,
    y: 43,
    weight: 0.42,
    summary: "Recent notes connect directly to the exam and internship prep.",
    signal: "opened yesterday",
    detail:
      "The AI recommends revising process scheduling first because it appears in notes, past mistakes, and the exam outline.",
  },
  {
    id: "internship",
    label: "Helio Labs internship",
    type: "project",
    mode: ["All", "Career", "Focus"],
    x: 77,
    y: 47,
    weight: 0.58,
    summary: "Application draft needs project evidence and a sharper portfolio link.",
    signal: "deadline Fri",
    detail:
      "Haemologix, the retrieval lab, and your systems notes are the strongest evidence cluster for this role.",
  },
  {
    id: "portfolio",
    label: "Portfolio case study",
    type: "document",
    mode: ["All", "Career"],
    x: 85,
    y: 68,
    weight: 0.38,
    summary: "Needs the Haemologix architecture decision before screenshots make sense.",
    signal: "draft 62%",
    detail:
      "The current draft has strong context but lacks a clear before-and-after of the donor alert interaction.",
  },
  {
    id: "memory",
    label: "Prefers dense briefs",
    type: "memory",
    mode: ["All", "Personal", "Focus"],
    x: 48,
    y: 22,
    weight: 0.33,
    summary: "Remembered from repeated edits to meeting notes and task summaries.",
    signal: "user preference",
    detail:
      "The system stores this as an editable memory so future meeting prep starts compact and evidence-led.",
  },
  {
    id: "idea",
    label: "Relationship-first UI",
    type: "idea",
    mode: ["All", "Personal", "Projects"],
    x: 57,
    y: 78,
    weight: 0.36,
    summary: "A design principle that keeps appearing across product notes.",
    signal: "recurring idea",
    detail:
      "Connected to the Life Canvas concept, portfolio language, and a note about avoiding generic productivity dashboards.",
  },
];

const relations: Relation[] = [
  { from: "haemologix", to: "anika", label: "works with", strength: 0.75 },
  { from: "haemologix", to: "repo", label: "implemented in", strength: 0.82 },
  { from: "haemologix", to: "architecture", label: "defined by", strength: 0.9 },
  { from: "haemologix", to: "task-thresholds", label: "blocked by", strength: 0.88 },
  { from: "haemologix", to: "meeting", label: "discussed in", strength: 0.64 },
  { from: "architecture", to: "task-thresholds", label: "depends on", strength: 0.7 },
  { from: "internship", to: "portfolio", label: "requires", strength: 0.62 },
  { from: "internship", to: "haemologix", label: "evidence", strength: 0.58 },
  { from: "exam", to: "os-notes", label: "revises", strength: 0.68 },
  { from: "memory", to: "meeting", label: "shapes prep", strength: 0.43 },
  { from: "idea", to: "portfolio", label: "appears in", strength: 0.35 },
  { from: "idea", to: "haemologix", label: "frames", strength: 0.4 },
];

const activity: Activity[] = [
  {
    time: "09:14",
    source: "GitHub",
    title: "Notification fallback merged in donor-alert repo",
    cluster: "Haemologix changed significantly today",
  },
  {
    time: "09:32",
    source: "Email",
    title: "Anika asked whether severity copy should mention recency",
    cluster: "Haemologix changed significantly today",
  },
  {
    time: "10:05",
    source: "Calendar",
    title: "Clinical advisor sync moved to tomorrow morning",
    cluster: "Haemologix changed significantly today",
  },
  {
    time: "10:42",
    source: "Document",
    title: "Alert architecture note edited around escalation thresholds",
    cluster: "Haemologix changed significantly today",
  },
  {
    time: "13:10",
    source: "Study",
    title: "Operating systems notebook reopened after 8 days",
    cluster: "Revision risk is narrowing to two topics",
  },
];

const memories = [
  {
    title: "Meeting prep should be brief-first",
    why: "Remembered from three accepted AI rewrites of calendar briefs.",
  },
  {
    title: "Haemologix is a flagship portfolio project",
    why: "Remembered because it is linked to internship evidence and case study drafts.",
  },
  {
    title: "Study work is easier at night when tasks are scoped tightly",
    why: "Remembered from recurring completed study tasks after 8 PM.",
  },
];

const modeBrief: Record<Mode, string> = {
  All: "Three things moved while you were away.",
  Study: "Revision risk is concentrated, not scattered.",
  Projects: "Haemologix has one decision blocking three artifacts.",
  Career: "Your internship evidence is stronger when Haemologix leads.",
  Personal: "Your memories explain how the system adapts.",
  Focus: "Tonight has a clean path: decide, brief, revise.",
};

const entityHue: Record<EntityType, string> = {
  project: "#d4673f",
  person: "#2f7f73",
  document: "#b9964a",
  task: "#a54858",
  event: "#5d77a8",
  repository: "#6f6558",
  idea: "#8a6fb0",
  memory: "#b05b7c",
};

function visibleInMode(entity: Entity, mode: Mode) {
  return mode === "All" || entity.mode.includes(mode);
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("Projects");
  const [selectedId, setSelectedId] = useState("haemologix");
  const [query, setQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);

  const visibleEntities = useMemo(
    () => entities.filter((entity) => visibleInMode(entity, mode)),
    [mode],
  );

  const selected =
    visibleEntities.find((entity) => entity.id === selectedId) ??
    visibleEntities[0] ??
    entities[0];

  const visibleIds = new Set(visibleEntities.map((entity) => entity.id));
  const visibleRelations = relations.filter(
    (relation) => visibleIds.has(relation.from) && visibleIds.has(relation.to),
  );

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entities.slice(0, 6);

    return entities
      .filter((entity) =>
        [entity.label, entity.type, entity.summary, entity.detail, entity.signal]
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 7);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!visibleEntities.some((entity) => entity.id === selectedId)) {
      setSelectedId(visibleEntities[0]?.id ?? "haemologix");
    }
  }, [selectedId, visibleEntities]);

  return (
    <main className="life-os">
      <section className="system-top" aria-label="Current system state">
        <div>
          <p className="kicker">Life Canvas / {mode} mode</p>
          <h1>{modeBrief[mode]}</h1>
        </div>
        <button className="command-button" onClick={() => setCommandOpen(true)}>
          <span>Ask the system</span>
          <kbd>Ctrl K</kbd>
        </button>
      </section>

      <section className="mode-strip" aria-label="Context modes">
        {modes.map((item) => (
          <button
            className={item === mode ? "mode active" : "mode"}
            key={item}
            onClick={() => setMode(item)}
          >
            {item}
          </button>
        ))}
      </section>

      <section className="workspace" aria-label="AI personal operating system">
        <aside className="narrative" aria-label="Context narrative">
          <p className="section-label">Current context</p>
          <h2>{selected.label}</h2>
          <p>{selected.detail}</p>
          <div className="insight-block">
            <span>AI observation</span>
            <strong>{selected.summary}</strong>
          </div>
          <dl className="source-list">
            <div>
              <dt>Memory</dt>
              <dd>Persistent, editable, explainable</dd>
            </div>
            <div>
              <dt>Retrieval</dt>
              <dd>Semantic results ranked by context</dd>
            </div>
            <div>
              <dt>Action policy</dt>
              <dd>Draft freely, confirm before external changes</dd>
            </div>
          </dl>
        </aside>

        <div className="canvas-shell">
          <div className="canvas-header">
            <p className="section-label">Life Canvas</p>
            <span>{visibleEntities.length} objects / {visibleRelations.length} relationships</span>
          </div>
          <div className="life-canvas">
            <svg className="relation-layer" viewBox="0 0 100 100" aria-hidden="true">
              {visibleRelations.map((relation) => {
                const from = entities.find((entity) => entity.id === relation.from);
                const to = entities.find((entity) => entity.id === relation.to);
                if (!from || !to) return null;
                const active = from.id === selected.id || to.id === selected.id;
                return (
                  <line
                    key={`${relation.from}-${relation.to}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className={active ? "active-link" : ""}
                    style={{ opacity: active ? 0.92 : 0.18 + relation.strength * 0.28 }}
                  />
                );
              })}
            </svg>

            {visibleRelations.map((relation) => {
              const from = entities.find((entity) => entity.id === relation.from);
              const to = entities.find((entity) => entity.id === relation.to);
              if (!from || !to) return null;
              const active = from.id === selected.id || to.id === selected.id;
              return (
                <span
                  className={active ? "relation-label active" : "relation-label"}
                  key={relation.label + relation.from}
                  style={{
                    left: `${(from.x + to.x) / 2}%`,
                    top: `${(from.y + to.y) / 2}%`,
                  }}
                >
                  {relation.label}
                </span>
              );
            })}

            {visibleEntities.map((entity) => {
              const active = entity.id === selected.id;
              const related = visibleRelations.some(
                (relation) =>
                  (relation.from === selected.id && relation.to === entity.id) ||
                  (relation.to === selected.id && relation.from === entity.id),
              );
              return (
                <button
                  className={`node ${active ? "selected" : ""} ${related ? "related" : ""}`}
                  key={entity.id}
                  onClick={() => setSelectedId(entity.id)}
                  style={
                    {
                      "--x": `${entity.x}%`,
                      "--y": `${entity.y}%`,
                      "--scale": 0.78 + entity.weight * 0.45,
                      "--node-color": entityHue[entity.type],
                    } as React.CSSProperties
                  }
                  aria-pressed={active}
                >
                  <span className="node-mark" />
                  <span className="node-label">{entity.label}</span>
                  <span className="node-signal">{entity.signal}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="context-panel" aria-label="Entity details">
          <p className="section-label">Object detail</p>
          <div className="object-type">{selected.type}</div>
          <h2>{selected.label}</h2>
          <p>{selected.summary}</p>
          <button
            className="quiet-action"
            onClick={() => {
              setQuery(selected.label);
              setCommandOpen(true);
            }}
          >
            Find related context
          </button>
          <div className="connection-list">
            {visibleRelations
              .filter((relation) => relation.from === selected.id || relation.to === selected.id)
              .map((relation) => {
                const otherId = relation.from === selected.id ? relation.to : relation.from;
                const other = entities.find((entity) => entity.id === otherId);
                if (!other) return null;
                return (
                  <button key={`${relation.from}-${relation.to}`} onClick={() => setSelectedId(other.id)}>
                    <span>{relation.label}</span>
                    <strong>{other.label}</strong>
                  </button>
                );
              })}
          </div>
        </aside>
      </section>

      <section className="lower-system">
        <div className="timeline" aria-label="Intelligent activity timeline">
          <p className="section-label">Activity intelligence</p>
          <h2>Haemologix changed significantly today</h2>
          {activity.map((item) => (
            <button
              className="activity-row"
              key={`${item.time}-${item.title}`}
              onClick={() => setSelectedId(item.cluster.includes("Revision") ? "exam" : "haemologix")}
            >
              <time>{item.time}</time>
              <span>{item.source}</span>
              <strong>{item.title}</strong>
            </button>
          ))}
        </div>

        <div className="memory-panel" aria-label="AI memory">
          <p className="section-label">Inspectable memory</p>
          <h2>What the AI remembers</h2>
          {memories.map((memory) => (
            <div className="memory-row" key={memory.title}>
              <strong>{memory.title}</strong>
              <p>{memory.why}</p>
              <div>
                <button>Edit</button>
                <button>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {commandOpen && (
        <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Global AI command">
          <div className="command-surface">
            <div className="command-input-row">
              <span>AI</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find everything related to my internship applications"
              />
              <button onClick={() => setCommandOpen(false)}>Close</button>
            </div>
            <div className="answer">
              <p className="section-label">Contextual answer</p>
              <strong>
                {query
                  ? `I found ${searchResults.length} connected objects and ranked them by your current ${mode} context.`
                  : "Try asking what changed, what needs attention, or which memory explains a recommendation."}
              </strong>
            </div>
            <div className="search-results">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    setSelectedId(result.id);
                    setCommandOpen(false);
                  }}
                >
                  <span>{result.type}</span>
                  <strong>{result.label}</strong>
                  <small>{result.summary}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
