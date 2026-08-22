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
  | "memory"
  | "email"
  | "note";

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
  target: string;
};

const modes: Mode[] = ["All", "Study", "Projects", "Career", "Personal", "Focus"];

const entities: Entity[] = [
  {
    id: "lumen-atlas",
    label: "Lumen Atlas",
    type: "project",
    mode: ["All", "Projects", "Career", "Focus"],
    x: 51,
    y: 43,
    weight: 1,
    summary: "Research synthesis, launch planning, and map interaction work converged today.",
    signal: "changed today",
    detail:
      "Three sources now point to one decision: whether the public map should lead with neighborhoods, journeys, or open questions.",
  },
  {
    id: "orbit-studio",
    label: "Orbit Studio",
    type: "project",
    mode: ["All", "Projects", "Personal"],
    x: 75,
    y: 27,
    weight: 0.7,
    summary: "Prototype feedback is ready to become a tighter interaction brief.",
    signal: "review ready",
    detail:
      "A meeting with Theo, two interface notes, and the orbit-core changes all describe the same navigation problem.",
  },
  {
    id: "northstar",
    label: "Northstar",
    type: "project",
    mode: ["All", "Projects", "Career", "Focus"],
    x: 74,
    y: 56,
    weight: 0.68,
    summary: "The release plan is waiting on API reliability and launch copy.",
    signal: "deadline Fri",
    detail:
      "Repository activity, launch notes, and Noor's email all suggest the release brief should be rewritten around risk and confidence.",
  },
  {
    id: "common-ground",
    label: "Common Ground",
    type: "project",
    mode: ["All", "Projects", "Personal"],
    x: 33,
    y: 71,
    weight: 0.58,
    summary: "Community interview notes are turning into a shared vocabulary.",
    signal: "12 notes",
    detail:
      "Mira's interview synthesis, two workshop events, and the glossary draft are now tightly connected.",
  },
  {
    id: "quiet-index",
    label: "Quiet Index",
    type: "project",
    mode: ["All", "Study", "Personal"],
    x: 19,
    y: 51,
    weight: 0.5,
    summary: "Study notes and reading tasks are forming a useful mental model.",
    signal: "study thread",
    detail:
      "The system recommends revisiting the index cards on attention, recall, and spaced retrieval before adding more source material.",
  },
  {
    id: "mira",
    label: "Mira Sen",
    type: "person",
    mode: ["All", "Projects", "Personal"],
    x: 29,
    y: 32,
    weight: 0.58,
    summary: "Leads research synthesis across Lumen Atlas and Common Ground.",
    signal: "2 open asks",
    detail:
      "Mira appears in the workshop, the research synthesis, and the email asking for a sharper participant consent summary.",
  },
  {
    id: "theo",
    label: "Theo Park",
    type: "person",
    mode: ["All", "Projects"],
    x: 86,
    y: 38,
    weight: 0.5,
    summary: "Working through navigation feedback for Orbit Studio.",
    signal: "sent feedback",
    detail:
      "Theo is connected to the orbit-core repository, a prototype review event, and two tasks about keyboard flow.",
  },
  {
    id: "noor",
    label: "Noor Vale",
    type: "person",
    mode: ["All", "Projects", "Career"],
    x: 84,
    y: 69,
    weight: 0.48,
    summary: "Owns launch review questions for Northstar.",
    signal: "waiting reply",
    detail:
      "Noor's latest email references launch notes, API reliability, and a decision log entry about staged rollout.",
  },
  {
    id: "elian",
    label: "Elian Brooks",
    type: "person",
    mode: ["All", "Projects", "Study"],
    x: 23,
    y: 77,
    weight: 0.42,
    summary: "Connects workshop notes to the Quiet Index study thread.",
    signal: "shared notes",
    detail:
      "Elian appears in the reading circle event and the note about translating research questions into study prompts.",
  },
  {
    id: "lumen-web",
    label: "lumen-web",
    type: "repository",
    mode: ["All", "Projects", "Career"],
    x: 65,
    y: 24,
    weight: 0.46,
    summary: "Map filters and source citations changed in the latest branch.",
    signal: "5 commits",
    detail:
      "The commit sequence improves citation surfaces but leaves the neighborhood filter naming unresolved.",
  },
  {
    id: "orbit-core",
    label: "orbit-core",
    type: "repository",
    mode: ["All", "Projects"],
    x: 93,
    y: 22,
    weight: 0.4,
    summary: "Command routing and keyboard traversal were refactored.",
    signal: "merged",
    detail:
      "The repository now matches most of Theo's review notes, except the handoff from search to canvas selection.",
  },
  {
    id: "northstar-api",
    label: "northstar-api",
    type: "repository",
    mode: ["All", "Projects", "Career", "Focus"],
    x: 69,
    y: 76,
    weight: 0.45,
    summary: "Reliability tests are green, but rollout notes still need context.",
    signal: "checks green",
    detail:
      "The API changes close two tasks and create one launch documentation task for the staged rollout.",
  },
  {
    id: "lumen-direction",
    label: "Product direction",
    type: "document",
    mode: ["All", "Projects", "Career"],
    x: 45,
    y: 62,
    weight: 0.62,
    summary: "The strongest story is now civic learning, not data browsing.",
    signal: "edited 10:42",
    detail:
      "This document cites the research synthesis, the Lumen Atlas launch notes, and Mira's workshop summary.",
  },
  {
    id: "research-synthesis",
    label: "Research synthesis",
    type: "document",
    mode: ["All", "Projects", "Study"],
    x: 36,
    y: 45,
    weight: 0.56,
    summary: "Eight interviews cluster around trust, orientation, and proof.",
    signal: "new themes",
    detail:
      "The synthesis connects Lumen Atlas, Common Ground, and a task to rewrite map labels in plainer language.",
  },
  {
    id: "launch-notes",
    label: "Launch notes",
    type: "document",
    mode: ["All", "Projects", "Career", "Focus"],
    x: 63,
    y: 64,
    weight: 0.5,
    summary: "Northstar launch copy should explain staged access before features.",
    signal: "draft 72%",
    detail:
      "Noor's email, the API checklist, and the staged rollout decision all feed this document.",
  },
  {
    id: "architecture-decisions",
    label: "Architecture decisions",
    type: "document",
    mode: ["All", "Projects"],
    x: 59,
    y: 79,
    weight: 0.43,
    summary: "Three decisions explain why Northstar is rolling out gradually.",
    signal: "decision log",
    detail:
      "This document links repository status to product copy so technical confidence can be explained clearly.",
  },
  {
    id: "prototype-review",
    label: "Prototype review",
    type: "event",
    mode: ["All", "Projects", "Focus"],
    x: 78,
    y: 43,
    weight: 0.38,
    summary: "Review notes created two keyboard traversal tasks.",
    signal: "today 15:00",
    detail:
      "Theo's review and the orbit-core refactor should be reconciled before the interaction brief is sent.",
  },
  {
    id: "research-workshop",
    label: "Research workshop",
    type: "event",
    mode: ["All", "Projects", "Personal"],
    x: 24,
    y: 61,
    weight: 0.36,
    summary: "Workshop output is shaping the Common Ground glossary.",
    signal: "tomorrow",
    detail:
      "The workshop is connected to Mira, Elian, the research synthesis, and three follow-up tasks.",
  },
  {
    id: "rewrite-map-labels",
    label: "Rewrite map labels",
    type: "task",
    mode: ["All", "Projects", "Focus"],
    x: 47,
    y: 77,
    weight: 0.43,
    summary: "Blocks the Lumen Atlas product direction draft.",
    signal: "due tomorrow",
    detail:
      "This task matters because research participants described the current labels as accurate but cold.",
  },
  {
    id: "api-brief",
    label: "Prepare API brief",
    type: "task",
    mode: ["All", "Projects", "Career", "Focus"],
    x: 78,
    y: 83,
    weight: 0.4,
    summary: "Turns green checks into language Noor can use in launch review.",
    signal: "next action",
    detail:
      "The brief should cite northstar-api, architecture decisions, and the staged rollout email thread.",
  },
  {
    id: "study-cards",
    label: "Attention study cards",
    type: "note",
    mode: ["All", "Study", "Personal"],
    x: 15,
    y: 33,
    weight: 0.35,
    summary: "The note set is ready for retrieval practice.",
    signal: "opened yesterday",
    detail:
      "The cards connect Quiet Index readings to tomorrow's reading circle and a recurring memory about short evening review.",
  },
  {
    id: "system-memory",
    label: "Prefers decision trails",
    type: "memory",
    mode: ["All", "Personal", "Focus"],
    x: 50,
    y: 19,
    weight: 0.34,
    summary: "Remembered from repeated edits that kept evidence beside recommendations.",
    signal: "preference",
    detail:
      "The memory is editable and explains why the system surfaces decisions, source documents, and blocked tasks together.",
  },
  {
    id: "idea-living-index",
    label: "Living index",
    type: "idea",
    mode: ["All", "Personal", "Projects"],
    x: 58,
    y: 86,
    weight: 0.32,
    summary: "A recurring idea: knowledge should appear where it becomes useful.",
    signal: "recurring idea",
    detail:
      "This idea connects the Life Canvas, product direction, study cards, and notes about contextual search.",
  },
];

