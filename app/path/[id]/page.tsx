"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Text } from "@/components/retroui/Text";

const AGENT_LABELS: Record<string, string> = {
  skillDiff: "Skill Diff · Opus 4.7",
  lesson: "Lesson · Haiku 4.5",
  resource: "Resource · Haiku 4.5",
  assessment: "Assessment · Haiku 4.5",
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

  const path = useQuery(api.paths.get, { pathId });
  const agentRuns = useQuery(api.agentRuns.listForPath, { pathId });
  const moduleDoc = useQuery(api.modules.getForPath, { pathId });

  if (path === undefined || agentRuns === undefined) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Text as="p" className="text-muted-foreground">
          Loading...
        </Text>
      </main>
    );
  }

  if (path === null) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <Text as="p">Path not found.</Text>
        <Link href="/" className="underline">
          Back to start
        </Link>
      </main>
    );
  }

  const skillDiffRun = agentRuns.find((r) => r.agent === "skillDiff");
  const skillDiffOutput =
    skillDiffRun?.status === "done" ? (skillDiffRun.output as any) : null;

  return (
    <main className="flex-1 px-6 py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Try another bridge
        </Link>

        {/* Header — career inputs and resolutions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="block w-full">
            <Card.Header>
              <Text
                as="p"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                From
              </Text>
              <Text as="h2" className="text-3xl">
                {path.currentCareer}
              </Text>
              {path.currentONET && (
                <Text as="p" className="mt-2 text-sm text-foreground/70">
                  <span className="font-mono text-xs">{path.currentONET}</span>
                  {path.currentReasoning ? ` · ${path.currentReasoning}` : ""}
                </Text>
              )}
            </Card.Header>
          </Card>
          <Card className="block w-full">
            <Card.Header>
              <Text
                as="p"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                To
              </Text>
              <Text as="h2" className="text-3xl">
                {path.targetCareer}
              </Text>
              {path.targetONET && (
                <Text as="p" className="mt-2 text-sm text-foreground/70">
                  <span className="font-mono text-xs">{path.targetONET}</span>
                  {path.targetReasoning ? ` · ${path.targetReasoning}` : ""}
                </Text>
              )}
            </Card.Header>
          </Card>
        </div>

        {/* Path-level status pill */}
        <div className="mt-6">
          <Badge
            variant={
              path.status === "done"
                ? "surface"
                : path.status === "error" || path.status === "timeout"
                  ? "outline"
                  : "solid"
            }
            size="lg"
          >
            {path.status}
            {path.errorReason ? ` — ${path.errorReason}` : ""}
          </Badge>
        </div>

        {/* Agent tiles — fan-out animation */}
        <Text
          as="h3"
          className="mt-10 text-sm uppercase tracking-widest text-muted-foreground"
        >
          Agent pipeline
        </Text>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {agentRuns.length === 0 ? (
            <Text as="p" className="col-span-full text-sm text-muted-foreground">
              Spinning up agents...
            </Text>
          ) : (
            agentRuns.map((run) => {
              const elapsedMs =
                run.startedAt && run.finishedAt
                  ? run.finishedAt - run.startedAt
                  : null;
              return (
                <Card
                  key={run._id}
                  className={`block w-full transition-colors ${STATUS_BG[run.status] ?? STATUS_BG.pending}`}
                >
                  <Card.Header>
                    <div className="flex items-center justify-between">
                      <Text as="p" className="font-head text-sm">
                        {AGENT_LABELS[run.agent] ?? run.agent}
                      </Text>
                      <Badge size="sm" variant="outline">
                        {run.status}
                        {elapsedMs !== null && run.status === "done" && (
                          <span className="ml-1">· {(elapsedMs / 1000).toFixed(1)}s</span>
                        )}
                      </Badge>
                    </div>
                    {run.errorMessage && (
                      <Text as="p" className="mt-2 text-xs">
                        data unavailable · {run.errorMessage}
                      </Text>
                    )}
                  </Card.Header>
                </Card>
              );
            })
          )}
        </div>

        {/* Skill diff output — the headline bridge */}
        {skillDiffOutput && (
          <Card className="mt-10 block w-full">
            <Card.Header>
              <Text
                as="p"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                Bridge from {path.currentCareer} → {path.targetCareer}
              </Text>
              <Text as="h3" className="text-3xl mt-1">
                {skillDiffOutput.headline?.primaryBridge?.name}
                <Badge size="sm" variant="default" className="ml-3 align-middle">
                  {skillDiffOutput.headline?.primaryBridgeType}
                </Badge>
              </Text>
              {skillDiffOutput.headline?.framing && (
                <Text as="p" className="mt-3 text-base leading-relaxed">
                  {skillDiffOutput.headline.framing}
                </Text>
              )}
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <Text
                    as="p"
                    className="text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Module topic
                  </Text>
                  <Text as="p" className="mt-1">
                    {skillDiffOutput.headline?.moduleTopic}
                  </Text>
                </div>
                <div>
                  <Text
                    as="p"
                    className="text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Bloom level
                  </Text>
                  <Text as="p" className="mt-1">
                    {skillDiffOutput.headline?.bloomLevel}
                  </Text>
                </div>
                <div>
                  <Text
                    as="p"
                    className="text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Estimated
                  </Text>
                  <Text as="p" className="mt-1">
                    {skillDiffOutput.headline?.estimatedHours}h
                  </Text>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Text
                    as="p"
                    className="text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Knowledge to develop
                  </Text>
                  <ul className="mt-2 space-y-1 text-sm">
                    {(skillDiffOutput.diff?.gainedKnowledge ?? []).slice(0, 6).map(
                      (c: any) => (
                        <li key={c.elementId} className="flex justify-between">
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">{c.importance}</span>
                        </li>
                      ),
                    )}
                    {(skillDiffOutput.diff?.gainedKnowledge ?? []).length === 0 && (
                      <li className="text-muted-foreground">— shared with current —</li>
                    )}
                  </ul>
                </div>
                <div>
                  <Text
                    as="p"
                    className="text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Skills to strengthen
                  </Text>
                  <ul className="mt-2 space-y-1 text-sm">
                    {(skillDiffOutput.diff?.gainedSkills ?? []).slice(0, 6).map(
                      (c: any) => (
                        <li key={c.elementId} className="flex justify-between">
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">{c.importance}</span>
                        </li>
                      ),
                    )}
                    {(skillDiffOutput.diff?.gainedSkills ?? []).length === 0 && (
                      <li className="text-muted-foreground">— shared with current —</li>
                    )}
                  </ul>
                </div>
              </div>
            </Card.Content>
          </Card>
        )}

        {/* The assembled bridge module — rendered once aggregation is done */}
        {moduleDoc && <ModuleContent moduleDoc={moduleDoc} />}
      </div>
    </main>
  );
}

