"use client";

import { use } from "react";
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
      </div>
    </main>
  );
}
