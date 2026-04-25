"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { ConvexError } from "convex/values";
import { api } from "../convex/_generated/api";
import { getAnonymousId } from "./_components/anonymousId";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Label } from "@/components/retroui/Label";
import { Text } from "@/components/retroui/Text";
import { Card } from "@/components/retroui/Card";

export default function Home() {
  const router = useRouter();
  const createPath = useMutation(api.paths.createPath);
  const [currentCareer, setCurrentCareer] = useState("");
  const [targetCareer, setTargetCareer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const anonymousId = getAnonymousId();
      const pathId = await createPath({
        anonymousId,
        currentCareer: currentCareer.trim(),
        targetCareer: targetCareer.trim(),
      });
      router.push(`/path/${pathId}`);
    } catch (err) {
      const message =
        err instanceof ConvexError && typeof err.data === "object" && err.data && "message" in err.data
          ? String((err.data as { message: unknown }).message)
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-16 md:py-24">
      <div className="w-full max-w-2xl">
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          PathFinder · Blackathon 2026
        </Text>
        <Text as="h1" className="text-5xl md:text-6xl leading-none">
          What you do now —<br />
          and what you want to do next.
        </Text>
        <Text as="p" className="mt-6 text-lg leading-relaxed text-foreground/80">
          Type both careers. Watch a multi-agent pipeline build a Udacity-grade
          bridge module — narrative lesson, curated videos, scenario quiz, hands-on
          project — in under a minute. Grounded in real O*NET government skill data.
        </Text>

        <Card className="mt-10 block w-full p-2">
          <form onSubmit={onSubmit} className="p-4 space-y-5">
            <div>
              <Label htmlFor="current">Current career</Label>
              <Input
                id="current"
                type="text"
                required
                autoFocus
                value={currentCareer}
                onChange={(e) => setCurrentCareer(e.target.value)}
                placeholder="e.g. Radio host"
                disabled={submitting}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="target">Target career</Label>
              <Input
                id="target"
                type="text"
                required
                value={targetCareer}
                onChange={(e) => setTargetCareer(e.target.value)}
                placeholder="e.g. UX designer"
                disabled={submitting}
                className="mt-1.5"
              />
            </div>

            {error && (
              <div className="rounded border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitting || !currentCareer.trim() || !targetCareer.trim()}
            >
              {submitting ? "Starting..." : "Build my bridge module →"}
            </Button>
          </form>
        </Card>

        <Text as="p" className="mt-8 text-sm text-muted-foreground">
          Try anything: TikTok influencer, drone pilot, prompt engineer,
          professional dog walker. Careers not in O*NET get mapped to the closest
          functional equivalent by Claude Sonnet 4.6, with reasoning shown.
        </Text>
      </div>
    </main>
  );
}