const supportingRecords: Entity[] = [
  ...[
    "Mira: clarify consent language",
    "Theo: send keyboard review",
    "Noor: confirm staged rollout",
    "Elian: share reading circle notes",
    "Jules Marin: approve visual QA",
    "Sana Holt: review launch language",
    "Ivo Reed: confirm API status",
    "Cass Lane: add workshop examples",
    "Priya Stone: schedule map critique",
    "Ren Vale: archive old research tags",
    "Mira: participant quotes",
    "Theo: prototype edge cases",
    "Noor: release confidence",
    "Elian: index questions",
    "Sana: copy tightening",
    "Ivo: latency report",
    "Cass: community glossary",
    "Jules: visual notes",
  ].map((label, index) => ({
    id: `email-${index + 1}`,
    label,
    type: "email" as const,
    mode: ["All", index % 3 === 0 ? "Projects" : index % 3 === 1 ? "Focus" : "Personal"] as Mode[],
    x: 8,
    y: 8,
    weight: 0.1,
    summary: `Email thread connected to ${index % 2 === 0 ? "Lumen Atlas" : "Northstar"} decisions.`,
    signal: index < 4 ? "unread" : "filed",
    detail:
      "The thread references a meeting, a source document, and one follow-up task in the fictional workspace.",
  })),
  ...[
    "Clarify map entry hierarchy",
    "Rewrite launch opening",
    "Resolve keyboard traversal",
    "Update source citation format",
    "Send workshop recap",
    "Extract interview themes",
    "Draft staged rollout note",
    "Review API confidence copy",
    "Merge glossary examples",
    "Create reading prompts",
    "Tag old notes",
    "Prepare prototype agenda",
    "Clean research transcript",
    "Confirm visual QA owner",
    "Write orbit handoff",
    "Summarize reading circle",
    "Link decision log",
    "Review neighborhood labels",
    "Close reliability checklist",
    "Create release checklist",
    "Archive stale screenshots",
    "Add accessibility pass",
    "Send context brief",
    "Plan next study block",
  ].map((label, index) => ({
    id: `task-${index + 1}`,
    label,
    type: "task" as const,
    mode: ["All", index % 4 === 0 ? "Focus" : index % 4 === 1 ? "Projects" : index % 4 === 2 ? "Study" : "Career"] as Mode[],
    x: 8,
    y: 8,
    weight: 0.1,
    summary: `Task connected to ${index % 3 === 0 ? "a repository change" : index % 3 === 1 ? "a meeting" : "a document decision"}.`,
    signal: index < 6 ? "active" : "queued",
    detail:
      "The task is intentionally attached to a project, a source, and at least one person so the system can explain why it matters.",
  })),
  ...[
    "Lumen map rationale",
    "Common Ground glossary",
    "Orbit keyboard brief",
    "Northstar release plan",
    "Reading circle packet",
    "Interview transcript A",
    "Interview transcript B",
    "Workshop synthesis",
    "Source citation rules",
    "Visual QA checklist",
    "Project pulse memo",
    "Decision review",
    "Reliability summary",
    "Access model notes",
    "Launch copy variants",
  ].map((label, index) => ({
    id: `doc-${index + 1}`,
    label,
    type: "document" as const,
    mode: ["All", index % 2 === 0 ? "Projects" : "Study"] as Mode[],
    x: 8,
    y: 8,
    weight: 0.1,
    summary: `Document indexed with ${index + 2} related entities.`,
    signal: index < 5 ? "recent" : "indexed",
    detail:
      "The document contains decisions, people mentions, and follow-up work used by semantic search.",
  })),
  ...[
    "Map critique",
    "Launch review",
    "Reading circle",
    "Prototype walkthrough",
    "Research debrief",
    "API checkpoint",
    "Community workshop",
    "Copy review",
    "Source audit",
    "Project planning",
  ].map((label, index) => ({
    id: `event-${index + 1}`,
    label,
    type: "event" as const,
    mode: ["All", index % 2 === 0 ? "Projects" : "Focus"] as Mode[],
    x: 8,
    y: 8,
    weight: 0.1,
    summary: `Calendar event connected to ${index % 2 === 0 ? "project work" : "review decisions"}.`,
    signal: index < 3 ? "upcoming" : "logged",
    detail:
      "The event references attendees, preparation notes, and resulting tasks in the demo graph.",
  })),
  ...[
    "Context over chronology",
    "Proof before polish",
    "Small rituals compound",
    "Interfaces should remember",
    "Every launch needs an exit ramp",
    "Search is a mode switch",
    "Decisions age without owners",
  ].map((label, index) => ({
    id: `idea-${index + 1}`,
    label,
    type: "idea" as const,
    mode: ["All", "Personal"] as Mode[],
    x: 8,
    y: 8,
    weight: 0.1,
    summary: "Idea connected to notes, project language, and memory patterns.",
    signal: "idea",
    detail:
      "The idea is deliberately cross-linked so it can surface in project, study, and personal contexts.",
  })),
  ...[
    "Short evening review works best",
    "Launch briefs should show risk plainly",
    "Prefers source links beside summaries",
    "Meeting notes should end with decisions",
  ].map((label, index) => ({
    id: `memory-${index + 1}`,
    label,
    type: "memory" as const,
    mode: ["All", "Personal", "Focus"] as Mode[],
    x: 8,
    y: 8,
    weight: 0.1,
    summary: "Inspectable memory with an explicit reason.",
    signal: "memory",
    detail:
      "The memory can be edited or deleted, and the interface explains why it affects recommendations.",
  })),
];

