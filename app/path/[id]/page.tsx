"use client";

import { FormEvent, use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import {
  Tabs,
  TabsContent,
  TabsPanels,
  TabsTrigger,
  TabsTriggerList,
} from "@/components/retroui/Tab";
import ReactMarkdown from "react-markdown";

const AGENT_LABELS: Record<string, string> = {
  skillDiff: "Skill Diff · Opus 4.7",
  lesson: "Lesson · Haiku 4.5",
  resource: "Videos · Haiku 4.5",
  assessment: "Assessment · Haiku 4.5",
  course: "Courses · Haiku 4.5",
  community: "Community · Haiku 4.5",
  books: "Books · Haiku + Google Books",
  news: "News · Sonar (live web)",
  description: "About this career · Sonnet 4.6",
  scholar: "Scholar · SerpAPI",
  audio: "Audio · Haiku + ElevenLabs",
};

const STATUS_BG: Record<string, string> = {
  pending: "bg-muted",
  running: "bg-primary animate-pulse",
  done: "bg-emerald-200",
  error: "bg-destructive/20",
  skipped: "bg-muted",
};

export default function PathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const pathId = id as Id<"paths">;
  const router = useRouter();
  const searchParams = useSearchParams();

  const path = useQuery(api.paths.get, { pathId });
  const agentRuns = useQuery(api.agentRuns.listForPath, { pathId });
  const generatedList = useQuery(api.modules.listForPath, { pathId });
  const generateModule = useMutation(api.modules.generateModuleContent);

  // Active module number — comes from ?module=N or defaults to the featured module.
  const featuredNumber = useMemo(() => {
    const flat = path?.pathOutline?.phases?.flatMap((p: any) => p.modules ?? []) ?? [];
    const featured = flat.find((m: any) => m.isPrimaryBridge) ?? flat[0];
    return featured?.number ?? 1;
  }, [path?.pathOutline]);

  const moduleParam = Number(searchParams.get("module"));
  const activeModuleNumber = Number.isInteger(moduleParam) && moduleParam > 0
    ? moduleParam
    : featuredNumber;

  const moduleDoc = useQuery(api.modules.getByNumber, { pathId, moduleNumber: activeModuleNumber });
  // Featured module always carries the target-career description + news. The
  // About tab pulls from this so it shows the same content regardless of which
  // module the user is viewing (description is target-career-level, not module-level).
  const featuredDoc = useQuery(api.modules.getForPath, { pathId });

  function selectModule(n: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (n === featuredNumber) params.delete("module");
    else params.set("module", String(n));
    const qs = params.toString();
    router.push(qs ? `/path/${pathId}?${qs}` : `/path/${pathId}`);
  }

  async function onModuleClick(n: number, isGenerated: boolean) {
    if (!isGenerated) {
      try {
        await generateModule({ pathId, moduleNumber: n });
      } catch (err) {
        console.error("[generateModule] failed:", err);
      }
    }
    selectModule(n);
  }

  if (path === undefined || agentRuns === undefined) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Text as="p" className="text-muted-foreground">Loading...</Text>
      </main>
    );
  }
  if (path === null) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <Text as="p">Path not found.</Text>
        <Link href="/" className="underline">Back to start</Link>
      </main>
    );
  }

  const skillDiffRun = agentRuns.find((r) => r.agent === "skillDiff");
  const skillDiffOutput =
    skillDiffRun?.status === "done" ? (skillDiffRun.output as any) : null;

  return (
    <main className="flex-1 px-6 py-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Try another bridge
        </Link>

        {/* Breadcrumb + title — Path > Phase > Module N/total */}
        {(() => {
          const outline = path.pathOutline;
          const flat = outline?.phases?.flatMap((p: any) => p.modules) ?? [];
          const totalModules = flat.length;
          const featured = flat.find((m: any) => m.isPrimaryBridge) ?? flat[0];
          const featuredPhase = outline?.phases?.find((p: any) =>
            p.modules?.some((m: any) => m.number === featured?.number),
          );
          return (
            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Badge variant="surface" size="sm">
                  {outline?.title ?? `${path.currentCareer} → ${path.targetCareer}`}
                </Badge>
                {featuredPhase && (
                  <>
                    <span>›</span>
                    <span>{featuredPhase.title}</span>
                  </>
                )}
                {featured && totalModules > 0 && (
                  <>
                    <span>›</span>
                    <span>Module {featured.number}/{totalModules}</span>
                  </>
                )}
              </div>
              <Text as="h1" className="text-3xl md:text-4xl mt-3">
                {featured?.title ?? skillDiffOutput?.headline?.moduleTopic ?? "Generating your bridge..."}
              </Text>
              {path.profileText && (
                <Badge size="sm" variant="solid" className="mt-3">
                  Personalized to your profile
                </Badge>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {featured && (
                  <Badge size="sm" variant="default">
                    {featured.weekRange || `${featured.estimatedHours}h`}
                  </Badge>
                )}
                {skillDiffOutput && (
                  <>
                    <Badge size="sm" variant="default">
                      Bloom&apos;s: {featured?.bloomLevel ?? skillDiffOutput.headline?.bloomLevel}
                    </Badge>
                    {featured?.skillDomain && (
                      <Badge size="sm" variant="default">
                        Skill: {featured.skillDomain}
                      </Badge>
                    )}
                    <Badge size="sm" variant="surface">
                      Bridge: {skillDiffOutput.headline?.primaryBridge?.name}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Bridge framing moved UP — this is the headline emotional content,
            shouldn't be buried below pipeline. Renders as a quote-style card,
            not a labeled-section card, so it reads as the page's thesis. */}
        {skillDiffOutput?.headline?.framing && (
          <div className="mt-5 border-l-4 border-black pl-4">
            <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Why this bridge
            </Text>
            <Text as="p" className="text-base md:text-lg leading-relaxed font-medium">
              {skillDiffOutput.headline.framing}
            </Text>
          </div>
        )}

        {/* Salary + outlook panel — collapses to a compact strip after the
            path is done so the second-visit user doesn't lose 250px to data
            they already saw. */}
        {(() => {
          const sonarSalary = moduleDoc?.salary;
          const opusCurrent = skillDiffOutput?.currentSalary;
          const opusTarget = skillDiffOutput?.targetSalary;
          const hasAnything = sonarSalary || opusCurrent || opusTarget;
          if (!hasAnything) return null;
          return (
            <SalaryPanel
              currentTitle={path.currentCareer}
              targetTitle={path.targetCareer}
              city={path.city}
              userSalary={path.currentSalary}
              sonarSalary={sonarSalary}
              opusCurrent={opusCurrent}
              opusTarget={opusTarget}
              pathStatus={path.status}
            />
          );
        })()}

        {/* Full path outline — collapses to a compact strip after done.
            Collapsed view shows current phase + module count so users still
            know where they are without losing 400px. */}
        {path.pathOutline && (
          <PathOutlineView
            outline={path.pathOutline}
            hoursPerWeek={path.hoursPerWeek}
            generatedNumbers={new Set((generatedList ?? []).map((m) => m.moduleNumber))}
            activeNumber={activeModuleNumber}
            onModuleClick={onModuleClick}
            pathStatus={path.status}
          />
        )}

        {/* Agent pipeline — visible during generation (the demo wow), then
            auto-collapses to a single status chip after all agents finish. */}
        <AgentPipeline agentRuns={agentRuns} pathStatus={path.status} />

        {/* Tabbed module content — matches sample module pattern */}
        {moduleDoc && (
          <ModuleTabs
            moduleDoc={moduleDoc}
            featuredDoc={featuredDoc ?? null}
            skillDiff={skillDiffOutput}
            currentCareer={path.currentCareer}
            targetCareer={path.targetCareer}
          />
        )}
      </div>

      {/* Floating counselor chat — Sonnet with full path context */}
      <CounselorWidget pathId={pathId} />
    </main>
  );
}

/* ===== Counselor widget — floating chat with full path context ===== */

function CounselorWidget({ pathId }: { pathId: Id<"paths"> }) {
  const [open, setOpen] = useState(false);
  const messages = useQuery(api.counselorMessages.listMessages, { pathId });
  const askCounselor = useAction(api.counselor.ask);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Voice mode toggle. Defaults ON now that ElevenLabs cost isn't a concern.
  // When ON: mic button is primary input + assistant audio replies auto-play.
  // When OFF: type as today, no auto-play. Persisted in localStorage so a
  // returning user who explicitly turned it off stays off.
  const [voiceMode, setVoiceMode] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("pathfinder.voiceMode");
    // null (never set) or "1" → keep default ON. Only "0" (explicit off) flips.
    if (stored === "0") setVoiceMode(false);
  }, []);
  function toggleVoiceMode() {
    const next = !voiceMode;
    setVoiceMode(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pathfinder.voiceMode", next ? "1" : "0");
    }
  }

  // Web Speech API — browser STT. Chrome/Edge/Safari supported, Firefox not.
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const sttSupported =
    typeof window !== "undefined" &&
    (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window));

  function startListening() {
    if (!sttSupported || listening) return;
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      // Live-update the input field as user speaks
      setDraft((prev) => {
        // If we have a final piece, append to existing draft (idempotent on
        // the interim portion). Otherwise show interim live.
        return final ? final : interim;
      });
    };

    recognition.onerror = (e: any) => {
      console.warn("[stt] error:", e?.error);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  function stopListening() {
    if (!listening) return;
    recognitionRef.current?.stop();
    setListening(false);
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length, open, sending]);

  async function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setDraft("");
    stopListening();
    try {
      await askCounselor({ pathId, message: trimmed });
    } catch (err) {
      console.error("[counselor] send failed:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Toggle button — bottom-right floating */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-30 border-2 border-black bg-primary text-primary-foreground rounded-full px-5 py-3 font-head shadow-md hover:shadow-none active:translate-y-1 transition-all"
      >
        {open ? "Close counselor" : "💬 Ask the counselor"}
      </button>

      {/* Chat panel */}
      {open && (
        <aside className="fixed bottom-24 right-5 z-30 w-[min(420px,calc(100vw-2rem))] max-h-[70vh] flex flex-col border-2 border-black bg-card rounded shadow-md">
          <header className="border-b-2 border-black bg-primary/30 px-4 py-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Text as="p" className="font-head text-sm">
                AI Career Counselor
              </Text>
              <Text as="p" className="text-xs text-muted-foreground">
                Sonnet 4.6 · sees your full path. Ask anything.
              </Text>
            </div>
            <button
              type="button"
              onClick={toggleVoiceMode}
              aria-label={voiceMode ? "Turn voice mode off" : "Turn voice mode on"}
              title={
                voiceMode
                  ? "Voice mode ON · replies auto-play, mic button on"
                  : "Voice mode OFF · type to chat"
              }
              className={`flex-shrink-0 border-2 border-black rounded px-2.5 py-1 text-xs font-head transition-colors ${
                voiceMode
                  ? "bg-foreground text-background"
                  : "bg-card hover:bg-accent"
              }`}
            >
              {voiceMode ? "🔊 Voice ON" : "🔇 Voice OFF"}
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {(!messages || messages.length === 0) && !sending && (
              <div className="text-sm text-foreground/70 space-y-3">
                <p>Try asking:</p>
                <ul className="space-y-1.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => setDraft("Is this transition realistic given my hours per week and age?")}
                      className="text-left underline-offset-2 hover:underline"
                    >
                      &ldquo;Is this transition realistic for me?&rdquo;
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setDraft("What 3 careers similar to my target would you recommend I also consider?")}
                      className="text-left underline-offset-2 hover:underline"
                    >
                      &ldquo;What 3 adjacent careers should I also consider?&rdquo;
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setDraft("Realistically, when should I expect my first interview if I follow this path?")}
                      className="text-left underline-offset-2 hover:underline"
                    >
                      &ldquo;When could I realistically land my first interview?&rdquo;
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setDraft("Which credentials should I prioritize for my situation? Skip the marketing.")}
                      className="text-left underline-offset-2 hover:underline"
                    >
                      &ldquo;Which credentials actually matter for me?&rdquo;
                    </button>
                  </li>
                </ul>
              </div>
            )}
            {messages?.map((m) => (
              <CounselorMessage
                key={m._id}
                role={m.role}
                content={m.content}
                audioUrl={m.audioUrl}
                voiceMode={voiceMode}
              />
            ))}
            {sending && (
              <div className="text-sm text-muted-foreground italic">
                Counselor is thinking…
              </div>
            )}
          </div>

          <form
            onSubmit={onSend}
            className="border-t-2 border-black p-2 flex items-end gap-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend(e as unknown as FormEvent<HTMLFormElement>);
                }
              }}
              placeholder={
                listening
                  ? "Listening… speak now"
                  : voiceMode && sttSupported
                    ? "Tap mic to speak, or type"
                    : "Ask anything about your path…"
              }
              rows={1}
              disabled={sending}
              className="flex-1 resize-none border-2 border-black rounded px-2 py-1.5 text-sm bg-card focus:outline-none"
              style={{ minHeight: "36px", maxHeight: "120px" }}
            />
            {voiceMode && sttSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={sending}
                aria-label={listening ? "Stop listening" : "Start voice input"}
                title={listening ? "Stop" : "Speak"}
                className={`border-2 border-black rounded px-2.5 py-1.5 font-head text-sm transition-colors ${
                  listening
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-card hover:bg-accent"
                }`}
              >
                {listening ? "● REC" : "🎙"}
              </button>
            )}
            <button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              className="border-2 border-black bg-primary text-primary-foreground rounded px-3 py-1.5 font-head text-sm shadow-sm hover:shadow-none active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </aside>
      )}
    </>
  );
}

