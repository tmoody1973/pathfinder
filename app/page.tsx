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
  const [hoursPerWeek, setHoursPerWeek] = useState("5");
  const [city, setCity] = useState("");
  const [currentSalaryK, setCurrentSalaryK] = useState("");
  const [profileText, setProfileText] = useState("");
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const anonymousId = getAnonymousId();
      const hours = parseInt(hoursPerWeek, 10);
      const cityTrim = city.trim();
      const profileTrim = profileText.trim();
      const salaryK = parseInt(currentSalaryK.trim(), 10);
      const currentSalary =
        Number.isFinite(salaryK) && salaryK > 0 ? salaryK * 1000 : undefined;
      const pathId = await createPath({
        anonymousId,
        currentCareer: currentCareer.trim(),
        targetCareer: targetCareer.trim(),
        hoursPerWeek: Number.isFinite(hours) && hours > 0 ? hours : undefined,
        city: cityTrim.length > 0 ? cityTrim : undefined,
        profileText: profileTrim.length > 0 ? profileTrim : undefined,
        currentSalary,
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hours">Hours per week you can dedicate</Label>
                <div className="mt-1.5">
                  <Input
                    id="hours"
                    type="number"
                    min="1"
                    max="40"
                    step="1"
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <Text as="p" className="text-xs text-muted-foreground mt-1">
                  We re-pace the path. 5h/week ≠ 12h/week.
                </Text>
              </div>
              <div>
                <Label htmlFor="city">Your city or metro (optional)</Label>
                <div className="mt-1.5">
                  <Input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Chicago, IL"
                    disabled={submitting}
                  />
                </div>
                <Text as="p" className="text-xs text-muted-foreground mt-1">
                  Salary data gets local. Skip for national medians.
                </Text>
              </div>
            </div>

            <div>
              <Label htmlFor="salary">
                Your current annual salary (optional)
              </Label>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  max="10000"
                  step="5"
                  value={currentSalaryK}
                  onChange={(e) => setCurrentSalaryK(e.target.value)}
                  placeholder="135"
                  disabled={submitting}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">K / year</span>
              </div>
              <Text as="p" className="text-xs text-muted-foreground mt-1">
                Personalizes the lift math. The lift number reflects YOUR pay,
                not the median. Skip if you&apos;d rather see medians.
              </Text>
            </div>

            {/* Profile / résumé paste — collapsible to keep the form short */}
            <div>
              {!profileExpanded ? (
                <button
                  type="button"
                  onClick={() => setProfileExpanded(true)}
                  className="text-sm text-foreground/70 hover:text-foreground underline underline-offset-2 decoration-2"
                  disabled={submitting}
                >
                  + Personalize this with my LinkedIn or résumé (optional)
                </button>
              ) : (
                <div>
                  <Label htmlFor="profile">
                    Paste your LinkedIn About + Experience (or résumé)
                  </Label>
                  <textarea
                    id="profile"
                    value={profileText}
                    onChange={(e) => setProfileText(e.target.value)}
                    placeholder="Paste here. We'll subtract what you already have so the path shows YOUR real gap, not a generic one."
                    disabled={submitting}
                    rows={6}
                    className="mt-1.5 block w-full rounded border-2 border-black bg-card p-3 text-sm font-sans focus:outline-none focus:ring-0 focus:bg-card resize-y"
                    maxLength={8000}
                  />
                  <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                    <Text as="p" className="text-xs text-muted-foreground">
                      Stays in your session. Not stored beyond this path. {profileText.length}/8000
                    </Text>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileExpanded(false);
                        setProfileText("");
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                      disabled={submitting}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
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
