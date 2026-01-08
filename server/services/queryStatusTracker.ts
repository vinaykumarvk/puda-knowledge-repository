/**
 * Query Status Tracker
 *
 * Tracks processing status of queries with mode-aware timing.
 * Concise: 8s steps for phases 1-8.
 * Balanced: 12s steps for phases 1-8.
 */

export interface QueryStatus {
  queryId: string;
  startTime: number;
  phase: number;
  phaseName: string;
  message: string;
  extendedWaitMessage?: string;
  completed: boolean;
  error?: string;
  result?: any;
  threadId?: number;
}

type Mode = "concise" | "balanced" | string | undefined;

const STATUS_PHASE_TEMPLATE = [
  { phase: 1, name: "analyzing",     message: "🔍 Analyzing your question..." },
  { phase: 2, name: "step_back",     message: "🧠 Step-back thinking - understanding context..." },
  { phase: 3, name: "dimensions",    message: "📊 Identifying key dimensions and intent..." },
  { phase: 4, name: "expanding",     message: "🔗 Expanding entities through knowledge graph..." },
  { phase: 5, name: "subqueries",    message: "📝 Formulating subqueries to cover all key dimensions..." },
  { phase: 6, name: "collecting",    message: "📥 Collecting responses to all subqueries..." },
  { phase: 7, name: "synthesizing",  message: "✨ Synthesizing final answer..." },
  { phase: 8, name: "constructing",  message: "📄 Constructing final response..." },
];

function buildPhases(stepSeconds: number) {
  return STATUS_PHASE_TEMPLATE.map((p, idx) => ({
    ...p,
    threshold: idx === 0 ? 0 : stepSeconds * idx,
  }));
}

const STATUS_PHASES_CONCISE = buildPhases(8);      // 8s increments for steps 1-8
const STATUS_PHASES_BALANCED = buildPhases(12);    // 12s increments for steps 1-8
const STATUS_PHASES_DEFAULT = STATUS_PHASES_CONCISE;

// Extended wait messages after phase 8 (shown at intervals while waiting for response)
const EXTENDED_WAIT_MESSAGES = [
  { threshold: 60,  message: "⏳ ... still working" },
  { threshold: 75,  message: "🔄 ... we are getting there" },
  { threshold: 90,  message: "⚙️ ... processing complex information" },
  { threshold: 105, message: "📊 ... analyzing additional context" },
  { threshold: 120, message: "🔍 ... refining the response" },
  { threshold: 135, message: "✨ ... almost there" },
  { threshold: 150, message: "📝 ... finalizing details" },
  { threshold: 165, message: "🎯 ... wrapping up" },
];

// In-memory store for active queries
const activeQueries = new Map<string, {
  startTime: number;
  completed: boolean;
  mode?: Mode;
  threadId?: number;
  error?: string;
  result?: any;
}>();

export function generateQueryId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function startQueryTracking(queryId: string, mode?: Mode, threadId?: number): void {
  activeQueries.set(queryId, {
    startTime: Date.now(),
    completed: false,
    mode,
    threadId,
  });
}

export function completeQuery(queryId: string, result: any): void {
  const query = activeQueries.get(queryId);
  if (query) {
    query.completed = true;
    query.result = result;
  }
}

export function failQuery(queryId: string, error: string): void {
  const query = activeQueries.get(queryId);
  if (query) {
    query.completed = true;
    query.error = error;
  }
}

function getPhases(mode?: Mode) {
  if (mode === "balanced") return STATUS_PHASES_BALANCED;
  if (mode === "concise") return STATUS_PHASES_CONCISE;
  return STATUS_PHASES_DEFAULT;
}

export function getQueryStatus(queryId: string): QueryStatus | null {
  const query = activeQueries.get(queryId);
  if (!query) return null;

  const elapsedSeconds = (Date.now() - query.startTime) / 1000;

  if (query.completed) {
    if (query.error) {
      return {
        queryId,
        startTime: query.startTime,
        phase: -1,
        phaseName: "error",
        message: `❌ ${query.error}`,
        completed: true,
        error: query.error,
        threadId: query.threadId,
      };
    }
    return {
      queryId,
      startTime: query.startTime,
      phase: 10,
      phaseName: "completed",
      message: "✅ Response ready!",
      completed: true,
      result: query.result,
      threadId: query.threadId,
    };
  }

  const phases = getPhases(query.mode);
  let currentPhase = phases[0];
  for (const phase of phases) {
    if (elapsedSeconds >= phase.threshold) {
      currentPhase = phase;
    } else {
      break;
    }
  }

  let extendedWaitMessage: string | undefined;
  if (currentPhase.phase === 8) {
    for (const waitMsg of EXTENDED_WAIT_MESSAGES) {
      if (elapsedSeconds >= waitMsg.threshold) {
        extendedWaitMessage = waitMsg.message;
      } else {
        break;
      }
    }
  }

  return {
    queryId,
    startTime: query.startTime,
    phase: currentPhase.phase,
    phaseName: currentPhase.name,
    message: currentPhase.message,
    extendedWaitMessage,
    completed: false,
    threadId: query.threadId,
  };
}

export function cleanupOldQueries(maxAgeMs: number = 5 * 60 * 1000): void {
  const now = Date.now();
  for (const [queryId, query] of activeQueries.entries()) {
    if (query.completed && (now - query.startTime) > maxAgeMs) {
      activeQueries.delete(queryId);
    }
  }
}

export function getThreadStatuses(): Record<string, { status: string; queryId: string }> {
  const statuses: Record<string, { status: string; queryId: string }> = {};
  for (const [queryId, query] of activeQueries.entries()) {
    if (!query.completed && query.threadId !== undefined) {
      statuses[String(query.threadId)] = { status: "working", queryId };
    }
  }
  return statuses;
}
