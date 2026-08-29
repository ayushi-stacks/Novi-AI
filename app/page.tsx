"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  BarChart3,
  CalendarDays,
  CheckSquare,
  CircleHelp,
  Cloud,
  Code2,
  Database,
  FileText,
  FolderKanban,
  Github,
  House,
  LogIn,
  LogOut,
  Network,
  Notebook,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";

type Mode = "All" | "Study" | "Projects" | "Career" | "Personal" | "Focus";
type ActiveView =
  | "Home"
  | "Canvas"
  | "Projects"
  | "Sources"
  | "People"
  | "Calendar"
  | "Tasks"
  | "Docs"
  | "Insights"
  | "Settings"
  | "Help";
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
  sourceUrl?: string | null;
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

type AuthUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

type ProviderName = "google" | "github";

type ProviderReadiness = Record<ProviderName, boolean>;

const modes: Mode[] = ["All", "Study", "Projects", "Career", "Personal", "Focus"];
const navItems = [
  { label: "Home" as const, icon: House },
  { label: "Canvas" as const, icon: Network },
  { label: "Projects" as const, icon: FolderKanban },
  { label: "Sources" as const, icon: Database },
  { label: "People" as const, icon: Users },
  { label: "Calendar" as const, icon: CalendarDays },
  { label: "Tasks" as const, icon: CheckSquare },
  { label: "Docs" as const, icon: Notebook },
  { label: "Insights" as const, icon: BarChart3 },
  { label: "Settings" as const, icon: Settings },
  { label: "Help" as const, icon: CircleHelp },
];

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
    sourceUrl: row.sourceUrl,
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

function providerIsConnected(status?: string | null) {
  return ["syncing", "indexing", "connected", "needs_attention"].includes(status ?? "");
}

