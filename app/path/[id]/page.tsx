"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
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

const AGENT_LABELS: Record<string, string> = {
  skillDiff: "Skill Diff · Opus 4.7",
  lesson: "Lesson · Haiku 4.5",
  resource: "Videos · Haiku 4.5",
  assessment: "Assessment · Haiku 4.5",
  course: "Courses · Haiku 4.5",
  community: "Community · Haiku 4.5",
  books: "Books · Haiku + Google Books",
  news: "News · Sonar (live web)",
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

        {/* Career resolution strip — concise */}
        {(path.currentReasoning || path.targetReasoning) && (
          <div className="mt-5 text-xs text-foreground/70 bg-accent border-2 border-black rounded px-3 py-2">
            {path.currentReasoning && (
              <div><span className="font-head">From:</span> {path.currentReasoning}</div>
            )}
            {path.targetReasoning && (
              <div className="mt-0.5"><span className="font-head">To:</span> {path.targetReasoning}</div>
            )}
          </div>
        )}

        {/* Full path outline — all 4 phases × 10-12 modules. Click any module
            to generate it on-demand. Generated modules switch the content
            below; locked modules trigger a new generation. */}
        {path.pathOutline && (
          <PathOutlineView
            outline={path.pathOutline}
            generatedNumbers={new Set((generatedList ?? []).map((m) => m.moduleNumber))}
            activeNumber={activeModuleNumber}
            onModuleClick={onModuleClick}
          />
        )}

        {/* Progress / agent fan-out */}
        <AgentPipeline agentRuns={agentRuns} pathStatus={path.status} />

        {/* Bridge framing — from skillDiff */}
        {skillDiffOutput?.headline?.framing && (
          <Card className="mt-6 block w-full">
            <div className="p-5">
              <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Why this bridge
              </Text>
              <Text as="p" className="text-base leading-relaxed">
                {skillDiffOutput.headline.framing}
              </Text>
            </div>
          </Card>
        )}

        {/* Tabbed module content — matches sample module pattern */}
        {moduleDoc && (
          <ModuleTabs
            moduleDoc={moduleDoc}
            skillDiff={skillDiffOutput}
            currentCareer={path.currentCareer}
            targetCareer={path.targetCareer}
          />
        )}
      </div>
    </main>
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
  generatedNumbers,
  activeNumber,
  onModuleClick,
}: {
  outline: any;
  generatedNumbers: Set<number>;
  activeNumber: number;
  onModuleClick: (n: number, isGenerated: boolean) => void;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground">
          Your full learning path · click any module to open or generate
        </Text>
        <Text as="p" className="text-xs text-muted-foreground">
          {outline.totalWeeks ?? 8} weeks · {outline.totalHours ?? 30}h ·{" "}
          {(outline.phases ?? []).reduce((acc: number, p: any) => acc + (p.modules?.length ?? 0), 0)}{" "}
          modules · {generatedNumbers.size} generated
        </Text>
      </div>
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
  const total = agentRuns.length || 6;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mt-6">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>Agent pipeline · {pathStatus}</span>
        <span>{done}/{total} complete</span>
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
  skillDiff,
  currentCareer,
  targetCareer,
}: {
  moduleDoc: any;
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
          <TabsTrigger>News</TabsTrigger>
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

          {/* NEWS */}
          <TabsContent>
            <NewsTab news={moduleDoc.news} />
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
  if (videos.length === 0) {
    return <Text as="p" className="text-muted-foreground">Videos are still loading...</Text>;
  }
  return (
    <div className="space-y-3">
      <Text as="p" className="text-sm text-muted-foreground mb-2">
        Curated from YouTube — ranked by Claude for relevance to this career transition.
      </Text>
      {videos.map((v) => (
        <a
          key={v.videoId}
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-4 p-3 border-2 border-black rounded bg-card hover:bg-accent transition-colors"
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
        </a>
      ))}
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
          Free, structured courses — all auditable at zero cost.
        </Text>
        <Badge size="sm" variant="outline">
          {course.source === "curated" ? "hand-curated" : "AI-suggested"}
        </Badge>
      </div>
      {course.moocs.map((m: any, i: number) => (
        <a
          key={i}
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-2 border-black rounded p-4 bg-card hover:bg-accent transition-colors"
        >
          <Text as="p" className="font-head text-lg leading-snug">{m.title}</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-1">
            {m.provider} · {m.duration} · {m.level}
          </Text>
          {m.why && (
            <Text as="p" className="mt-2 text-sm leading-relaxed">{m.why}</Text>
          )}
        </a>
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
  if (!books || !books.books || books.books.length === 0) {
    return <Text as="p" className="text-muted-foreground">Books still loading...</Text>;
  }
  return (
    <div className="space-y-3">
      <Text as="p" className="text-sm text-muted-foreground mb-2">
        Canonical and foundational texts for this field, from Google Books. Every
        link goes to a free preview.
      </Text>
      {books.books.map((b: any) => (
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
            </div>
          </div>
        </a>
      ))}
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