const allRecords = [...entities, ...supportingRecords];

const relations: Relation[] = [
  { from: "lumen-atlas", to: "mira", label: "researched with", strength: 0.84 },
  { from: "lumen-atlas", to: "lumen-web", label: "implemented in", strength: 0.82 },
  { from: "lumen-atlas", to: "lumen-direction", label: "defined by", strength: 0.9 },
  { from: "lumen-atlas", to: "research-synthesis", label: "informed by", strength: 0.78 },
  { from: "lumen-atlas", to: "rewrite-map-labels", label: "blocked by", strength: 0.86 },
  { from: "orbit-studio", to: "theo", label: "reviewed by", strength: 0.72 },
  { from: "orbit-studio", to: "orbit-core", label: "runs on", strength: 0.76 },
  { from: "orbit-studio", to: "prototype-review", label: "discussed in", strength: 0.68 },
  { from: "northstar", to: "noor", label: "reviewed by", strength: 0.7 },
  { from: "northstar", to: "northstar-api", label: "depends on", strength: 0.88 },
  { from: "northstar", to: "launch-notes", label: "launched through", strength: 0.8 },
  { from: "northstar", to: "api-brief", label: "needs", strength: 0.74 },
  { from: "northstar-api", to: "architecture-decisions", label: "explained by", strength: 0.7 },
  { from: "common-ground", to: "mira", label: "facilitated by", strength: 0.62 },
  { from: "common-ground", to: "elian", label: "notes from", strength: 0.56 },
  { from: "common-ground", to: "research-workshop", label: "produces", strength: 0.66 },
  { from: "quiet-index", to: "study-cards", label: "studied through", strength: 0.68 },
  { from: "quiet-index", to: "elian", label: "discussed with", strength: 0.44 },
  { from: "system-memory", to: "api-brief", label: "shapes", strength: 0.46 },
  { from: "idea-living-index", to: "lumen-direction", label: "appears in", strength: 0.52 },
  { from: "idea-living-index", to: "study-cards", label: "echoes", strength: 0.42 },
];