function providerStatusLabel(status: string) {
  if (status === "not_connected" || status === "disconnected") return "Not connected";
  if (status === "needs_attention") return "Needs attention";
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function viewMatchesEntity(view: ActiveView, entity: Entity) {
  if (view === "Projects") return entity.type === "project" || entity.type === "repository";
  if (view === "Sources") return Boolean(entity.provider);
  if (view === "People") return entity.type === "person" || entity.type === "email";
  if (view === "Calendar") return entity.type === "event";
  if (view === "Tasks") return entity.type === "task";
  if (view === "Docs") return entity.type === "document" || entity.type === "note";
  return true;
}

function EntityGlyph({ type }: { type: EntityType }) {
  if (type === "repository") return <Code2 aria-hidden="true" />;
  if (type === "event") return <CalendarDays aria-hidden="true" />;
  if (type === "task") return <CheckSquare aria-hidden="true" />;
  if (type === "person" || type === "email") return <User aria-hidden="true" />;
  if (type === "project") return <FolderKanban aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}

export default function Home() {
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [guestPreview, setGuestPreview] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [readiness, setReadiness] = useState<ProviderReadiness>({ google: false, github: false });
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [syncingProvider, setSyncingProvider] = useState<ProviderName | null>(null);
  const autoSyncStarted = useRef(false);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<Mode>("Projects");
  const [activeView, setActiveView] = useState<ActiveView>("Home");
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
  const hasConnection = providers.some((provider) => providerIsConnected(provider.status));
  const showOnboarding = Boolean(viewer && connectionsLoaded && !hasConnection && !setupDismissed);

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

  const focusEntities = visibleEntities.filter((entity) => viewMatchesEntity(activeView, entity)).slice(0, 24);

  const viewTitle =
    activeView === "Home" || activeView === "Canvas"
      ? "Life Canvas"
      : activeView === "Sources"
        ? "Connected sources"
        : activeView === "Docs"
          ? "Documents and notes"
          : activeView;

  const canvasPositions = [
    { x: 50, y: 50 },
    { x: 50, y: 18 },
    { x: 76, y: 34 },
    { x: 76, y: 68 },
    { x: 50, y: 83 },
    { x: 24, y: 68 },
    { x: 24, y: 34 },
  ];
  const canvasEntities = [selected, ...visibleEntities.filter((entity) => entity.id !== selected.id)]
    .slice(0, canvasPositions.length)
    .map((entity, index) => ({ ...entity, ...canvasPositions[index] }));
  const canvasIds = new Set(canvasEntities.map((entity) => entity.id));
  const canvasRelations = visibleRelations.filter(
    (relation) => canvasIds.has(relation.from) && canvasIds.has(relation.to),
  );

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

  const refreshConnections = useCallback(async () => {
    try {
      const response = await fetch("/api/connections/status");
      const payload = (await response.json()) as {
        mode?: "demo" | "connected";
        providers?: ProviderStatus[];
      };
      setSourceMode(payload.mode ?? "demo");
      setProviders(payload.providers ?? []);
    } catch {
      setSourceMode("demo");
    } finally {
      setConnectionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/me").then((response) => response.json()),
      fetch("/api/connections/readiness").then((response) => response.json()),
    ])
      .then(([identity, connectorReadiness]: [
        { authenticated?: boolean; user?: AuthUser | null },
        { providers?: Partial<ProviderReadiness> },
      ]) => {
        if (cancelled) return;
        setViewer(identity.authenticated ? identity.user ?? null : null);
        setReadiness({
          google: Boolean(connectorReadiness.providers?.google),
          github: Boolean(connectorReadiness.providers?.github),
        });
        setSetupDismissed(window.localStorage.getItem("novi-setup-dismissed") === "true");
      })
      .catch(() => {
        if (!cancelled) setViewer(null);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    queueMicrotask(() => void refreshConnections());
    return () => {
      cancelled = true;
    };
  }, [refreshConnections]);

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

  const runProviderSync = useCallback(
    async (provider: ProviderName) => {
      setSyncingProvider(provider);
      setSyncNotice(`Novi is importing your ${provider === "github" ? "GitHub" : "Google"} activity...`);
      setProviders((current) =>
        current.map((item) => (item.provider === provider ? { ...item, status: "syncing" } : item)),
      );

      try {
        const response = await fetch(`/api/sync/${provider}`, { method: "POST" });
        const payload = (await response.json().catch(() => ({}))) as {
          counts?: Record<string, number>;
          partialErrors?: string[];
          error?: string;
        };
        if (!response.ok || payload.error) {
          throw new Error(payload.error ?? `${provider} sync failed.`);
        }

        const counts = payload.counts ?? {};
        const imported = Object.values(counts).reduce((total, count) => total + count, 0);
        setSourceMode("connected");
        setSyncNotice(
          payload.partialErrors?.length
            ? `Imported ${imported} items. ${payload.partialErrors.join(" ")}`
            : `Imported ${imported} ${provider === "github" ? "GitHub" : "Google"} items. Your canvas is up to date.`,
        );
      } catch (error) {
        setSyncNotice(error instanceof Error ? error.message : `${provider} sync failed. Please reconnect.`);
      } finally {
        setSyncingProvider(null);
        await refreshConnections();
      }
    },
    [refreshConnections],
  );

  const disconnectProvider = async (provider: ProviderName) => {
    const label = provider === "github" ? "GitHub" : "Google";
    if (!window.confirm(`Disconnect ${label} from Novi? Your imported items will stay visible.`)) return;

    setSyncNotice(`Disconnecting ${label}...`);
    const response = await fetch("/api/connections/disconnect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSyncNotice(response.ok ? `${label} disconnected.` : payload.error ?? `Could not disconnect ${label}.`);
    await refreshConnections();
  };

  useEffect(() => {
    if (!viewer || !connectionsLoaded || autoSyncStarted.current) return;
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("connected");
    if (params.get("sync") !== "1" || (provider !== "google" && provider !== "github")) return;

    autoSyncStarted.current = true;
    window.history.replaceState({}, "", window.location.pathname);
    queueMicrotask(() => void runProviderSync(provider));
  }, [connectionsLoaded, runProviderSync, viewer]);

  const enterDemo = () => {
    setSetupDismissed(true);
    window.localStorage.setItem("novi-setup-dismissed", "true");
  };

  if (authLoading) {
    return (
      <main className="auth-screen auth-loading" aria-label="Loading Novi">
        <NoviMark stacked />
        <span>Preparing your canvas...</span>
      </main>
    );
  }

  if (!viewer && !guestPreview) {
    return (
      <main className="auth-screen">
        <div className="auth-canvas" aria-hidden="true">
          <span className="auth-orbit orbit-one" />
          <span className="auth-orbit orbit-two" />
          <span className="auth-node node-one" />
          <span className="auth-node node-two" />
          <span className="auth-node node-three" />
          <span className="auth-node node-four" />
        </div>
        <header className="auth-brand"><NoviMark /></header>
        <section className="auth-content">
          <p className="kicker">Your world, understood</p>
          <h1>One calm place for the work scattered across your tools.</h1>
          <p className="auth-copy">
            Sign in to build a private, source-backed view of your projects, documents, people, and recent work.
          </p>
          <div className="auth-actions">
            <a className="primary-action" href="/signin-with-chatgpt?return_to=%2F">
              <LogIn size={18} aria-hidden="true" />
              Sign in to Novi
            </a>
            <button className="secondary-action" onClick={() => setGuestPreview(true)}>
              Explore the demo
            </button>
          </div>
          <p className="auth-footnote">Your connected data stays separated by account. Novi only requests read access.</p>
        </section>
      </main>
    );
  }

  if (showOnboarding) {
    return (
      <main className="setup-screen">
        <header className="setup-header">
          <NoviMark />
          <div className="setup-account">
            <span>{viewer?.displayName}</span>
            <a href="/signout-with-chatgpt?return_to=%2F">Sign out</a>
          </div>
        </header>
        <section className="setup-content">
          <p className="kicker">Welcome to Novi</p>
          <h1>Start with the place where your work already lives.</h1>
          <p className="setup-copy">
            Connect one source and Novi will import recent activity automatically. You can add or remove sources at any time.
          </p>
          <div className="setup-grid">
            <article className="setup-option featured">
              <Github size={28} aria-hidden="true" />
              <div>
                <span className="section-label">Recommended</span>
                <h2>GitHub</h2>
                <p>Bring in public repositories, issues, pull requests, and recent commits.</p>
              </div>
              {readiness.github ? (
                <a className="primary-action" href="/api/connect/github">
                  Connect GitHub <span aria-hidden="true">&rarr;</span>
                </a>
              ) : (
                <button className="primary-action" disabled>GitHub setup in progress</button>
              )}
              <small>Read-only public activity. Novi cannot change your code.</small>
            </article>
            <article className="setup-option">
              <Cloud size={28} aria-hidden="true" />
              <div>
                <span className="section-label">Optional</span>
                <h2>Google</h2>
                <p>Add recent Gmail, Calendar events, and Drive documents.</p>
              </div>
              {readiness.google ? (
                <a className="secondary-action" href="/api/connect/google">Connect Google</a>
              ) : (
                <button className="secondary-action" disabled>Google unavailable</button>
              )}
              <small>Read-only access. Disconnect whenever you like.</small>
            </article>
          </div>
          <button className="demo-link" onClick={enterDemo}>Continue with sample data</button>
        </section>
      </main>
    );
  }

  return (
    <main className={guestPreview ? "novi-app reference-app guest-preview" : "novi-app reference-app"}>
      <nav className="novi-rail" aria-label="Primary navigation">
        <NoviMark />
        <div className="rail-links">
          {navItems.map((item) => (
            <button
              className={item.label === activeView ? "rail-link active" : "rail-link"}
              key={item.label}
              onClick={() => {
                setActiveView(item.label);
                if (item.label === "Projects") setMode("Projects");
              }}
            >
              <item.icon size={17} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
        <div className="rail-account">
          {viewer ? (
            <>
              <button className="account-button" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen}>
                <span><User size={16} aria-hidden="true" /></span>
                <span className="account-copy"><strong>{viewer.displayName}</strong><small>{viewer.email}</small></span>
              </button>
              {accountOpen && (
                <div className="account-menu">
                  <strong>{viewer.displayName}</strong>
                  <small>{viewer.email}</small>
                  <a href="/signout-with-chatgpt?return_to=%2F"><LogOut size={15} aria-hidden="true" /> Sign out</a>
                </div>
              )}
            </>
          ) : (
            <a className="account-button" href="/signin-with-chatgpt?return_to=%2F">
              <span><LogIn size={16} aria-hidden="true" /></span>
              <span className="account-copy"><strong>Sign in</strong><small>Save your canvas</small></span>
            </a>
          )}
        </div>
        <button className="mobile-ask" onClick={() => setCommandOpen(true)} aria-label="Ask Novi">
          <Sparkles size={20} aria-hidden="true" />
        </button>
      </nav>

      <section className="novi-shell" data-view={activeView} aria-label="NOVI operating environment">
        {guestPreview && (
          <div className="demo-banner">
            <span><Sparkles size={15} aria-hidden="true" /> You are exploring sample data.</span>
            <a href="/signin-with-chatgpt?return_to=%2F">Sign in to connect your work</a>
          </div>
        )}
        <header className="novi-header reference-header">
          <div className="reference-brand">
            <NoviMark />
            <div>
              <h1>NOVI</h1>
              <p>Your world, understood.</p>
            </div>
          </div>
          <button className="command-button" onClick={() => setCommandOpen(true)} aria-label="Ask Novi">
            <Search size={16} aria-hidden="true" />
            <span>Ask Novi</span>
            <kbd>Ctrl K</kbd>
          </button>
        </header>

        <section className="source-bar" aria-label="Connected sources">
          <div>
            <span className="section-label">Sources</span>
            <strong>{sourceMode === "connected" ? "Your connected world" : "Demo workspace"}</strong>
          </div>
          <div className="provider-strip">
            {(["github", "google"] as ProviderName[]).map((provider) => {
              const status = providers.find((item) => item.provider === provider);
              const providerStatus = status?.status ?? "not_connected";
              const connected = providerIsConnected(status?.status);
              const canSync = ["connected", "needs_attention"].includes(providerStatus);
              const busy = syncingProvider === provider || ["syncing", "indexing", "authorizing", "connecting"].includes(providerStatus);
              const ProviderIcon = provider === "github" ? Github : Cloud;
              const providerName = provider === "github" ? "GitHub" : "Google";

              return (
                <div className={connected ? "provider-tile connected" : "provider-tile"} key={provider}>
                  <div className="provider-identity">
                    <ProviderIcon size={19} aria-hidden="true" />
                    <span><strong>{providerName}</strong><small>{status?.email ?? status?.displayName ?? providerStatusLabel(providerStatus)}</small></span>
                  </div>
                  <div className="provider-actions">
                    {connected ? (
                      <>
                        <button disabled={busy || !canSync} onClick={() => void runProviderSync(provider)}>
                          {busy ? <RefreshCw className="spin" size={15} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
                          {busy ? "Importing" : canSync ? "Sync" : providerStatusLabel(providerStatus)}
                        </button>
                        <button className="icon-action" onClick={() => void disconnectProvider(provider)} aria-label={`Disconnect ${providerName}`} title={`Disconnect ${providerName}`}>
                          <X size={15} aria-hidden="true" />
                        </button>
                      </>
                    ) : viewer ? (
                      readiness[provider] ? (
                        <a href={`/api/connect/${provider}`}>{providerStatus === "error" ? "Reconnect" : "Connect"}</a>
                      ) : (
                        <button disabled>Setup needed</button>
                      )
                    ) : (
                      <a href="/signin-with-chatgpt?return_to=%2F">Sign in</a>
                    )}
                  </div>
                  {status?.errorMessage && <p className="provider-error">{status.errorMessage}</p>}
                </div>
              );
            })}
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

        {activeView === "Home" || activeView === "Canvas" ? (
          <>
        <section className="world-grid" aria-label="Novi Life Canvas">
          <aside className="context-wing" aria-label="Current context">
            <p className="section-label">Project overview</p>
            <h2>{selected.label}</h2>
            <p>{selected.summary}</p>
            <div className="project-stats" aria-label="Project statistics">
              <span><strong>{visibleEntities.filter((entity) => entity.type === "repository").length}</strong>Repos</span>
              <span><strong>{visibleEntities.filter((entity) => entity.type === "task").length}</strong>Tasks</span>
              <span><strong>{visibleEntities.filter((entity) => entity.type === "person").length}</strong>People</span>
            </div>
            <div className="activity-sparkline">
              <span><ActivityIcon size={14} aria-hidden="true" /> Activity</span>
              <svg viewBox="0 0 240 48" preserveAspectRatio="none" aria-hidden="true">
                <polyline points="0,37 28,31 54,34 81,20 108,25 136,12 164,22 190,10 218,15 240,5" />
              </svg>
            </div>
            <button
              className="quiet-action"
              onClick={() => {
                setQuery(selected.label);
                setCommandOpen(true);
              }}
            >
                Ask about this project
            </button>
            {selected.sourceUrl && (
              <a className="source-action" href={selected.sourceUrl} target="_blank" rel="noreferrer">
                Open original source <span aria-hidden="true">&rarr;</span>
              </a>
            )}
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
            {canvasEntities.slice(1).map((entity, index) => (
              <span
                className="canvas-spoke"
                key={`spoke-${entity.id}`}
                style={{ "--spoke-angle": `${index * 60 - 90}deg` } as React.CSSProperties}
                aria-hidden="true"
              />
            ))}
            <svg className="relation-layer" viewBox="0 0 100 100" aria-hidden="true">
              {canvasRelations.map((relation) => {
                const from = canvasEntities.find((entity) => entity.id === relation.from);
                const to = canvasEntities.find((entity) => entity.id === relation.to);
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

            {canvasRelations.map((relation) => {
              const from = canvasEntities.find((entity) => entity.id === relation.from);
              const to = canvasEntities.find((entity) => entity.id === relation.to);
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

            {canvasEntities.map((entity) => {
              const active = entity.id === selected.id;
              const related = canvasRelations.some(
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
                  <span className="node-mark"><EntityGlyph type={entity.type} /></span>
                  <span className="node-label">{entity.label}</span>
                  <span className="node-signal">{entity.signal}</span>
                </button>
              );
            })}
          </div>
          </div>

          <aside className="intelligence-wing" aria-label="Attention and related context">
            <div className="attention-panel">
              <p className="section-label">Recent activity</p>
              <h2>While you were away</h2>
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
              <p className="section-label">Insights</p>
              <h2>Signals across your world</h2>
              <div className="insight-bars">
                <button onClick={() => setActiveView("Projects")}><span>Project momentum</span><strong>84%</strong><i style={{ width: "84%" }} /></button>
                <button onClick={() => setActiveView("Tasks")}><span>Task completion</span><strong>68%</strong><i style={{ width: "68%" }} /></button>
                <button onClick={() => setActiveView("People")}><span>Team activity</span><strong>76%</strong><i style={{ width: "76%" }} /></button>
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
          </>
        ) : (
          <section className="focus-view" aria-label={`${viewTitle} view`}>
            <div className="focus-heading">
              <div>
                <p className="section-label">{activeView}</p>
                <h2>{viewTitle}</h2>
              </div>
              <button className="quiet-action compact" onClick={() => setCommandOpen(true)}>
                Ask Novi
              </button>
            </div>
            {activeView === "Insights" ? (
              <div className="summary-grid">
                <article><BarChart3 aria-hidden="true" /><span>Active objects</span><strong>{visibleEntities.length}</strong><p>Items Novi can place in context.</p></article>
                <article><Network aria-hidden="true" /><span>Relationships</span><strong>{visibleRelations.length}</strong><p>Source-backed connections in this lens.</p></article>
                <article><ActivityIcon aria-hidden="true" /><span>Needs attention</span><strong>{attentionItems.length}</strong><p>Signals that may deserve a response.</p></article>
              </div>
            ) : activeView === "Settings" ? (
              <div className="settings-grid">
                <article>
                  <User aria-hidden="true" />
                  <span>Account</span>
                  <strong>{viewer?.displayName ?? "Demo visitor"}</strong>
                  <p>{viewer?.email ?? "Sign in to keep your own workspace."}</p>
                  {viewer ? <a href="/signout-with-chatgpt?return_to=%2F">Sign out</a> : <a href="/signin-with-chatgpt?return_to=%2F">Sign in</a>}
                </article>
                <article>
                  <Database aria-hidden="true" />
                  <span>Connections</span>
                  <strong>{providers.filter((provider) => providerIsConnected(provider.status)).length} active</strong>
                  <p>Manage GitHub and Google from the Sources panel.</p>
                  <button onClick={() => setActiveView("Sources")}>Open sources</button>
                </article>
              </div>
            ) : activeView === "Help" ? (
              <div className="settings-grid">
                <article><Search aria-hidden="true" /><span>Ask Novi</span><strong>Search your context</strong><p>Find an object or ask what changed.</p><button onClick={() => setCommandOpen(true)}>Open search</button></article>
                <article><Github aria-hidden="true" /><span>GitHub</span><strong>Connect safely</strong><p>Novi imports read-only public repository activity.</p>{viewer ? <a href="/api/connect/github">Connect GitHub</a> : <a href="/signin-with-chatgpt?return_to=%2F">Sign in first</a>}</article>
              </div>
            ) : (
            <div className="object-grid">
              {focusEntities.length > 0 ? (
                focusEntities.map((entity) => (
                  <button
                    className={entity.id === selected.id ? "object-card selected" : "object-card"}
                    key={entity.id}
                    onClick={() => setSelectedId(entity.id)}
                  >
                    <span>{sourceLabel(entity)}</span>
                    <strong>{entity.label}</strong>
                    <small>{entity.summary}</small>
                  </button>
                ))
              ) : (
                <p className="empty-note">Nothing in this view yet. Connect and sync sources to let Novi fill it in.</p>
              )}
            </div>
            )}
          </section>
        )}
      </section>

      {commandOpen && (
        <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Ask Novi">
          <div className="command-surface">
            <div className="command-brand">
              <NoviMark />
              <button onClick={() => setCommandOpen(false)} aria-label="Close" title="Close">
                <X size={18} aria-hidden="true" />
              </button>
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
                      ? `Novi found ${searchResults.length} matching indexed objects below. Use connected search for a source-backed answer.`
                      : `Novi found ${searchResults.length} demo objects and ranked them through the ${mode} lens.`)
                  : "Ask what changed, what needs attention, who is waiting, or which source explains a decision."}
              </strong>
            </div>
            {sourceMode === "connected" && query && (
              <button
                className="connected-search"
                disabled={searching}
                onClick={() => {
                  setSearching(true);
                  setConnectedAnswer("Searching connected sources...");
                  fetch("/api/search", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ query }),
                  })
                    .then(async (response) => {
                      const payload = (await response.json().catch(() => ({}))) as { answer?: string; error?: string };
                      if (!response.ok) {
                        throw new Error(payload.error ?? "Connected search is unavailable right now.");
                      }
                      return payload;
                    })
                    .then((payload) => {
                      setConnectedAnswer(payload.answer ?? "No source-backed answer was returned.");
                    })
                    .catch((error: Error) => setConnectedAnswer(error.message))
                    .finally(() => setSearching(false));
                }}
              >
                {searching ? <RefreshCw className="spin" size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
                {searching ? "Searching" : "Search connected sources"}
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