/* === Bridge module content sections === */

function ModuleContent({ moduleDoc }: { moduleDoc: any }) {
  return (
    <div className="mt-12 space-y-10">
      <Text as="h2" className="text-3xl">
        The Bridge Module
      </Text>

      {moduleDoc.lesson && <LessonSection lesson={moduleDoc.lesson} />}
      {moduleDoc.videos && moduleDoc.videos.length > 0 && (
        <ResourceSection videos={moduleDoc.videos} />
      )}
      {moduleDoc.quiz && moduleDoc.quiz.length > 0 && (
        <QuizSection quiz={moduleDoc.quiz} />
      )}
      {moduleDoc.project && <ProjectSection project={moduleDoc.project} />}
    </div>
  );
}

function LessonSection({ lesson }: { lesson: any }) {
  return (
    <Card className="block w-full">
      <Card.Header>
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground">
          Lesson · 10 min read
        </Text>
        {lesson.intro && (
          <Text as="p" className="mt-3 text-lg leading-relaxed">
            {lesson.intro}
          </Text>
        )}
      </Card.Header>
      <Card.Content>
        <div className="space-y-6">
          {(lesson.sections ?? []).map((section: any, i: number) => (
            <article key={i}>
              <Text as="h4" className="text-xl">
                {section.heading}
              </Text>
              <Text as="p" className="mt-2 leading-relaxed whitespace-pre-line">
                {section.body}
              </Text>
              {section.tryThis && (
                <div className="mt-3 rounded border-2 border-black bg-accent p-3 text-sm">
                  <span className="font-head text-xs uppercase tracking-widest mr-2">
                    Try this →
                  </span>
                  {section.tryThis}
                </div>
              )}
            </article>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}

function ResourceSection({ videos }: { videos: any[] }) {
  return (
    <div>
      <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        Curated videos · {videos.length}
      </Text>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {videos.map((v) => (
          <a
            key={v.videoId}
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <Card className="block w-full transition-all group-hover:shadow-none">
              <div className="flex gap-3 p-3">
                {v.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="w-32 h-20 object-cover rounded border-2 border-black flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <Text as="p" className="font-head text-sm leading-snug line-clamp-2">
                    {v.title}
                  </Text>
                  <Text as="p" className="mt-1 text-xs text-muted-foreground">
                    {v.channelTitle} · {v.duration}
                  </Text>
                  <Badge size="sm" variant="outline" className="mt-2">
                    {v.relevanceScore}/100
                  </Badge>
                </div>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}

function QuizSection({ quiz }: { quiz: any[] }) {
  return (
    <Card className="block w-full">
      <Card.Header>
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground">
          Practice quiz · {quiz.length} scenarios
        </Text>
      </Card.Header>
      <Card.Content>
        <div className="space-y-6">
          {quiz.map((q: any, i: number) => (
            <QuizQuestion key={i} q={q} index={i} />
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}

function QuizQuestion({ q, index }: { q: any; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const showResult = selected !== null;
  return (
    <div>
      <Text as="p" className="font-head">
        {index + 1}. {q.q}
      </Text>
      <div className="mt-3 space-y-2">
        {(q.options ?? []).map((opt: string, j: number) => {
          const isCorrect = j === q.correct;
          const isSelected = selected === j;
          let style = "border-2 border-black bg-card hover:bg-accent";
          if (showResult && isCorrect) style = "border-2 border-emerald-500 bg-emerald-50";
          else if (showResult && isSelected && !isCorrect)
            style = "border-2 border-destructive bg-red-50";
          return (
            <button
              key={j}
              type="button"
              onClick={() => !showResult && setSelected(j)}
              disabled={showResult}
              className={`block w-full text-left rounded p-3 transition-colors ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {showResult && q.explanation && (
        <div className="mt-3 rounded border-2 border-black bg-accent p-3 text-sm">
          <span className="font-head text-xs uppercase tracking-widest mr-2">Why →</span>
          {q.explanation}
        </div>
      )}
    </div>
  );
}

function ProjectSection({ project }: { project: any }) {
  return (
    <Card className="block w-full">
      <Card.Header>
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground">
          Capstone project · {project.estimatedHours}h · portfolio artifact
        </Text>
        <Text as="h3" className="text-2xl mt-2">
          {project.title}
        </Text>
        {project.brief && (
          <Text as="p" className="mt-3 leading-relaxed">
            {project.brief}
          </Text>
        )}
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {project.deliverables && project.deliverables.length > 0 && (
            <div>
              <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground">
                Deliverables
              </Text>
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                {project.deliverables.map((d: string, i: number) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {project.skillsDemonstrated && project.skillsDemonstrated.length > 0 && (
            <div>
              <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground">
                Skills demonstrated
              </Text>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.skillsDemonstrated.map((s: string, i: number) => (
                  <Badge key={i} size="sm" variant="default">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