const activity: Activity[] = [
  {
    time: "09:14",
    source: "GitHub",
    title: "lumen-web changed source citation behavior",
    cluster: "Lumen Atlas changed significantly today",
    target: "lumen-atlas",
  },
  {
    time: "09:32",
    source: "Email",
    title: "Mira asked for clearer participant consent language",
    cluster: "Lumen Atlas changed significantly today",
    target: "mira",
  },
  {
    time: "10:05",
    source: "Calendar",
    title: "Prototype review moved after Theo's keyboard notes",
    cluster: "Orbit Studio needs interaction cleanup",
    target: "orbit-studio",
  },
  {
    time: "10:42",
    source: "Document",
    title: "Product direction reframed the map around civic learning",
    cluster: "Lumen Atlas changed significantly today",
    target: "lumen-direction",
  },
  {
    time: "13:10",
    source: "Study",
    title: "Attention study cards reopened after the reading circle",
    cluster: "Quiet Index is ready for retrieval practice",
    target: "quiet-index",
  },
  {
    time: "15:26",
    source: "GitHub",
    title: "northstar-api reliability checks passed",
    cluster: "Northstar release confidence improved",
    target: "northstar",
  },
];

const memories = [
  {
    title: "Meeting notes should end with decisions",
    why: "Remembered from accepted edits that moved next steps out of prose and into explicit decision trails.",
  },
  {
    title: "Launch briefs should show confidence and risk together",
    why: "Remembered from repeated revisions to release notes and stakeholder summaries.",
  },
  {
    title: "Short evening review works best",
    why: "Remembered from completed study blocks that used three focused prompts instead of long reading lists.",
  },
  {
    title: "Source links belong beside summaries",
    why: "Remembered because recommendations were kept only when their source documents were visible.",
  },
];