function CounselorMessage({
  role,
  content,
  audioUrl,
  voiceMode,
}: {
  role: string;
  content: string;
  audioUrl?: string;
  voiceMode?: boolean;
}) {
  // Auto-play assistant audio once, only when voice mode is on. Track which
  // audio URLs we've already played so a re-render (live query update) doesn't
  // restart playback. Per-message audio element so the user can also replay.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!audioUrl || !voiceMode || role !== "assistant") return;
    if (playedRef.current.has(audioUrl)) return;
    playedRef.current.add(audioUrl);
    const audio = audioRef.current;
    if (audio) {
      audio.play().catch((err) => {
        // Browsers block autoplay until user has interacted with the page.
        // The voice toggle click counts as interaction, but if they reload
        // and a queued message has audio, we silently skip (UI still has
        // the inline player as a fallback).
        console.log("[counselor] audio autoplay blocked:", err?.message);
      });
    }
  }, [audioUrl, voiceMode, role]);

  if (role === "user") {
    return (
      <div className="ml-6 border-2 border-black bg-primary/20 rounded px-3 py-2 text-sm whitespace-pre-wrap break-words">
        {content}
      </div>
    );
  }
  // Assistant messages render markdown so **bold**, *italic*, lists, and rules
  // come through as formatted text. Element overrides keep the brutalism
  // aesthetic: bold maps to font-head, hr is a 2px black rule, etc.
  return (
    <div className="mr-6 border-2 border-black bg-card rounded px-3 py-2 text-sm break-words leading-relaxed">
      <div className="counselor-md">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-head">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            hr: () => <hr className="my-3 border-0 border-t-2 border-black" />,
            ul: ({ children }) => (
              <ul className="my-2 ml-4 list-disc list-outside space-y-1 marker:text-foreground/40">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 ml-4 list-decimal list-outside space-y-1 marker:text-foreground/60">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            h1: ({ children }) => <h2 className="font-head text-base mt-2 mb-1">{children}</h2>,
            h2: ({ children }) => <h3 className="font-head text-sm mt-2 mb-1">{children}</h3>,
            h3: ({ children }) => (
              <h4 className="font-head text-sm mt-2 mb-1">{children}</h4>
            ),
            code: ({ children }) => (
              <code className="px-1 py-0.5 bg-muted/60 border border-black/30 rounded text-[0.85em] font-mono">
                {children}
              </code>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 decoration-2 hover:text-foreground/80"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-2 pl-3 border-l-2 border-black/40 text-foreground/80 italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {audioUrl && (
        <div className="mt-2 pt-2 border-t border-black/20 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-head text-muted-foreground">
            🔊 Voice
          </span>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            preload="auto"
            className="flex-1 h-7"
          />
        </div>
      )}
    </div>
  );
}

/* ===== Salary + outlook panel — top-of-page "is this worth it?" math ===== */

