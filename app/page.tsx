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
  provider?: string | null;
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

type ProviderStatus = {
  provider: string;
  status: string;
  displayName: string | null;
  email: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
};

const modes: Mode[] = ["All", "Study", "Projects", "Career", "Personal", "Focus"];

const demoEntities: Entity[] = [
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

const demoSupportingRecords: Entity[] = [
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

const demoAllRecords = [...demoEntities, ...demoSupportingRecords];

const demoRelations: Relation[] = [
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

const demoActivity: Activity[] = [
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

const demoMemories = [
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

const demoModeBrief: Record<Mode, string> = {
  All: "Three threads moved while you were away.",
  Study: "Quiet Index is ready for retrieval practice.",
  Projects: "Lumen Atlas has one decision blocking four pieces of work.",
  Career: "Northstar and Lumen Atlas make the strongest evidence trail.",
  Personal: "Your memories explain how the system adapts.",
  Focus: "Tonight has a clean path: decide, brief, revise.",
};

const entityHue: Record<EntityType, string> = {
  project: "#a985ff",
  person: "#5ba7ff",
  document: "#54e2c2",
  task: "#ff7ab6",
  event: "#f5b45f",
  repository: "#f8f6ff",
  idea: "#c7b2ff",
  memory: "#8f7cff",
  email: "#72d8ff",
  note: "#d7c9ff",
};

function visibleInMode(entity: Entity, mode: Mode) {
  return mode === "All" || entity.mode.includes(mode);
}

// --- Connected Mode: real data from /api/life --------------------------
// The Life Canvas must never show demo objects once a real source is
// connected. Everything below maps the normalized `entities`/`relationships`
// rows returned by the backend into the shapes the canvas already renders.

type LifeApiEntity = {
  id: string;
  label: string;
  type: string;
  summary: string;
  signal: string;
  detail: string;
  provider?: string | null;
  sourceUrl?: string | null;
};

type LifeApiRelationship = {
  from_entity_id: string;
  to_entity_id: string;
  type: string;
  confidence: number;
};

const knownEntityTypes: EntityType[] = [
  "project",
  "person",
  "document",
  "task",
  "event",
  "repository",
  "idea",
  "memory",
  "email",
  "note",
];

function normalizeEntityType(value: string): EntityType {
  return (knownEntityTypes as string[]).includes(value) ? (value as EntityType) : "document";
}

// Deterministic golden-angle spiral so real objects fill the canvas without
// a layout engine and without ever colliding with fixed demo coordinates.
function spiralPosition(index: number) {
  const angle = index * 137.508 * (Math.PI / 180);
  const radius = 6 + Math.sqrt(index + 1) * 9;
  const clamp = (value: number) => Math.min(92, Math.max(8, value));
  return {
    x: clamp(50 + radius * Math.cos(angle)),
    y: clamp(50 + radius * Math.sin(angle)),
  };
}

function mapLifeEntity(row: LifeApiEntity, index: number): Entity {
  const { x, y } = spiralPosition(index);
  return {
    id: row.id,
    label: row.label,
    type: normalizeEntityType(row.type),
    // Real objects aren't classified into Study/Career/Personal yet, so they
    // stay visible under every mode rather than being fabricated into one.
    mode: ["All"],
    x,
    y,
    weight: Math.max(0.32, 0.85 - index * 0.02),
    summary: row.summary,
    signal: row.signal,
    detail: row.detail,
    provider: row.provider,
  };
}

const emptyConnectedEntity: Entity = {
  id: "empty-state",
  label: "No connected data yet",
  type: "note",
  mode: ["All"],
  x: 50,
  y: 50,
  weight: 0.5,
  summary: "Connect a provider and sync to populate your Life Canvas.",
  signal: "not synced",
  detail:
    "Once a Google or GitHub sync completes, real emails, events, documents, and repositories will appear here as canvas objects.",
};

function NoviMark({ stacked = false }: { stacked?: boolean }) {
  return (
    <span className={stacked ? "novi-lockup stacked" : "novi-lockup"} aria-label="NOVI">
      <span className="novi-mark" aria-hidden="true">
        <span className="mark-piece left" />
        <span className="mark-piece flow" />
        <span className="mark-piece right" />
      </span>
      <span className="novi-word">NOVI</span>
    </span>
  );
}

function sourceLabel(entity: Entity) {
  return entity.provider ?? entity.type;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("Projects");
  const [selectedId, setSelectedId] = useState("lumen-atlas");
  const [query, setQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState<"demo" | "connected">("demo");
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [connectedAnswer, setConnectedAnswer] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [connectedEntities, setConnectedEntities] = useState<Entity[]>([]);
  const [connectedRelations, setConnectedRelations] = useState<Relation[]>([]);
  const [lifeLoaded, setLifeLoaded] = useState(false);

  const isConnected = sourceMode === "connected";

  // The full, unfiltered set of real objects. Used for search, counts, and
  // as the fallback when the current mode/id selection points at nothing.
  const activeEntities = useMemo(() => {
    if (!isConnected) return demoEntities;
    if (connectedEntities.length > 0) return connectedEntities;
    return lifeLoaded ? [emptyConnectedEntity] : [];
  }, [isConnected, connectedEntities, lifeLoaded]);
  const activeRelations = isConnected ? connectedRelations : demoRelations;

  const visibleEntities = useMemo(() => {
    // Real objects have no Study/Career/Personal classification yet, so mode
    // filtering only applies to the demo dataset. Filtering unclassified
    // real data into a mode would mean fabricating a category for it.
    if (isConnected) return activeEntities;
    return demoEntities.filter((entity) => visibleInMode(entity, mode));
  }, [mode, isConnected, activeEntities]);

  const selected =
    visibleEntities.find((entity) => entity.id === selectedId) ??
    visibleEntities[0] ??
    activeEntities[0] ??
    demoEntities[0];

  const visibleIds = new Set(visibleEntities.map((entity) => entity.id));
  const visibleRelations = activeRelations.filter(
    (relation) => visibleIds.has(relation.from) && visibleIds.has(relation.to),
  );

  const relatedEntities = visibleRelations
    .filter((relation) => relation.from === selected.id || relation.to === selected.id)
    .map((relation) => {
      const otherId = relation.from === selected.id ? relation.to : relation.from;
      const other = activeEntities.find((entity) => entity.id === otherId);
      return other ? { relation, entity: other } : null;
    })
    .filter((item): item is { relation: Relation; entity: Entity } => item !== null);

  const attentionItems = isConnected
    ? connectedEntities.slice(0, 5)
    : visibleEntities
        .filter((entity) =>
          /waiting|due|urgent|changed|review|reply|deadline|next|unread|ready/i.test(
            `${entity.signal} ${entity.summary}`,
          ),
        )
        .slice(0, 5);

  const sourceRows = isConnected ? connectedEntities.slice(0, 6) : demoActivity;

  const searchResults = useMemo(() => {
    const source = isConnected ? connectedEntities : demoAllRecords;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return source.slice(0, 8);

    return source
      .filter((entity) =>
        [entity.label, entity.type, entity.summary, entity.detail, entity.signal]
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 9);
  }, [query, isConnected, connectedEntities]);

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
    let cancelled = false;
    fetch("/api/connections/status")
      .then((response) => response.json())
      .then((payload: { mode?: "demo" | "connected"; providers?: ProviderStatus[] }) => {
        if (cancelled) return;
        setSourceMode(payload.mode ?? "demo");
        setProviders(payload.providers ?? []);
      })
      .catch(() => {
        if (!cancelled) setSourceMode("demo");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // connectedEntities/connectedRelations are only ever read when
    // isConnected is true (see activeEntities above), so there's nothing to
    // reset here when disconnected -- just skip fetching.
    if (!isConnected) return;

    let cancelled = false;
    fetch("/api/life")
      .then((response) => response.json())
      .then((payload: { mode?: string; entities?: LifeApiEntity[]; relationships?: LifeApiRelationship[] }) => {
        if (cancelled) return;
        if (payload.mode !== "connected") {
          setConnectedEntities([]);
          setConnectedRelations([]);
          setLifeLoaded(true);
          return;
        }
        const mapped = (payload.entities ?? []).map(mapLifeEntity);
        const mappedIds = new Set(mapped.map((entity) => entity.id));
        const mappedRelations = (payload.relationships ?? [])
          .filter((relation) => mappedIds.has(relation.from_entity_id) && mappedIds.has(relation.to_entity_id))
          .map((relation) => ({
            from: relation.from_entity_id,
            to: relation.to_entity_id,
            label: relation.type,
            strength: relation.confidence,
          }));
        setConnectedEntities(mapped);
        setConnectedRelations(mappedRelations);
        setLifeLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setConnectedEntities([]);
          setConnectedRelations([]);
          setLifeLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
    // Re-fetch after a sync completes (syncNotice changes) so the canvas
    // reflects newly imported objects without requiring a page reload.
  }, [isConnected, syncNotice]);

  const runGoogleSync = () => {
    setSyncNotice("Novi is syncing Google sources...");
    fetch("/api/sync/google", { method: "POST" })
      .then((response) => response.json())
      .then(
        (payload: {
          counts?: { emails: number; events: number; documents: number };
          partialErrors?: string[];
          error?: string;
        }) => {
          if (payload.error) {
            setSyncNotice(payload.error);
            return;
          }
          const counts = payload.counts ?? { emails: 0, events: 0, documents: 0 };
          setSourceMode("connected");
          const base = `Novi imported ${counts.emails} emails, ${counts.events} events, and ${counts.documents} Drive files.`;
          setSyncNotice(
            payload.partialErrors && payload.partialErrors.length > 0
              ? `${base} Some sources need attention: ${payload.partialErrors.join(" | ")}`
              : base,
          );
        },
      )
      .catch(() => setSyncNotice("Google sync failed. Try reconnecting Google."));
  };

  const runGithubSync = () => {
    setSyncNotice("Novi is syncing GitHub sources...");
    fetch("/api/sync/github", { method: "POST" })
      .then((response) => response.json())
      .then(
        (payload: {
          counts?: { repositories: number; issuesAndPRs: number; commits: number };
          partialErrors?: string[];
          error?: string;
        }) => {
          if (payload.error) {
            setSyncNotice(payload.error);
            return;
          }
          const counts = payload.counts ?? { repositories: 0, issuesAndPRs: 0, commits: 0 };
          setSourceMode("connected");
          const base = `Novi imported ${counts.repositories} repositories, ${counts.issuesAndPRs} issues/PRs, and ${counts.commits} commits.`;
          setSyncNotice(
            payload.partialErrors && payload.partialErrors.length > 0
              ? `${base} Some sources need attention: ${payload.partialErrors.join(" | ")}`
              : base,
          );
        },
      )
      .catch(() => setSyncNotice("GitHub sync failed. Try reconnecting GitHub."));
  };

  return (
    <main className="novi-app">
      <nav className="novi-rail" aria-label="Primary navigation">
        <NoviMark />
        <div className="rail-links">
          {["Canvas", "Ask", "Attention", "Projects", "People", "Docs"].map((item) => (
            <button
              className={item === "Canvas" ? "rail-link active" : "rail-link"}
              key={item}
              onClick={() => (item === "Ask" ? setCommandOpen(true) : undefined)}
            >
              <span aria-hidden="true">{item.slice(0, 1)}</span>
              {item}
            </button>
          ))}
        </div>
        <button className="mobile-ask" onClick={() => setCommandOpen(true)} aria-label="Ask Novi">
          <span aria-hidden="true">+</span>
        </button>
      </nav>

      <section className="novi-shell" aria-label="NOVI operating environment">
        <header className="novi-header">
          <div>
            <p className="kicker">{isConnected ? "Connected intelligence" : `${mode} lens`}</p>
            <h1>
              {isConnected
                ? connectedEntities.length > 0
                  ? `Novi understands ${connectedEntities.length} objects from your world.`
                  : "Connect your sources. Novi will build the map."
                : demoModeBrief[mode]}
            </h1>
          </div>
          <button className="command-button" onClick={() => setCommandOpen(true)}>
            <span>Ask Novi</span>
            <kbd>Ctrl K</kbd>
          </button>
        </header>

        <section className="source-bar" aria-label="Connected sources">
          <div>
            <span className="section-label">Sources</span>
            <strong>{sourceMode === "connected" ? "Live canvas" : "Demo isolated"}</strong>
          </div>
          <div className="provider-strip">
            {["google", "github"].map((provider) => {
              const status = providers.find((item) => item.provider === provider);
              const connected = ["syncing", "indexing", "connected", "needs_attention"].includes(
                status?.status ?? "",
              );
              return (
                <a className={connected ? "provider-link connected" : "provider-link"} href={`/api/connect/${provider}`} key={provider}>
                  <span>{provider}</span>
                  <strong>{connected ? status?.status : status?.status ?? "not connected"}</strong>
                </a>
              );
            })}
            {providers.some(
              (item) => item.provider === "google" && ["syncing", "connected", "needs_attention"].includes(item.status),
            ) && (
              <button className="provider-link provider-button connected" onClick={runGoogleSync}>
                <span>Google</span>
                <strong>sync</strong>
              </button>
            )}
            {providers.some(
              (item) => item.provider === "github" && ["syncing", "connected", "needs_attention"].includes(item.status),
            ) && (
              <button className="provider-link provider-button connected" onClick={runGithubSync}>
                <span>GitHub</span>
                <strong>sync</strong>
              </button>
            )}
          </div>
          {syncNotice && <p className="sync-notice">{syncNotice}</p>}
        </section>

        <section className="lens-strip" aria-label="Context lenses">
          {modes.map((item) => (
            <button
              className={item === mode ? "lens active" : "lens"}
              key={item}
              onClick={() => setMode(item)}
            >
              <span>{item}</span>
              <small>{item === "All" ? visibleEntities.length : demoEntities.filter((entity) => visibleInMode(entity, item)).length}</small>
            </button>
          ))}
        </section>

        <section className="world-grid" aria-label="Novi Life Canvas">
          <aside className="context-wing" aria-label="Current context">
            <p className="section-label">Current object</p>
            <h2>{selected.label}</h2>
            <p>{selected.detail}</p>
            <div className="insight-block">
              <span>Novi reading</span>
              <strong>{selected.summary}</strong>
            </div>
            <button
              className="quiet-action"
              onClick={() => {
                setQuery(selected.label);
                setCommandOpen(true);
              }}
            >
              Ask Novi about this
            </button>
          </aside>

          <div className="canvas-stage">
            <div className="canvas-header">
              <div>
                <p className="section-label">Life Canvas</p>
                <strong>{visibleEntities.length} objects / {visibleRelations.length} relationships</strong>
              </div>
              <NoviMark stacked />
            </div>
            <div className="life-canvas">
            <svg className="relation-layer" viewBox="0 0 100 100" aria-hidden="true">
              {visibleRelations.map((relation) => {
                const from = activeEntities.find((entity) => entity.id === relation.from);
                const to = activeEntities.find((entity) => entity.id === relation.to);
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
              const from = activeEntities.find((entity) => entity.id === relation.from);
              const to = activeEntities.find((entity) => entity.id === relation.to);
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

          <aside className="intelligence-wing" aria-label="Attention and related context">
            <div className="attention-panel">
              <p className="section-label">Attention</p>
              <h2>What deserves focus</h2>
              <div className="attention-list">
                {attentionItems.length > 0 ? (
                  attentionItems.map((entity) => (
                    <button className="attention-item" key={entity.id} onClick={() => setSelectedId(entity.id)}>
                      <span>{entity.signal}</span>
                      <strong>{entity.label}</strong>
                      <small>{entity.summary}</small>
                    </button>
                  ))
                ) : (
                  <p className="empty-note">Novi has not found anything that needs attention yet.</p>
                )}
              </div>
            </div>

            <div className="connection-panel">
              <p className="section-label">Connected context</p>
              <div className="connection-list">
                {relatedEntities.length > 0 ? (
                  relatedEntities.map(({ relation, entity }) => (
                    <button key={`${relation.from}-${relation.to}`} onClick={() => setSelectedId(entity.id)}>
                      <span>{relation.label}</span>
                      <strong>{entity.label}</strong>
                    </button>
                  ))
                ) : (
                  <p className="empty-note">Select another object to inspect its relationship trail.</p>
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="lower-system">
          <div className="timeline" aria-label="Source-backed activity">
            <p className="section-label">Activity</p>
            <h2>{isConnected ? "Most recently synced objects" : "Source trail behind the current demo lens"}</h2>
            {sourceRows.map((item) =>
              "id" in item ? (
                <button className="activity-row" key={item.id} onClick={() => setSelectedId(item.id)}>
                  <time>synced</time>
                  <span>{sourceLabel(item)}</span>
                  <strong>{item.label}</strong>
                </button>
              ) : (
                <button className="activity-row" key={`${item.time}-${item.title}`} onClick={() => setSelectedId(item.target)}>
                  <time>{item.time}</time>
                  <span>{item.source}</span>
                  <strong>{item.title}</strong>
                </button>
              ),
            )}
          </div>

          <div className="memory-panel" aria-label="Novi memory">
            <p className="section-label">Memory</p>
            <h2>What Novi can explain</h2>
            {isConnected ? (
              <p className="empty-note">
                Novi will only show memories here when they can be traced to real source-backed behavior.
              </p>
            ) : (
              demoMemories.map((memory) => (
                <div className="memory-row" key={memory.title}>
                  <strong>{memory.title}</strong>
                  <p>{memory.why}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      {commandOpen && (
        <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Ask Novi">
          <div className="command-surface">
            <div className="command-brand">
              <NoviMark />
              <button onClick={() => setCommandOpen(false)}>Close</button>
            </div>
            <div className="command-input-row">
              <span aria-hidden="true">?</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setConnectedAnswer(null);
                }}
                placeholder="What changed today?"
              />
            </div>
            <div className="answer">
              <p className="section-label">Contextual intelligence</p>
              <strong>
                {query
                  ? connectedAnswer ??
                    (sourceMode === "connected"
                      ? "Searching connected sources..."
                      : `Novi found ${searchResults.length} demo objects and ranked them through the ${mode} lens.`)
                  : "Ask what changed, what needs attention, who is waiting, or which source explains a decision."}
              </strong>
            </div>
            {sourceMode === "connected" && query && (
              <button
                className="connected-search"
                onClick={() => {
                  fetch("/api/search", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ query }),
                  })
                    .then((response) => response.json())
                    .then((payload: { answer?: string }) => {
                      setConnectedAnswer(payload.answer ?? "No source-backed answer was returned.");
                    })
                    .catch(() => setConnectedAnswer("Connected search failed. Check source status."));
                }}
              >
                Search connected sources
              </button>
            )}
            <div className="search-results">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    if (activeEntities.some((entity) => entity.id === result.id)) {
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