const modeBrief: Record<Mode, string> = {
  All: "Three threads moved while you were away.",
  Study: "Quiet Index is ready for retrieval practice.",
  Projects: "Lumen Atlas has one decision blocking four pieces of work.",
  Career: "Northstar and Lumen Atlas make the strongest evidence trail.",
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
  email: "#4f877f",
  note: "#8f7d47",
};

const counts = {
  projects: 5,
  people: 8,
  documents: 18,
  tasks: 26,
  emails: 18,
  events: 12,
  repositories: 4,
  notes: 14,
  ideas: 8,
  memories: 5,
};

function visibleInMode(entity: Entity, mode: Mode) {
  return mode === "All" || entity.mode.includes(mode);
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("Projects");
  const [selectedId, setSelectedId] = useState("lumen-atlas");
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
    if (!normalized) return allRecords.slice(0, 8);

    return allRecords
      .filter((entity) =>
        [entity.label, entity.type, entity.summary, entity.detail, entity.signal]
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 9);
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
      setSelectedId(visibleEntities[0]?.id ?? "lumen-atlas");
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
              <dt>Graph</dt>
              <dd>{counts.projects} projects, {counts.people} people, {counts.documents} documents</dd>
            </div>
            <div>
              <dt>Work</dt>
              <dd>{counts.tasks} tasks, {counts.emails} emails, {counts.events} events</dd>
            </div>
            <div>
              <dt>Memory</dt>
              <dd>{counts.notes} notes, {counts.ideas} ideas, {counts.memories} memories</dd>
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
          <h2>Lumen Atlas changed significantly today</h2>
          {activity.map((item) => (
            <button
              className="activity-row"
              key={`${item.time}-${item.title}`}
              onClick={() => setSelectedId(item.target)}
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
                placeholder="Find everything related to the Northstar launch"
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
                    if (entities.some((entity) => entity.id === result.id)) {
                      setSelectedId(result.id);
                    }
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