function formatSalary(n?: number): string {
  if (!n || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n / 1000)}K`;
}

function SalaryPanel({
  currentTitle,
  targetTitle,
  city,
  userSalary,
  sonarSalary,
  opusCurrent,
  opusTarget,
  pathStatus,
}: {
  currentTitle: string;
  targetTitle: string;
  city?: string;
  userSalary?: number; // user's actual annual salary in USD if provided
  sonarSalary?: any;
  opusCurrent?: any;
  opusTarget?: any;
  pathStatus?: string;
}) {
  // Prefer Sonar (current, cited, city-specific) over Opus baseline
  const sonarHasData = sonarSalary?.current?.medianAnnual && sonarSalary?.target?.medianAnnual;
  const usingSonar = Boolean(sonarHasData);

  const current = usingSonar
    ? {
        medianSalary: sonarSalary.current.medianAnnual,
        salaryRange: sonarSalary.current.range,
        outlookGrowth: sonarSalary.current.outlookGrowth,
        entryEducation: sonarSalary.current.entryEducation,
        blsProxyNote: sonarSalary.current.blsProxyNote,
      }
    : opusCurrent;
  const target = usingSonar
    ? {
        medianSalary: sonarSalary.target.medianAnnual,
        salaryRange: sonarSalary.target.range,
        outlookGrowth: sonarSalary.target.outlookGrowth,
        entryEducation: sonarSalary.target.entryEducation,
        blsProxyNote: sonarSalary.target.blsProxyNote,
      }
    : opusTarget;

  // If the user supplied their actual salary, use it as the comparison anchor
  // instead of the median. This is the honest math: most people aren't median.
  const usingUserSalary = typeof userSalary === "number" && userSalary > 0;
  const anchorSalary = usingUserSalary ? userSalary : current?.medianSalary;

  const lift =
    typeof anchorSalary === "number" &&
    typeof target?.medianSalary === "number"
      ? target.medianSalary - anchorSalary
      : null;
  const liftPct =
    lift !== null && anchorSalary
      ? Math.round((lift / anchorSalary) * 100)
      : null;
  const isNegative = lift !== null && lift < 0;

  // Auto-collapse 8s after path is done. The full 3-column panel is great
  // first-read content but takes 250px; second-visit users get a compact
  // strip with the same key numbers and an expand affordance.
  const [collapsed, setCollapsed] = useState(false);
  const [userOverride, setUserOverride] = useState(false);
  const isComplete = pathStatus === "done";
  useEffect(() => {
    if (!isComplete || userOverride) return;
    const timer = window.setTimeout(() => setCollapsed(true), 8000);
    return () => window.clearTimeout(timer);
  }, [isComplete, userOverride]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => {
          setCollapsed(false);
          setUserOverride(true);
        }}
        className="mt-5 w-full flex items-center justify-between gap-3 border-2 border-black rounded bg-card hover:bg-accent px-4 py-2 text-left transition-colors"
        aria-label="Expand salary and outlook panel"
      >
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-head uppercase tracking-widest">
            Salary + outlook
          </span>
          <span className="text-sm font-head">
            {formatSalary(anchorSalary)} → {formatSalary(target?.medianSalary)}
          </span>
          {liftPct !== null && (
            <span
              className={`text-sm font-head ${isNegative ? "text-destructive" : ""}`}
            >
              ({isNegative ? "" : "+"}
              {liftPct}%)
            </span>
          )}
          {usingSonar && city && (
            <span className="text-xs text-muted-foreground">· {city}</span>
          )}
        </div>
        <span className="text-foreground/60 text-sm">expand ▾</span>
      </button>
    );
  }

  return (
    <div className="mt-5 border-2 border-black rounded p-4 bg-card">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <Text as="p" className="text-xs uppercase tracking-widest font-head">
          Salary + outlook
          {usingSonar && city && (
            <span className="ml-2 normal-case text-muted-foreground tracking-normal">
              · {city}
            </span>
          )}
        </Text>
        <div className="flex items-center gap-3">
          <Text as="p" className="text-xs text-muted-foreground">
            {usingSonar
              ? "Live web data · Perplexity Sonar with citations"
              : "National median (US) · Opus baseline"}
          </Text>
          {isComplete && (
            <button
              type="button"
              onClick={() => {
                setCollapsed(true);
                setUserOverride(true);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
              aria-label="Collapse salary panel"
            >
              collapse
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* From */}
        <div className="border-2 border-black rounded p-3 bg-muted/40">
          <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {usingUserSalary ? `Your salary (${currentTitle})` : `From: ${currentTitle}`}
          </Text>
          <Text as="p" className="font-head text-2xl">
            {formatSalary(anchorSalary)}
          </Text>
          {usingUserSalary && current?.medianSalary && (
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              vs {formatSalary(current.medianSalary)} national median
            </Text>
          )}
          {!usingUserSalary && current?.salaryRange && (
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              {current.salaryRange}
            </Text>
          )}
          {current?.outlookGrowth && (
            <Text as="p" className="text-xs mt-1.5">
              <span className="font-head">Outlook:</span> {current.outlookGrowth}
            </Text>
          )}
          {current?.entryEducation && (
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              Entry: {current.entryEducation}
            </Text>
          )}
        </div>

        {/* Lift / Change — handles negative deltas honestly */}
        <div
          className={`border-2 border-black rounded p-3 flex flex-col justify-center items-center text-center ${
            isNegative ? "bg-destructive/10" : "bg-primary/30"
          }`}
        >
          <Text as="p" className="text-xs uppercase tracking-widest font-head mb-1">
            {isNegative ? "Annual change (cut)" : "Annual lift"}
          </Text>
          <Text
            as="p"
            className={`font-head text-3xl ${
              isNegative
                ? "text-destructive"
                : lift !== null && lift > 0
                  ? ""
                  : "text-muted-foreground"
            }`}
          >
            {lift !== null
              ? `${lift > 0 ? "+" : ""}${lift < 0 ? "−" : ""}${formatSalary(Math.abs(lift))}`
              : "—"}
          </Text>
          {liftPct !== null && (
            <Text as="p" className="text-xs mt-0.5">
              {liftPct > 0 ? "+" : ""}
              {liftPct}% vs your current
            </Text>
          )}
          {lift !== null && lift > 0 && (
            <Text as="p" className="text-xs mt-2 leading-snug">
              A $354 cert = ~{Math.ceil((354 / lift) * 365)} days of new salary to recoup.
            </Text>
          )}
          {isNegative && (
            <Text as="p" className="text-xs mt-2 leading-snug">
              Salary thoughts? Ask the counselor — your situation might warrant a
              different target or timeline.
            </Text>
          )}
        </div>

        {/* To */}
        <div className="border-2 border-black rounded p-3 bg-emerald-100">
          <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            To: {targetTitle}
          </Text>
          <Text as="p" className="font-head text-2xl">
            {formatSalary(target?.medianSalary)}
          </Text>
          {target?.salaryRange && (
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              {target.salaryRange}
            </Text>
          )}
          {target?.outlookGrowth && (
            <Text as="p" className="text-xs mt-1.5">
              <span className="font-head">Outlook:</span> {target.outlookGrowth}
            </Text>
          )}
          {target?.entryEducation && (
            <Text as="p" className="text-xs text-muted-foreground mt-0.5">
              Entry: {target.entryEducation}
            </Text>
          )}
        </div>
      </div>
      {/* BLS proxy note (when target career maps to a proxy SOC like
          Project Management Specialists for Product Manager) */}
      {usingSonar && (current?.blsProxyNote || target?.blsProxyNote) && (
        <div className="mt-3 text-xs text-foreground/70 leading-snug border-2 border-dashed border-black/20 rounded p-2 bg-muted/30">
          {current?.blsProxyNote && current.blsProxyNote !== "Direct BLS match" && (
            <div>
              <span className="font-head">{currentTitle}:</span> {current.blsProxyNote}
            </div>
          )}
          {target?.blsProxyNote && target.blsProxyNote !== "Direct BLS match" && (
            <div>
              <span className="font-head">{targetTitle}:</span> {target.blsProxyNote}
            </div>
          )}
        </div>
      )}

      {/* Sonar source citations — clickable list of all data sources used */}
      {usingSonar && Array.isArray(sonarSalary?.citations) && sonarSalary.citations.length > 0 && (
        <div className="mt-3">
          <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
            Sources ({sonarSalary.citations.length})
          </Text>
          <div className="flex flex-wrap gap-1.5">
            {sonarSalary.citations.slice(0, 8).map((url: string, i: number) => {
              let host = url;
              try {
                host = new URL(url).hostname.replace(/^www\./, "");
              } catch {
                /* keep raw */
              }
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs border-2 border-black bg-card hover:bg-accent rounded px-2 py-0.5 transition-colors"
                >
                  {host}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {!usingSonar && (
        <Text as="p" className="text-xs text-muted-foreground mt-2">
          Numbers are national US medians from Claude&apos;s training-time BLS knowledge.
          Add a city on the home form to upgrade to live Sonar data with real
          citations.
        </Text>
      )}
    </div>
  );
}

/* ===== Path outline — full 4-phase × N-module roadmap ===== */

const PHASE_COLORS: Record<number, string> = {
  1: "bg-emerald-100",
  2: "bg-primary/30",
  3: "bg-accent",
  4: "bg-secondary/20",
};

function PathOutlineView({
  outline,
  hoursPerWeek,
  generatedNumbers,
  activeNumber,
  onModuleClick,
  pathStatus,
}: {
  outline: any;
  hoursPerWeek?: number;
  generatedNumbers: Set<number>;
  activeNumber: number;
  onModuleClick: (n: number, isGenerated: boolean) => void;
  pathStatus?: string;
}) {
  // Re-pace the path based on the user's stated weekly availability. Default
  // path is sized at outline.totalWeeks; if the learner has fewer hours/week,
  // honest math says it'll take longer.
  const totalHours = outline.totalHours ?? 30;
  const totalModules = (outline.phases ?? []).reduce(
    (acc: number, p: any) => acc + (p.modules?.length ?? 0),
    0,
  );
  const repacedWeeks =
    hoursPerWeek && hoursPerWeek > 0 ? Math.ceil(totalHours / hoursPerWeek) : null;
  const repacedMonths =
    repacedWeeks !== null ? Math.round((repacedWeeks / 4.33) * 10) / 10 : null;

  // Auto-collapse to a thin module-stepper strip 8s after path is done.
  // The full 4-phase grid is great for first-time orientation but it's 400px
  // tall, and a returning user reading lesson 4 doesn't need to see all 12
  // modules every time. Compact view shows current phase + active module +
  // an expand chip; the actual lesson moves up by ~400px.
  const [collapsed, setCollapsed] = useState(false);
  const [userOverride, setUserOverride] = useState(false);
  const isComplete = pathStatus === "done";
  useEffect(() => {
    if (!isComplete || userOverride) return;
    const timer = window.setTimeout(() => setCollapsed(true), 8000);
    return () => window.clearTimeout(timer);
  }, [isComplete, userOverride]);

  // Find the active phase + module for the collapsed summary
  const flatModules: any[] = (outline.phases ?? []).flatMap((p: any) =>
    (p.modules ?? []).map((m: any) => ({ ...m, _phaseTitle: p.title })),
  );
  const activeModule = flatModules.find((m) => m.number === activeNumber);
  const activePhaseTitle = activeModule?._phaseTitle ?? "";

  if (collapsed) {
    return (
      <div className="mt-8 space-y-3">
        {/* Compact module stepper — horizontal pills for every module */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap font-head">
            {activePhaseTitle ? `${activePhaseTitle} ·` : ""} M{activeNumber}/{totalModules}
          </Text>
          <div className="flex items-center gap-1.5">
            {flatModules.map((m) => {
              const isGenerated = generatedNumbers.has(m.number);
              const isActive = m.number === activeNumber;
              return (
                <button
                  key={m.number}
                  type="button"
                  onClick={() => onModuleClick(m.number, isGenerated)}
                  title={`M${m.number}: ${m.title}${isGenerated ? "" : " (not yet generated)"}`}
                  aria-label={`Module ${m.number}: ${m.title}`}
                  className={`flex items-center justify-center min-w-[32px] h-8 px-2 border-2 border-black rounded text-xs font-head whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-foreground text-background"
                      : isGenerated
                        ? "bg-card hover:bg-accent"
                        : "bg-muted/40 hover:bg-accent text-foreground/60"
                  }`}
                >
                  {m.number}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setCollapsed(false);
              setUserOverride(true);
            }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
            aria-label="Expand full learning path"
          >
            full path ▾
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground">
          Your full learning path · click any module to open or generate
        </Text>
        <div className="flex items-center gap-3">
          <Text as="p" className="text-xs text-muted-foreground">
            {totalHours}h · {totalModules} modules · {generatedNumbers.size} generated
          </Text>
          {isComplete && (
            <button
              type="button"
              onClick={() => {
                setCollapsed(true);
                setUserOverride(true);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
              aria-label="Collapse path outline"
            >
              collapse
            </button>
          )}
        </div>
      </div>

      {/* Re-paced timeline strip: honest math based on the user's stated availability */}
      {hoursPerWeek && repacedWeeks !== null && (
        <div className="mt-3 border-2 border-black rounded bg-primary/20 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Text as="p" className="text-xs uppercase tracking-widest font-head mb-0.5">
              Your realistic timeline
            </Text>
            <Text as="p" className="text-sm">
              At <span className="font-head">{hoursPerWeek}h/week</span>,
              this {totalHours}h path takes{" "}
              <span className="font-head">{repacedWeeks} weeks</span>
              {repacedMonths !== null && (
                <span className="text-muted-foreground">
                  {" "}(~{repacedMonths} months)
                </span>
              )}
              .
            </Text>
          </div>
          <Text as="p" className="text-xs text-muted-foreground">
            Default suggested pace: {outline.totalWeeks ?? 8} weeks
          </Text>
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {(outline.phases ?? []).map((phase: any) => (
          <div
            key={phase.number}
            className={`border-2 border-black rounded p-3 ${PHASE_COLORS[phase.number] ?? "bg-card"}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <Text as="p" className="font-head text-base">
                {phase.title}
              </Text>
              <Text as="p" className="text-xs">
                {phase.weekRange}
              </Text>
            </div>
            {phase.bloomLevels && (
              <Text as="p" className="text-xs text-muted-foreground mt-0.5">
                Bloom&apos;s: {phase.bloomLevels}
              </Text>
            )}
            <ul className="mt-2 space-y-1">
              {(phase.modules ?? []).map((m: any) => {
                const isGenerated = generatedNumbers.has(m.number);
                const isActive = m.number === activeNumber;
                return (
                  <li key={m.number}>
                    <button
                      type="button"
                      onClick={() => onModuleClick(m.number, isGenerated)}
                      className={`w-full text-left text-sm flex items-baseline gap-2 rounded px-2 py-1 transition-colors hover:bg-card ${
                        isActive ? "bg-card border-2 border-black -mx-0.5" : "border-2 border-transparent -mx-0.5"
                      }`}
                    >
                      <span className="text-xs text-muted-foreground w-7 flex-shrink-0 font-head">
                        M{m.number}
                      </span>
                      <span
                        className={`flex-1 min-w-0 ${m.isPrimaryBridge ? "font-head" : ""}`}
                      >
                        {m.title}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {m.estimatedHours}h
                      </span>
                      {isActive && (
                        <Badge size="sm" variant="solid" className="flex-shrink-0">
                          Active
                        </Badge>
                      )}
                      {!isActive && isGenerated && (
                        <Badge size="sm" variant="default" className="flex-shrink-0">
                          ✓
                        </Badge>
                      )}
                      {!isActive && !isGenerated && (
                        <Badge size="sm" variant="outline" className="flex-shrink-0">
                          Generate
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <Text as="p" className="mt-3 text-xs text-muted-foreground">
        Active module&apos;s content is shown below. Click any other module to
        switch (instant if already generated, ~30-60s if it needs to generate).
      </Text>
    </div>
  );
}

/* ===== Agent pipeline progress ===== */

function AgentPipeline({ agentRuns, pathStatus }: { agentRuns: any[]; pathStatus: string }) {
  const done = agentRuns.filter((r) => r.status === "done").length;
  const errored = agentRuns.filter((r) => r.status === "error").length;
  const total = agentRuns.length || 6;
  const pct = Math.round((done / total) * 100);

  // Auto-collapse 8s after the path is done. User-facing reasoning: the
  // pipeline tiles are demo wow during generation; after that they're noise.
  // Manual override stays open if user expanded after auto-collapse.
  const [collapsed, setCollapsed] = useState(false);
  const [userOverride, setUserOverride] = useState(false);
  const isComplete = pathStatus === "done" || pathStatus === "error" || pathStatus === "timeout";
  useEffect(() => {
    if (!isComplete || userOverride) return;
    const timer = window.setTimeout(() => setCollapsed(true), 8000);
    return () => window.clearTimeout(timer);
  }, [isComplete, userOverride]);

  // Sum elapsed time across all completed runs for the collapsed summary
  const totalElapsedSec = agentRuns.reduce((acc, r) => {
    if (r.startedAt && r.finishedAt) return acc + (r.finishedAt - r.startedAt) / 1000;
    return acc;
  }, 0);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => {
          setCollapsed(false);
          setUserOverride(true);
        }}
        className="mt-6 w-full flex items-center justify-between gap-3 border-2 border-black rounded bg-card hover:bg-accent px-4 py-2 text-left transition-colors"
        aria-label="Expand agent pipeline"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-head uppercase tracking-widest">
            Agent pipeline
          </span>
          <span className="text-sm">
            {done}/{total} agents
            {errored > 0 ? ` · ${errored} error${errored > 1 ? "s" : ""}` : ""}
            {totalElapsedSec > 0 ? ` · ${Math.round(totalElapsedSec)}s total` : ""}
          </span>
        </div>
        <span className="text-foreground/60 text-sm">expand ▾</span>
      </button>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
        <span>Agent pipeline · {pathStatus}</span>
        <div className="flex items-center gap-3">
          <span>{done}/{total} complete</span>
          {isComplete && (
            <button
              type="button"
              onClick={() => {
                setCollapsed(true);
                setUserOverride(true);
              }}
              className="underline hover:text-foreground"
              aria-label="Collapse agent pipeline"
            >
              collapse
            </button>
          )}
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden border-2 border-black">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
        {agentRuns.map((run) => {
          const elapsed = run.startedAt && run.finishedAt
            ? ((run.finishedAt - run.startedAt) / 1000).toFixed(1)
            : null;
          return (
            <div
              key={run._id}
              className={`border-2 border-black rounded p-2 transition-colors ${STATUS_BG[run.status] ?? STATUS_BG.pending}`}
            >
              <Text as="p" className="font-head text-xs leading-tight">
                {AGENT_LABELS[run.agent] ?? run.agent}
              </Text>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs uppercase tracking-wider">{run.status}</span>
                {elapsed && run.status === "done" && (
                  <span className="text-xs opacity-70">{elapsed}s</span>
                )}
              </div>
              {run.status === "error" && run.errorMessage && (
                <p className="mt-2 text-[10px] leading-tight font-mono break-words text-destructive whitespace-pre-wrap">
                  {run.errorMessage}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== Tabbed module content ===== */

function ModuleTabs({
  moduleDoc,
  featuredDoc,
  skillDiff,
  currentCareer,
  targetCareer,
}: {
  moduleDoc: any;
  featuredDoc: any | null;
  skillDiff: any;
  currentCareer: string;
  targetCareer: string;
}) {
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [projectStarted, setProjectStarted] = useState(false);

  const quiz = moduleDoc.quiz ?? [];
  const quizScore = useMemo(
    () =>
      Object.entries(quizAnswers).filter(
        ([k, v]) => quiz[Number(k)]?.correct === v,
      ).length,
    [quizAnswers, quiz],
  );

  return (
    <div className="mt-8">
      <Tabs>
        <TabsTriggerList className="overflow-x-auto">
          <TabsTrigger>Lesson</TabsTrigger>
          <TabsTrigger>Videos</TabsTrigger>
          <TabsTrigger>Courses</TabsTrigger>
          <TabsTrigger>Books</TabsTrigger>
          <TabsTrigger>About this career</TabsTrigger>
          <TabsTrigger>
            Quiz
            {quizSubmitted && (
              <span className="ml-1.5 text-xs">· {quizScore}/{quiz.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger>Project</TabsTrigger>
          <TabsTrigger>Community</TabsTrigger>
        </TabsTriggerList>

        <TabsPanels>
          {/* LESSON — accordion */}
          <TabsContent>
            <LessonTab lesson={moduleDoc.lesson} />
          </TabsContent>

          {/* VIDEOS */}
          <TabsContent>
            <VideosTab videos={moduleDoc.videos ?? []} />
          </TabsContent>

          {/* COURSES */}
          <TabsContent>
            <CoursesTab course={moduleDoc.course} />
          </TabsContent>

          {/* BOOKS */}
          <TabsContent>
            <BooksTab books={moduleDoc.books} />
          </TabsContent>

          {/* ABOUT THIS CAREER — description (primary) + news (absorbed) + scholarly research */}
          <TabsContent>
            <AboutTab
              description={featuredDoc?.description ?? moduleDoc.description}
              news={featuredDoc?.news ?? moduleDoc.news}
              scholar={featuredDoc?.scholar ?? moduleDoc.scholar}
              targetCareer={targetCareer}
            />
          </TabsContent>

          {/* QUIZ */}
          <TabsContent>
            <QuizTab
              quiz={quiz}
              answers={quizAnswers}
              submitted={quizSubmitted}
              score={quizScore}
              onAnswer={(qIdx, aIdx) => {
                if (!quizSubmitted) setQuizAnswers({ ...quizAnswers, [qIdx]: aIdx });
              }}
              onSubmit={() => setQuizSubmitted(true)}
            />
          </TabsContent>

          {/* PROJECT */}
          <TabsContent>
            <ProjectTab
              project={moduleDoc.project}
              started={projectStarted}
              onStart={() => setProjectStarted(true)}
            />
          </TabsContent>

          {/* COMMUNITY */}
          <TabsContent>
            <CommunityTab community={moduleDoc.community} />
          </TabsContent>
        </TabsPanels>
      </Tabs>
    </div>
  );
}

/* ===== Tab contents ===== */

function LessonTab({ lesson }: { lesson: any }) {
  const [expanded, setExpanded] = useState<number>(0);
  if (!lesson) {
    return <Text as="p" className="text-muted-foreground">Lesson is still generating...</Text>;
  }
  return (
    <div className="space-y-4">
      {lesson.intro && (
        <div className="border-2 border-black rounded bg-accent p-4">
          <Text as="p" className="text-xs uppercase tracking-widest font-head mb-2">Intro</Text>
          <Text as="p" className="leading-relaxed">{lesson.intro}</Text>
        </div>
      )}
      {(lesson.sections ?? []).map((section: any, i: number) => (
        <div key={i} className="border-2 border-black rounded overflow-hidden bg-card">
          <button
            type="button"
            onClick={() => setExpanded(expanded === i ? -1 : i)}
            className="w-full flex justify-between items-center p-4 text-left hover:bg-accent transition"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground border-2 border-black flex items-center justify-center text-xs font-head">
                {i + 1}
              </span>
              <span className="font-head">{section.heading}</span>
            </div>
            <span className="text-2xl font-head">{expanded === i ? "−" : "+"}</span>
          </button>
          {expanded === i && (
            <div className="px-4 pb-4 border-t-2 border-black">
              <Text as="p" className="mt-3 leading-relaxed whitespace-pre-line">
                {section.body}
              </Text>
              {section.tryThis && (
                <div className="mt-4 border-2 border-black rounded bg-primary/20 p-3">
                  <Text as="p" className="text-xs font-head uppercase tracking-widest mb-1">
                    Try this now
                  </Text>
                  <Text as="p" className="text-sm">{section.tryThis}</Text>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="border-2 border-black rounded bg-muted p-4">
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Spaced review scheduled
        </Text>
        <Text as="p" className="text-sm">
          Key concepts resurface in <span className="font-head">3 days</span>, <span className="font-head">7 days</span>, and <span className="font-head">21 days</span>.
        </Text>
      </div>
    </div>
  );
}

function VideosTab({ videos }: { videos: any[] }) {
  const INITIAL = 6;
  const [showAll, setShowAll] = useState(false);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);

  if (videos.length === 0) {
    return <Text as="p" className="text-muted-foreground">Videos are still loading...</Text>;
  }
  const visible = showAll ? videos : videos.slice(0, INITIAL);
  const hidden = videos.length - visible.length;
  return (
    <div className="space-y-3">
      <Text as="p" className="text-sm text-muted-foreground mb-2">
        Curated from YouTube — ranked by Claude for relevance to this career transition.
      </Text>
      {visible.map((v) => (
        <button
          key={v.videoId}
          type="button"
          onClick={() => setActiveVideo(v)}
          className="flex gap-4 p-3 border-2 border-black rounded bg-card hover:bg-accent transition-colors text-left w-full"
        >
          {v.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.thumbnailUrl}
              alt=""
              className="w-32 h-20 object-cover rounded border-2 border-black flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <Text as="p" className="font-head text-sm leading-snug line-clamp-2">{v.title}</Text>
            <Text as="p" className="text-xs text-muted-foreground mt-1">
              {v.channelTitle} · {v.duration}
            </Text>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-1.5 w-20 bg-muted border border-black rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${v.relevanceScore}%` }} />
              </div>
              <Text as="p" className="text-xs">
                {v.relevanceScore}% relevant
              </Text>
            </div>
          </div>
        </button>
      ))}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full border-2 border-black bg-card hover:bg-accent rounded px-4 py-2 text-sm font-head shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          + Show {hidden} more
        </button>
      )}
      {showAll && videos.length > INITIAL && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="w-full text-xs text-muted-foreground hover:text-foreground underline pt-1"
        >
          Show fewer
        </button>
      )}

      {activeVideo && (
        <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  );
}

function VideoModal({ video, onClose }: { video: any; onClose: () => void }) {
  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl">
        <div className="border-2 border-black bg-card rounded overflow-hidden shadow-[6px_6px_0_0_#000]">
          <div className="flex items-start justify-between gap-3 p-3 border-b-2 border-black">
            <div className="flex-1 min-w-0">
              <Text as="p" className="font-head text-base leading-tight line-clamp-2">
                {video.title}
              </Text>
              <Text as="p" className="text-xs text-muted-foreground mt-1">
                {video.channelTitle} · {video.duration} · {video.relevanceScore}% relevant
              </Text>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline text-foreground/70 hover:text-foreground"
              >
                Open on YouTube ↗
              </a>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="border-2 border-black bg-card hover:bg-accent rounded px-2 py-1 text-sm font-head"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CoursesTab({ course }: { course: any }) {
  if (!course || !course.moocs || course.moocs.length === 0) {
    return <Text as="p" className="text-muted-foreground">No courses recommended yet.</Text>;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Text as="p" className="text-sm text-muted-foreground">
          Honest ROI: audit cost vs. cert cost vs. real hiring signal — for each.
        </Text>
        <Badge size="sm" variant="outline">
          {course.source === "curated" ? "hand-curated" : "AI-suggested"}
        </Badge>
      </div>
      {course.moocs.map((m: any, i: number) => (
        <div
          key={i}
          className="block border-2 border-black rounded bg-card overflow-hidden"
        >
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 hover:bg-accent transition-colors"
          >
            <Text as="p" className="font-head text-lg leading-snug">{m.title}</Text>
            <Text as="p" className="text-sm text-muted-foreground mt-1">
              {m.provider} · {m.duration} · {m.level}
            </Text>
            {m.why && (
              <Text as="p" className="mt-2 text-sm leading-relaxed">{m.why}</Text>
            )}
          </a>

          {/* ROI block — honest cost + signal disclosure */}
          {(m.auditCost || m.certCost || m.placementSignal || m.recommendation) && (
            <div className="border-t-2 border-black bg-muted/50 px-4 py-3 space-y-1.5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                {m.auditCost && (
                  <div>
                    <span className="font-head uppercase tracking-widest text-muted-foreground">
                      Audit:{" "}
                    </span>
                    {m.auditCost}
                  </div>
                )}
                {m.certCost && (
                  <div>
                    <span className="font-head uppercase tracking-widest text-muted-foreground">
                      Cert:{" "}
                    </span>
                    {m.certCost}
                  </div>
                )}
                {m.placementSignal && (
                  <div className="md:col-span-1">
                    <span className="font-head uppercase tracking-widest text-muted-foreground">
                      Signal:{" "}
                    </span>
                    {m.placementSignal.split(/\s—\s/)[0]}
                  </div>
                )}
              </div>
              {m.placementSignal && m.placementSignal.includes("—") && (
                <p className="text-xs text-foreground/70 leading-snug">
                  {m.placementSignal.split(/\s—\s/).slice(1).join(" — ")}
                </p>
              )}
              {m.recommendation && (
                <p className="text-xs leading-snug pt-1">
                  <span className="font-head">→</span> {m.recommendation}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QuizTab({
  quiz,
  answers,
  submitted,
  score,
  onAnswer,
  onSubmit,
}: {
  quiz: any[];
  answers: Record<number, number>;
  submitted: boolean;
  score: number;
  onAnswer: (q: number, a: number) => void;
  onSubmit: () => void;
}) {
  if (quiz.length === 0) {
    return <Text as="p" className="text-muted-foreground">Quiz is still generating...</Text>;
  }
  return (
    <div className="space-y-5">
      <Text as="p" className="text-sm text-muted-foreground">
        Scenario-based questions. Test application and judgment, not memorization.
      </Text>
      {quiz.map((q, qi) => (
        <div key={qi} className="border-2 border-black rounded p-4 bg-card">
          <Text as="p" className="font-head mb-3">{qi + 1}. {q.q}</Text>
          <div className="space-y-2">
            {(q.options ?? []).map((opt: string, oi: number) => {
              const selected = answers[qi] === oi;
              const correct = oi === q.correct;
              let style = "border-2 border-black bg-card hover:bg-accent";
              if (submitted && correct) style = "border-2 border-emerald-500 bg-emerald-50";
              else if (submitted && selected && !correct) style = "border-2 border-destructive bg-red-50";
              else if (selected) style = "border-2 border-primary bg-primary/20";
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => onAnswer(qi, oi)}
                  disabled={submitted}
                  className={`block w-full text-left rounded p-3 transition-colors text-sm ${style}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && q.explanation && (
            <div className={`mt-3 border-2 border-black rounded p-3 text-sm ${answers[qi] === q.correct ? "bg-emerald-50" : "bg-accent"}`}>
              <span className="font-head text-xs uppercase tracking-widest mr-2">Why →</span>
              {q.explanation}
            </div>
          )}
        </div>
      ))}
      {!submitted && Object.keys(answers).length === quiz.length && (
        <Button size="lg" onClick={onSubmit}>
          Submit answers
        </Button>
      )}
      {submitted && (
        <div className="border-2 border-black rounded bg-primary/20 p-5 text-center">
          <Text as="p" className="text-4xl font-head">{score}/{quiz.length}</Text>
          <Text as="p" className="text-sm mt-1">
            {score === quiz.length
              ? "Perfect. You've got this."
              : score >= quiz.length - 1
              ? "Strong. Review the one you missed."
              : "Worth a second pass at the lesson. No rush."}
          </Text>
        </div>
      )}
    </div>
  );
}

function ProjectTab({
  project,
  started,
  onStart,
}: {
  project: any;
  started: boolean;
  onStart: () => void;
}) {
  if (!project) {
    return <Text as="p" className="text-muted-foreground">Project brief still generating...</Text>;
  }
  return (
    <div className="space-y-4">
      <div className="border-2 border-black rounded bg-primary/10 p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge size="sm" variant="solid">Capstone project</Badge>
          {project.isPortfolioArtifact && (
            <Badge size="sm" variant="solid">Portfolio artifact</Badge>
          )}
          <Badge size="sm" variant="solid">{project.estimatedHours}h</Badge>
        </div>
        <Text as="h3" className="text-2xl">{project.title}</Text>
        {project.brief && (
          <Text as="p" className="mt-3 leading-relaxed whitespace-pre-line">{project.brief}</Text>
        )}
      </div>

      {project.deliverables?.length > 0 && (
        <div className="border-2 border-black rounded bg-card p-4">
          <Text as="p" className="text-xs uppercase tracking-widest font-head mb-2">Deliverables</Text>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {project.deliverables.map((d: string, i: number) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {project.skillsDemonstrated?.length > 0 && (
        <div className="border-2 border-black rounded bg-card p-4">
          <Text as="p" className="text-xs uppercase tracking-widest font-head mb-2">Skills demonstrated</Text>
          <div className="flex flex-wrap gap-2">
            {project.skillsDemonstrated.map((s: string, i: number) => (
              <Badge key={i} size="sm" variant="default">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="border-2 border-black rounded bg-emerald-50 p-4">
        <Text as="p" className="text-xs uppercase tracking-widest font-head mb-1">This goes in your portfolio</Text>
        <Text as="p" className="text-sm">
          Your output is tangible evidence of this skill. You can show it to future employers, mentors, or programs.
        </Text>
      </div>

      {!started ? (
        <Button size="lg" onClick={onStart}>
          Start project
        </Button>
      ) : (
        <div className="border-2 border-dashed border-primary rounded p-6 text-center bg-primary/5">
          <Text as="p" className="font-head">Project in progress</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-1">
            Work at your own pace. Upload when ready.
          </Text>
        </div>
      )}
    </div>
  );
}

function BooksTab({ books }: { books: any }) {
  const INITIAL = 5;
  const [showAll, setShowAll] = useState(false);

  if (!books || !books.books || books.books.length === 0) {
    return <Text as="p" className="text-muted-foreground">Books still loading...</Text>;
  }
  const list: any[] = books.books;
  const visible = showAll ? list : list.slice(0, INITIAL);
  const hidden = list.length - visible.length;

  return (
    <div className="space-y-3">
      <Text as="p" className="text-sm text-muted-foreground mb-2">
        Canonical and foundational texts for this field, from Google Books. Each
        is filtered by Claude for relevance, then linked to a free preview.
      </Text>
      {visible.map((b: any) => (
        <a
          key={b.id}
          href={b.infoLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-4 p-3 border-2 border-black rounded bg-card hover:bg-accent transition-colors"
        >
          {b.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.thumbnailUrl}
              alt=""
              className="w-20 h-28 object-cover rounded border-2 border-black flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <Text as="p" className="font-head text-base leading-snug line-clamp-2">
              {b.title}
            </Text>
            {b.subtitle && (
              <Text as="p" className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                {b.subtitle}
              </Text>
            )}
            {b.authors && b.authors.length > 0 && (
              <Text as="p" className="text-sm mt-1">
                by {b.authors.slice(0, 3).join(", ")}
              </Text>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {b.publisher && <span>{b.publisher}</span>}
              {b.publishedDate && <span>· {b.publishedDate.slice(0, 4)}</span>}
              {typeof b.pageCount === "number" && b.pageCount > 0 && (
                <span>· {b.pageCount}p</span>
              )}
              {typeof b.averageRating === "number" && (
                <Badge size="sm" variant="outline">
                  ★ {b.averageRating.toFixed(1)}
                  {typeof b.ratingsCount === "number" ? ` (${b.ratingsCount})` : ""}
                </Badge>
              )}
              {typeof b.relevanceScore === "number" && (
                <span className="ml-auto inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-16 bg-muted border border-black rounded-full overflow-hidden">
                    <span
                      className="block h-full bg-primary"
                      style={{ width: `${b.relevanceScore}%` }}
                    />
                  </span>
                  <span>{b.relevanceScore}% relevant</span>
                </span>
              )}
            </div>
          </div>
        </a>
      ))}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full border-2 border-black bg-card hover:bg-accent rounded px-4 py-2 text-sm font-head shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          + Show {hidden} more
        </button>
      )}
      {showAll && list.length > INITIAL && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="w-full text-xs text-muted-foreground hover:text-foreground underline pt-1"
        >
          Show fewer
        </button>
      )}
    </div>
  );
}

const NEWS_TAG_STYLES: Record<string, string> = {
  "Industry Growth": "bg-emerald-100 border-emerald-500",
  Technology: "bg-primary/30 border-black",
  "Job Market": "bg-accent border-black",
  Policy: "bg-muted border-black",
  Culture: "bg-primary/20 border-black",
};

/**
 * AboutTab — the merged "About this career" surface.
 *
 * Layout:
 *   1. Title + one-line definition (large)
 *   2. Day in the life (3-bucket card)
 *   3. Tools & artifacts (badge grid)
 *   4. Career ladder (table)
 *   5. Trade-offs (2-col pros/cons)
 *   6. Entry pathways (stacked)
 *   7. Adjacent careers + Who you work with (2-col)
 *   8. Recent news (absorbed from former News tab)
 *   9. Scholarly research slot — placeholder, wired in v2 via Semantic Scholar
 */
function AboutTab({
  description,
  news,
  scholar,
  targetCareer,
}: {
  description: any;
  news: any;
  scholar: any;
  targetCareer: string;
}) {
  if (!description) {
    return (
      <Text as="p" className="text-muted-foreground">
        Description still generating... usually 8-12 seconds.
      </Text>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header — one-line definition */}
      <div>
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          About being a {targetCareer}
        </Text>
        {description.oneLineDefinition && (
          <Text as="h2" className="text-2xl md:text-3xl leading-tight">
            {description.oneLineDefinition}
          </Text>
        )}
      </div>

      {/* Day in the life */}
      {description.dayInTheLife && (
        <section>
          <Text as="h3" className="text-xl mb-3">
            Day in the life
          </Text>
          <div className="border-2 border-black rounded bg-card p-4 space-y-4">
            {description.dayInTheLife.morning && (
              <div>
                <Text as="p" className="text-xs font-head uppercase tracking-widest mb-1">
                  Morning
                </Text>
                <Text as="p" className="text-sm leading-relaxed">
                  {description.dayInTheLife.morning}
                </Text>
              </div>
            )}
            {description.dayInTheLife.afternoon && (
              <div>
                <Text as="p" className="text-xs font-head uppercase tracking-widest mb-1">
                  Afternoon
                </Text>
                <Text as="p" className="text-sm leading-relaxed">
                  {description.dayInTheLife.afternoon}
                </Text>
              </div>
            )}
            {description.dayInTheLife.eveningOrEdge && (
              <div>
                <Text as="p" className="text-xs font-head uppercase tracking-widest mb-1">
                  Weekly arc / edge cases
                </Text>
                <Text as="p" className="text-sm leading-relaxed">
                  {description.dayInTheLife.eveningOrEdge}
                </Text>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tools & artifacts */}
      {description.toolsAndArtifacts?.length > 0 && (
        <section>
          <Text as="h3" className="text-xl mb-3">
            Tools & artifacts
          </Text>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {description.toolsAndArtifacts.map((t: any, i: number) => (
              <div
                key={i}
                className="border-2 border-black rounded bg-card p-3 flex items-baseline gap-2"
              >
                <Badge size="sm" variant="surface" className="flex-shrink-0">
                  {t.name}
                </Badge>
                <Text as="p" className="text-sm text-foreground/80 leading-snug">
                  {t.purpose}
                </Text>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Career ladder */}
      {description.ladder?.length > 0 && (
        <section>
          <Text as="h3" className="text-xl mb-3">
            Career ladder & comp
          </Text>
          <div className="border-2 border-black rounded bg-card overflow-hidden">
            <div className="divide-y-2 divide-black">
              {description.ladder.map((rung: any, i: number) => (
                <div key={i} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3">
                  <div className="md:col-span-3">
                    <Text as="p" className="font-head text-sm">
                      {rung.title}
                    </Text>
                    {rung.yearsExperience && (
                      <Text as="p" className="text-xs text-muted-foreground">
                        {rung.yearsExperience}
                      </Text>
                    )}
                  </div>
                  <div className="md:col-span-3">
                    {rung.compRange && (
                      <Badge size="sm" variant="outline">
                        {rung.compRange}
                      </Badge>
                    )}
                  </div>
                  <div className="md:col-span-6">
                    <Text as="p" className="text-sm text-foreground/80 leading-snug">
                      {rung.whatChanges}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trade-offs */}
      {(description.tradeoffs?.pros?.length > 0 ||
        description.tradeoffs?.cons?.length > 0) && (
        <section>
          <Text as="h3" className="text-xl mb-3">
            Honest trade-offs
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {description.tradeoffs.pros?.length > 0 && (
              <div className="border-2 border-black rounded bg-emerald-100 p-4">
                <Text as="p" className="text-xs font-head uppercase tracking-widest mb-2">
                  Pros
                </Text>
                <ul className="space-y-2 list-disc list-inside marker:text-foreground/40">
                  {description.tradeoffs.pros.map((s: string, i: number) => (
                    <li key={i} className="text-sm leading-snug">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {description.tradeoffs.cons?.length > 0 && (
              <div className="border-2 border-black rounded bg-rose-100 p-4">
                <Text as="p" className="text-xs font-head uppercase tracking-widest mb-2">
                  Cons
                </Text>
                <ul className="space-y-2 list-disc list-inside marker:text-foreground/40">
                  {description.tradeoffs.cons.map((s: string, i: number) => (
                    <li key={i} className="text-sm leading-snug">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Entry pathways */}
      {description.entryPathways?.length > 0 && (
        <section>
          <Text as="h3" className="text-xl mb-3">
            How people actually break in
          </Text>
          <div className="space-y-2">
            {description.entryPathways.map((p: any, i: number) => (
              <div key={i} className="border-2 border-black rounded bg-card p-3">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <Text as="p" className="font-head text-sm">
                    {p.pathway}
                  </Text>
                  {p.proportion && (
                    <Badge size="sm" variant="default">
                      {p.proportion}
                    </Badge>
                  )}
                </div>
                {p.notes && (
                  <Text as="p" className="text-sm text-foreground/80 mt-1 leading-snug">
                    {p.notes}
                  </Text>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Adjacent careers + Who you work with */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {description.adjacentCareers?.length > 0 && (
          <section>
            <Text as="h3" className="text-xl mb-3">
              Where this can lead
            </Text>
            <div className="space-y-2">
              {description.adjacentCareers.map((c: any, i: number) => (
                <div key={i} className="border-2 border-black rounded bg-card p-3">
                  <Text as="p" className="font-head text-sm">
                    {c.title}
                  </Text>
                  {c.movePattern && (
                    <Text as="p" className="text-xs text-muted-foreground mt-1 leading-snug">
                      {c.movePattern}
                    </Text>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {description.whoYouWorkWith?.length > 0 && (
          <section>
            <Text as="h3" className="text-xl mb-3">
              Who you work with
            </Text>
            <div className="space-y-2">
              {description.whoYouWorkWith.map((w: any, i: number) => (
                <div key={i} className="border-2 border-black rounded bg-card p-3">
                  <Text as="p" className="font-head text-sm">
                    {w.role}
                  </Text>
                  {w.relationship && (
                    <Text as="p" className="text-xs text-muted-foreground mt-1 leading-snug">
                      {w.relationship}
                    </Text>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* News (absorbed from former News tab) */}
      {news?.items?.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <Text as="h3" className="text-xl">
              Recent news in this field
            </Text>
            <Text as="p" className="text-xs text-muted-foreground">
              From Perplexity Sonar · last 30 days
            </Text>
          </div>
          <div className="space-y-3">
            {news.items.map((item: any, i: number) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-2 border-black rounded p-4 bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Text as="p" className="font-head text-base leading-snug">
                      {item.title}
                    </Text>
                    <Text as="p" className="text-xs text-muted-foreground mt-1">
                      {item.source}
                      {item.date ? ` · ${item.date}` : ""}
                    </Text>
                  </div>
                  {item.tag && (
                    <span
                      className={`text-xs font-head uppercase tracking-widest px-2 py-1 rounded border-2 whitespace-nowrap ${NEWS_TAG_STYLES[item.tag] ?? NEWS_TAG_STYLES["Industry Growth"]}`}
                    >
                      {item.tag}
                    </span>
                  )}
                </div>
                {item.summary && (
                  <Text as="p" className="mt-3 text-sm leading-relaxed">
                    {item.summary}
                  </Text>
                )}
                {item.whyItMatters && (
                  <div className="mt-3 border-2 border-black rounded bg-primary/20 p-3">
                    <Text as="p" className="text-xs font-head uppercase tracking-widest mb-1">
                      Why this matters for you
                    </Text>
                    <Text as="p" className="text-sm">
                      {item.whyItMatters}
                    </Text>
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Scholarly research — Google Scholar via SerpAPI. Hides entirely if
          the target career has thin academic literature (trades, creative
          fields). When papers exist, shows the top 5 by citation count. */}
      {scholar?.available && scholar.papers?.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <Text as="h3" className="text-xl">
              Scholarly research
            </Text>
            <Text as="p" className="text-xs text-muted-foreground">
              Top {scholar.papers.length} from Google Scholar · ranked by citations
            </Text>
          </div>
          <div className="space-y-3">
            {scholar.papers.map((p: any, i: number) => (
              <a
                key={i}
                href={p.pdfLink || p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-2 border-black rounded p-4 bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <Text as="p" className="font-head text-base leading-snug flex-1 min-w-0">
                    {p.title}
                  </Text>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {typeof p.citationCount === "number" && p.citationCount > 0 && (
                      <Badge size="sm" variant="surface">
                        {p.citationCount.toLocaleString()} cites
                      </Badge>
                    )}
                    {p.year && (
                      <Badge size="sm" variant="default">
                        {p.year}
                      </Badge>
                    )}
                    {p.pdfLink && (
                      <Badge size="sm" variant="outline">
                        PDF
                      </Badge>
                    )}
                  </div>
                </div>
                {p.authors && (
                  <Text as="p" className="text-sm text-muted-foreground mt-1">
                    {p.authors}
                  </Text>
                )}
                {p.snippet && (
                  <Text as="p" className="mt-2 text-sm text-foreground/80 leading-relaxed line-clamp-3">
                    {p.snippet}
                  </Text>
                )}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NewsTab({ news }: { news: any }) {
  if (!news || !news.items || news.items.length === 0) {
    return (
      <Text as="p" className="text-muted-foreground">
        No recent news yet — either still generating, or Sonar didn&apos;t find items
        from the last 30 days. PERPLEXITY_API_KEY may not be set in Convex env.
      </Text>
    );
  }
  return (
    <div className="space-y-3">
      <Text as="p" className="text-sm text-muted-foreground mb-2">
        Current industry news from the last 30 days — fetched live by Perplexity Sonar,
        with real source URLs.
      </Text>
      {news.items.map((item: any, i: number) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-2 border-black rounded p-4 bg-card hover:bg-accent transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Text as="p" className="font-head text-base leading-snug">
                {item.title}
              </Text>
              <Text as="p" className="text-xs text-muted-foreground mt-1">
                {item.source}
                {item.date ? ` · ${item.date}` : ""}
              </Text>
            </div>
            <span
              className={`text-xs font-head uppercase tracking-widest px-2 py-1 rounded border-2 whitespace-nowrap ${NEWS_TAG_STYLES[item.tag] ?? NEWS_TAG_STYLES["Industry Growth"]}`}
            >
              {item.tag}
            </span>
          </div>
          {item.summary && (
            <Text as="p" className="mt-3 text-sm leading-relaxed">
              {item.summary}
            </Text>
          )}
          {item.whyItMatters && (
            <div className="mt-3 border-2 border-black rounded bg-primary/20 p-3">
              <Text as="p" className="text-xs font-head uppercase tracking-widest mb-1">
                Why this matters for you
              </Text>
              <Text as="p" className="text-sm">
                {item.whyItMatters}
              </Text>
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

function CommunityTab({ community }: { community: any }) {
  if (!community) {
    return <Text as="p" className="text-muted-foreground">Community recommendations still generating...</Text>;
  }
  return (
    <div className="space-y-6">
      {community.source === "llm" && (
        <div className="border-2 border-black rounded bg-accent p-3">
          <Text as="p" className="text-xs font-head uppercase tracking-widest mb-1">Heads up</Text>
          <Text as="p" className="text-sm">
            These are AI-suggested for careers not yet in our curated set. Verify links before joining.
          </Text>
        </div>
      )}

      {community.communities?.length > 0 && (
        <div>
          <Text as="p" className="text-xs uppercase tracking-widest font-head mb-3">
            Communities · {community.communities.length}
          </Text>
          <div className="space-y-2">
            {community.communities.map((c: any, i: number) => (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border-2 border-black rounded p-3 bg-card hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <Text as="p" className="font-head text-base">{c.name}</Text>
                  {c.why && (
                    <Text as="p" className="text-sm text-muted-foreground mt-0.5">{c.why}</Text>
                  )}
                </div>
                <Badge size="sm" variant="outline" className="ml-3 flex-shrink-0">
                  {c.platform}
                </Badge>
              </a>
            ))}
          </div>
        </div>
      )}

      {community.people?.length > 0 && (
        <div>
          <Text as="p" className="text-xs uppercase tracking-widest font-head mb-3">
            People to follow · {community.people.length}
          </Text>
          <div className="space-y-2">
            {community.people.map((p: any, i: number) => (
              <a
                key={i}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-2 border-black rounded p-3 bg-card hover:bg-accent transition-colors"
              >
                <Text as="p" className="font-head">{p.name}</Text>
                <Text as="p" className="text-sm text-muted-foreground mt-0.5">{p.context}</Text>
              </a>
            ))}
          </div>
        </div>
      )}

      {community.newsletters?.length > 0 && (
        <div>
          <Text as="p" className="text-xs uppercase tracking-widest font-head mb-3">
            Newsletters · {community.newsletters.length}
          </Text>
          <div className="space-y-2">
            {community.newsletters.map((n: any, i: number) => (
              <a
                key={i}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-2 border-black rounded p-3 bg-card hover:bg-accent transition-colors"
              >
                <Text as="p" className="font-head">{n.name}</Text>
                {n.why && (
                  <Text as="p" className="text-sm text-muted-foreground mt-0.5">{n.why}</Text>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
