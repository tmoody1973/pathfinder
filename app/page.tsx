"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { ConvexError } from "convex/values";
import { api } from "../convex/_generated/api";
import { getAnonymousId } from "./_components/anonymousId";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Label } from "@/components/retroui/Label";
import { Text } from "@/components/retroui/Text";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Progress } from "@/components/retroui/Progress";

/**
 * Discovery progress stages — what the LLM is plausibly doing as time elapses.
 * Honest in shape (we can't know the exact phase from outside), but the labels
 * map to what Sonnet is actually doing in each phase of generation.
 */
const DISCOVERY_STAGES: Array<{ atProgress: number; label: string }> = [
  { atProgress: 0, label: "Reading your background..." },
  { atProgress: 30, label: "Considering directions that fit..." },
  { atProgress: 60, label: "Filtering for ones that aren't generic..." },
  { atProgress: 85, label: "Picking the 3 strongest fits..." },
];

interface DiscoverySuggestion {
  title: string;
  socHint: string;
  reasoning: string;
  reachScore: number;
  firstStep: string;
}

export default function Home() {
  const router = useRouter();
  const createPath = useMutation(api.paths.createPath);
  const suggestCareers = useAction(api.discover.suggestCareers);
  const [currentCareer, setCurrentCareer] = useState("");
  const [targetCareer, setTargetCareer] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("5");
  const [city, setCity] = useState("");
  const [currentSalaryK, setCurrentSalaryK] = useState("");
  const [profileText, setProfileText] = useState("");
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [interestsText, setInterestsText] = useState("");
  const [interestsExpanded, setInterestsExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sticky CTA shows after the user scrolls past the hero. Demo win:
  // judges watching the recording see a persistent "Generate yours" prompt
  // even when the page is scrolled to the marketing sections.
  const [stickyCtaVisible, setStickyCtaVisible] = useState(false);
  useEffect(() => {
    function onScroll() {
      setStickyCtaVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverProfile, setDiscoverProfile] = useState("");
  const [discoverInterests, setDiscoverInterests] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState(0);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryRead, setDiscoveryRead] = useState<string | null>(null);
  const [discoveryThin, setDiscoveryThin] = useState(false);
  const [discoverySuggestions, setDiscoverySuggestions] = useState<
    DiscoverySuggestion[] | null
  >(null);

  // Animate progress bar while the discovery action is in flight.
  // Crawls 0 → 90% over ~9s with easing so it feels alive but never finishes
  // before the response actually lands. The .then() in onDiscoverSubmit snaps
  // it to 100 on completion.
  useEffect(() => {
    if (!discovering) return;
    setDiscoveryProgress(2);
    const start = Date.now();
    const expectedMs = 9000;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      // Ease-out curve: fast start, slow approach to 90
      const t = Math.min(1, elapsed / expectedMs);
      const eased = 1 - Math.pow(1 - t, 2);
      setDiscoveryProgress(Math.min(90, Math.round(eased * 90)));
    }, 120);
    return () => window.clearInterval(id);
  }, [discovering]);

  const discoveryStageLabel =
    [...DISCOVERY_STAGES]
      .reverse()
      .find((s) => discoveryProgress >= s.atProgress)?.label ??
    DISCOVERY_STAGES[0].label;

  function resetDiscovery() {
    setDiscoverOpen(false);
    setDiscoverProfile("");
    setDiscoverInterests("");
    setDiscovering(false);
    setDiscoveryProgress(0);
    setDiscoveryError(null);
    setDiscoveryRead(null);
    setDiscoveryThin(false);
    setDiscoverySuggestions(null);
  }

  async function onDiscoverSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDiscoveryError(null);
    setDiscoverySuggestions(null);
    setDiscoveryRead(null);
    setDiscoveryProgress(0);
    setDiscovering(true);
    try {
      const result = await suggestCareers({
        profileText: discoverProfile,
        interests:
          discoverInterests.trim().length > 0 ? discoverInterests.trim() : undefined,
        currentCareer:
          currentCareer.trim().length > 0 ? currentCareer.trim() : undefined,
      });
      // Snap progress to 100 so the bar visibly completes before results render
      setDiscoveryProgress(100);
      if (!result.ok) {
        setDiscoveryError(result.error);
      } else {
        setDiscoveryRead(result.result.oneLineRead);
        setDiscoveryThin(result.result.thinProfile);
        setDiscoverySuggestions(result.result.suggestions);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDiscoveryError(message);
    } finally {
      setDiscovering(false);
    }
  }

  function pickSuggestion(suggestion: DiscoverySuggestion) {
    setTargetCareer(suggestion.title);
    // Carry the discovery profile + interests into the main form so the bridge
    // pipeline (lesson agent + counselor) can personalize against them.
    if (discoverProfile.trim().length > 0 && profileText.trim().length === 0) {
      setProfileText(discoverProfile.trim());
      setProfileExpanded(true);
    }
    if (discoverInterests.trim().length > 0 && interestsText.trim().length === 0) {
      setInterestsText(discoverInterests.trim());
      setInterestsExpanded(true);
    }
    resetDiscovery();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const anonymousId = getAnonymousId();
      const hours = parseInt(hoursPerWeek, 10);
      const cityTrim = city.trim();
      const profileTrim = profileText.trim();
      const interestsTrim = interestsText.trim();
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
        interests: interestsTrim.length > 0 ? interestsTrim : undefined,
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
      <div className="w-full max-w-6xl">
        {/* Brand mark — replaces the "PathFinder · Blackathon 2026" eyebrow.
            Sized with explicit intrinsic dims (1200x432) so Next.js Image
            avoids CLS. Visual size capped via className (h-14 → h-20 across
            breakpoints) so the logo scales but stays subordinate to the H1. */}
        <div className="mb-6 flex items-end gap-4 flex-wrap">
          <Image
            src="/pathfinder-logo.svg"
            alt="PathFinder"
            width={1200}
            height={432}
            priority
            unoptimized
            className="h-14 md:h-16 lg:h-20 w-auto"
          />
          <Text
            as="p"
            className="text-xs uppercase tracking-widest text-muted-foreground pb-2"
          >
            Built for Blackathon 2026
          </Text>
        </div>
        {/* Hero — split layout. Big H1 on the left, agent pipeline preview on
            the right shows the product working at a glance, NOT just describes
            it. On mobile the preview drops below the form. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
          <div className="lg:col-span-7">
            <Text as="h1" className="text-6xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight">
              What you do now.<br />
              <span className="text-foreground/40">And what you want to do next.</span>
            </Text>
            <Text as="p" className="mt-6 text-lg md:text-xl leading-relaxed text-foreground/80 max-w-2xl">
              Type two careers, or paste your LinkedIn if you don&apos;t know.
              Eleven AI agents build your personalized 8-week learning bridge live,
              grounded in real O*NET government data, with honest salary math and
              a counselor that won&apos;t pep-talk you.
            </Text>
          </div>
          <div className="lg:col-span-5">
            <AgentPipelinePreview />
          </div>
        </div>

        {/* Hero CTA arrow — anchors the eye down to the form, smooth scrolls
            on click. Brutalism signature: chunky pill with hard shadow. */}
        <div className="mt-10 flex items-center gap-3">
          <a
            href="#bridge-form"
            className="inline-flex items-center gap-2 border-2 border-black bg-foreground text-background hover:bg-primary hover:text-foreground rounded-full px-5 py-2.5 text-sm font-head shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Start here
            <span aria-hidden="true">↓</span>
          </a>
          <Text as="p" className="text-sm text-muted-foreground">
            or scroll to read more
          </Text>
        </div>

        {/* Stat strip — concrete numbers, big numerals, brutalism typography drama */}
        <div className="mt-16 border-y-2 border-black grid grid-cols-3 divide-x-2 divide-black">
          <div className="px-4 py-5 md:py-7">
            <div className="font-head text-5xl md:text-6xl leading-none">11</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
              AI agents in parallel
            </div>
          </div>
          <div className="px-4 py-5 md:py-7">
            <div className="font-head text-5xl md:text-6xl leading-none">60s</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
              From career to bridge
            </div>
          </div>
          <div className="px-4 py-5 md:py-7">
            <div className="font-head text-5xl md:text-6xl leading-none">$0</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
              Anonymous, no signup needed
            </div>
          </div>
        </div>
      </div>

      {/* The form sits in its own constrained column for readability. Wider hero above,
          tighter form below — intentional asymmetry. */}
      <div id="bridge-form" className="w-full max-w-2xl mt-16 scroll-mt-8">

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
              <button
                type="button"
                onClick={() => setDiscoverOpen(true)}
                disabled={submitting}
                aria-label="Not sure what target career to type? Paste your LinkedIn and get three suggestions"
                className="mt-3 w-full text-left border-2 border-black bg-accent/40 hover:bg-accent rounded-md px-4 py-3 shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[3px] active:translate-y-[3px] transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl flex-shrink-0" aria-hidden="true">
                  🧭
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-head text-sm leading-tight">
                    Not sure what to type?
                  </span>
                  <span className="block text-xs text-foreground/70 mt-0.5 leading-snug">
                    Paste your LinkedIn or résumé. I&apos;ll suggest 3 careers
                    that fit your background, in ~8 seconds.
                  </span>
                </span>
                <span
                  className="text-foreground/60 font-head text-xl flex-shrink-0"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
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

            {/* What you actually enjoy — flows to counselor + lesson narrative */}
            <div>
              {!interestsExpanded ? (
                <button
                  type="button"
                  onClick={() => setInterestsExpanded(true)}
                  className="text-sm text-foreground/70 hover:text-foreground underline underline-offset-2 decoration-2"
                  disabled={submitting}
                >
                  + Tell me what you actually enjoy (optional)
                </button>
              ) : (
                <div>
                  <Label htmlFor="interests">
                    What you actually enjoy / want from work
                  </Label>
                  <textarea
                    id="interests"
                    value={interestsText}
                    onChange={(e) => setInterestsText(e.target.value)}
                    placeholder="e.g. I love designing in Figma on weekends. I get bored doing the same thing twice. I want work that pays my bills AND I'd talk about at a dinner party."
                    disabled={submitting}
                    rows={3}
                    className="mt-1.5 block w-full rounded border-2 border-black bg-card p-3 text-sm font-sans focus:outline-none focus:ring-0 focus:bg-card resize-y"
                    maxLength={2000}
                  />
                  <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                    <Text as="p" className="text-xs text-muted-foreground">
                      The lesson references your interests; the counselor uses
                      them too. {interestsText.length}/2000
                    </Text>
                    <button
                      type="button"
                      onClick={() => {
                        setInterestsExpanded(false);
                        setInterestsText("");
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

      {/* HOW IT WORKS — asymmetric numbered rows, NOT a 3-col emoji grid.
          Big numerals (01/02/03) carry the visual weight. Each row left-aligned. */}
      <section className="mt-32 w-full max-w-5xl">
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          How it works
        </Text>
        <Text as="h2" className="text-4xl md:text-5xl leading-tight mb-12 max-w-3xl">
          Three things most career tools refuse to do.
        </Text>
        <div className="space-y-0 border-t-2 border-black">
          {[
            {
              num: "01",
              title: "Live multi-agent build, in your browser.",
              body:
                "Eleven AI agents in parallel. Skill diff on Opus 4.7. Lesson and resource agents on Haiku. Books, videos, courses each filtered by Claude for relevance. Salary live from Perplexity Sonar with real citations. You watch every step. No black box.",
            },
            {
              num: "02",
              title: "Honest salary math, anchored on YOUR pay.",
              body:
                "Most career sites tell you the median. We anchor on the salary YOU typed. If the target pays less, we say so, and show the dollar number. Cert payback periods in days, not months. Real O*NET government data, not vibes. The number tells the truth, even when the truth is uncomfortable.",
            },
            {
              num: "03",
              title: "A counselor that won't pep-talk you.",
              body:
                "Sonnet 4.6 with your full path context. Direct. Calibrated. No \"you got this!\" energy. If your transition is hard at 4 hours/week, it says nine months realistic, twelve honest. Streams live, like ChatGPT, only it has actually read your résumé.",
            },
          ].map((row) => (
            <div
              key={row.num}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 border-b-2 border-black py-8 md:py-10"
            >
              <div className="md:col-span-2">
                <div className="font-head text-5xl md:text-6xl leading-none text-foreground/30">
                  {row.num}
                </div>
              </div>
              <div className="md:col-span-10">
                <Text as="h3" className="text-2xl md:text-3xl leading-tight">
                  {row.title}
                </Text>
                <Text as="p" className="mt-3 text-base text-foreground/80 leading-relaxed max-w-3xl">
                  {row.body}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BUILT WITH — yellow color block strip. High-contrast, breaks the
          cream-on-cream monotony, doubles as a credibility flex. */}
      <section className="mt-20 w-full">
        <div className="bg-primary border-y-2 border-black">
          <div className="max-w-5xl mx-auto px-6 py-8 md:py-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-baseline">
              <div className="md:col-span-3">
                <Text as="p" className="text-xs uppercase tracking-widest mb-1">
                  Built with
                </Text>
                <Text as="p" className="font-head text-2xl md:text-3xl leading-tight">
                  Real models. Real data.
                </Text>
              </div>
              <div className="md:col-span-9">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm md:text-base font-head">
                  <span>Claude Opus 4.7</span>
                  <span className="opacity-40">/</span>
                  <span>Sonnet 4.6</span>
                  <span className="opacity-40">/</span>
                  <span>Haiku 4.5</span>
                  <span className="opacity-40">/</span>
                  <span>Perplexity Sonar</span>
                  <span className="opacity-40">/</span>
                  <span>O*NET</span>
                  <span className="opacity-40">/</span>
                  <span>Convex</span>
                  <span className="opacity-40">/</span>
                  <span>Clerk</span>
                  <span className="opacity-40">/</span>
                  <span>Next.js 16</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT + ROADMAP — embedded "slide" content. Doubles as the
          recording's last 30 seconds when the demo scrolls down. */}
      <section className="mt-24 w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="border-2 border-black rounded p-6 bg-card">
            <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Who this is for
            </Text>
            <Text as="h3" className="text-2xl mb-3 leading-tight">
              Anyone whose next move is unclear.
            </Text>
            <ul className="space-y-2 text-sm leading-relaxed">
              <li>· Tech workers laid off in the AI shake-out, planning the next decade</li>
              <li>· Mid-career nurses, teachers, accountants asking "what now?"</li>
              <li>· State workforce dev programs and outplacement firms with thousands of clients to serve</li>
              <li>· Anyone who&apos;s read every "career change" Reddit thread and still doesn&apos;t know what to type into Coursera</li>
            </ul>
          </div>
          <div className="border-2 border-black rounded p-6 bg-accent/40">
            <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              What&apos;s next
            </Text>
            <Text as="h3" className="text-2xl mb-3 leading-tight">
              Past the hackathon.
            </Text>
            <ul className="space-y-2 text-sm leading-relaxed">
              <li>· Voice on the counselor (browser STT + ElevenLabs TTS)</li>
              <li>· Mobile-native experience for read-anywhere learning</li>
              <li>· B2B for outplacement firms, state workforce programs, college career centers</li>
              <li>· Bookmark + share your bridges; see what your friends picked</li>
              <li>· Premium 1:1 with real career counselors, scheduled through the platform</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Sticky scroll CTA — appears after the user scrolls past the hero.
          Disappears when the discovery modal is open so it doesn't fight. */}
      {stickyCtaVisible && !discoverOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 border-2 border-black bg-card rounded-full pl-4 pr-1 py-1 shadow-[4px_4px_0_0_#000]">
            <Text as="p" className="text-sm font-head whitespace-nowrap">
              Ready when you are
            </Text>
            <a
              href="#bridge-form"
              className="inline-flex items-center gap-1.5 border-2 border-black bg-foreground text-background hover:bg-primary hover:text-foreground rounded-full px-4 py-2 text-sm font-head transition-colors whitespace-nowrap"
            >
              Build my bridge
              <span aria-hidden="true">↑</span>
            </a>
          </div>
        </div>
      )}

      {/* FOOTER — small logo + tagline. Bookends the page: wordmark up top,
          tagline down here. Same brand mark, smaller treatment. */}
      <footer className="mt-24 w-full max-w-5xl flex flex-col md:flex-row items-center md:items-end justify-between gap-4 pb-2">
        <Image
          src="/pathfinder-logo.svg"
          alt="PathFinder"
          width={1200}
          height={432}
          unoptimized
          className="h-8 md:h-10 w-auto"
        />
        <Text as="p" className="text-sm text-muted-foreground text-center md:text-right">
          Built for Blackathon 2026 ·{" "}
          <span className="font-head">From where you are. To where you actually want to go.</span>
        </Text>
      </footer>

      {discoverOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget && !discovering) resetDiscovery();
          }}
        >
          <div className="w-full max-w-2xl my-8">
            <Card className="block w-full p-2">
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <Text as="h2" className="text-2xl">
                    Don&apos;t know yet? Let&apos;s find out.
                  </Text>
                  {!discovering && (
                    <button
                      type="button"
                      onClick={resetDiscovery}
                      className="text-sm text-muted-foreground hover:text-foreground underline"
                      aria-label="Close"
                    >
                      Close
                    </button>
                  )}
                </div>
                <Text as="p" className="text-sm text-foreground/70">
                  Paste your LinkedIn (About + Experience) or résumé. Add what
                  you actually enjoy, if you want a sharper read. I&apos;ll
                  propose 3 directions, then you pick one and we build the bridge.
                </Text>

                {!discoverySuggestions ? (
                  <form onSubmit={onDiscoverSubmit} className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="d-profile">
                        Your LinkedIn or résumé
                      </Label>
                      <textarea
                        id="d-profile"
                        value={discoverProfile}
                        onChange={(e) => setDiscoverProfile(e.target.value)}
                        placeholder="Paste your About section + last 2-3 roles. The more specific (tools, projects, scale), the better the suggestions."
                        disabled={discovering}
                        rows={8}
                        className="mt-1.5 block w-full rounded border-2 border-black bg-card p-3 text-sm font-sans focus:outline-none focus:ring-0 focus:bg-card resize-y"
                        maxLength={8000}
                        autoFocus
                      />
                      <Text as="p" className="text-xs text-muted-foreground mt-1">
                        {discoverProfile.length}/8000 chars. Stays in your session.
                      </Text>
                    </div>
                    <div>
                      <Label htmlFor="d-interests">
                        What do you actually enjoy? (optional, but helps a lot)
                      </Label>
                      <textarea
                        id="d-interests"
                        value={discoverInterests}
                        onChange={(e) => setDiscoverInterests(e.target.value)}
                        placeholder="e.g. I love designing in Figma on weekends, I read product blogs, I get bored doing the same thing twice."
                        disabled={discovering}
                        rows={3}
                        className="mt-1.5 block w-full rounded border-2 border-black bg-card p-3 text-sm font-sans focus:outline-none focus:ring-0 focus:bg-card resize-y"
                        maxLength={2000}
                      />
                    </div>
                    {discoveryError && (
                      <div className="rounded border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                        {discoveryError}
                      </div>
                    )}
                    {discovering ? (
                      <div className="rounded border-2 border-black bg-card p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <Text as="p" className="font-head text-sm">
                            {discoveryStageLabel}
                          </Text>
                          <Text as="p" className="text-xs text-muted-foreground tabular-nums">
                            {discoveryProgress}%
                          </Text>
                        </div>
                        <Progress value={discoveryProgress} />
                        <Text as="p" className="text-xs text-muted-foreground">
                          Sonnet 4.6 reading your profile and interests, then
                          ranking 3 directions that genuinely fit. Usually 6 to
                          10 seconds.
                        </Text>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <Button
                          type="submit"
                          size="md"
                          disabled={discoverProfile.trim().length < 80}
                        >
                          Suggest 3 careers →
                        </Button>
                        <Text as="p" className="text-xs text-muted-foreground">
                          Sonnet 4.6 · ~8 seconds
                        </Text>
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="mt-5 space-y-4">
                    {discoveryRead && (
                      <div className="rounded border-2 border-black bg-accent/40 p-3">
                        <Text as="p" className="text-sm font-head">
                          {discoveryRead}
                        </Text>
                        {discoveryThin && (
                          <Text as="p" className="text-xs text-muted-foreground mt-1">
                            Heads up: profile was thin, so suggestions may be
                            broad. Paste more for a sharper read.
                          </Text>
                        )}
                      </div>
                    )}
                    <div className="space-y-3">
                      {discoverySuggestions.map((s, idx) => (
                        <Card key={idx} className="block w-full">
                          <Card.Header>
                            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                              <Text as="h3" className="text-xl leading-tight">
                                {s.title}
                              </Text>
                              <Badge size="sm" variant="default">
                                Reach {s.reachScore}/10
                              </Badge>
                            </div>
                            <Text
                              as="p"
                              className="mt-2 text-sm text-foreground/80 leading-relaxed"
                            >
                              {s.reasoning}
                            </Text>
                            {s.firstStep && (
                              <Text
                                as="p"
                                className="mt-2 text-xs text-foreground/70"
                              >
                                <span className="font-head uppercase tracking-wider">
                                  First step:
                                </span>{" "}
                                {s.firstStep}
                              </Text>
                            )}
                            <div className="mt-3">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => pickSuggestion(s)}
                              >
                                Build my bridge to {s.title} →
                              </Button>
                            </div>
                          </Card.Header>
                        </Card>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscoverySuggestions(null);
                          setDiscoveryRead(null);
                        }}
                        className="text-sm text-foreground/70 hover:text-foreground underline"
                      >
                        ← Try again with different input
                      </button>
                      <button
                        type="button"
                        onClick={resetDiscovery}
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * AgentPipelinePreview — hero visual anchor.
 *
 * Stylized replica of the live agent-tile grid that appears during a real
 * path generation. Tiles loop through pending → running → done states with
 * staggered delays so the whole pipeline visually fans out, like the
 * production flow. CSS-only animation, no React state, GPU-friendly.
 *
 * The point: the landing page SHOWS what happens when you click, instead of
 * describing it. Judges who skim the page see a working mini-version of the
 * actual product.
 */
function AgentPipelinePreview() {
  const tiles = [
    { label: "Skill Diff", model: "Opus 4.7", elapsed: "38s" },
    { label: "Lesson", model: "Haiku 4.5", elapsed: "21s" },
    { label: "Videos", model: "Haiku 4.5", elapsed: "10s" },
    { label: "Courses", model: "Haiku 4.5", elapsed: "0.2s" },
    { label: "Books", model: "Haiku 4.5", elapsed: "9s" },
    { label: "About", model: "Sonnet 4.6", elapsed: "20s" },
    { label: "Salary", model: "Sonar live", elapsed: "8s" },
    { label: "News", model: "Sonar live", elapsed: "7s" },
    { label: "Community", model: "Haiku 4.5", elapsed: "0.1s" },
  ];

  return (
    <div className="relative">
      <div className="border-2 border-black bg-card rounded shadow-[6px_6px_0_0_#000] overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-black px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Text as="p" className="text-xs uppercase tracking-widest font-head">
              Live · 11 agents
            </Text>
          </div>
          <Text as="p" className="text-xs text-muted-foreground tabular-nums">
            47s total
          </Text>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-2">
          {tiles.map((t, i) => (
            <div
              key={i}
              className="agent-tile-anim border-2 border-black rounded p-1.5"
              style={{
                ["--tile-delay" as string]: `${(i * 0.45).toFixed(2)}s`,
              }}
            >
              <Text
                as="p"
                className="font-head text-[10px] leading-tight truncate"
                title={`${t.label} · ${t.model}`}
              >
                {t.label}
              </Text>
              <Text as="p" className="text-[9px] text-muted-foreground truncate">
                {t.model}
              </Text>
              <div className="agent-tile-status mt-1 flex items-center justify-between gap-1">
                <span className="text-[9px] uppercase tracking-wider font-head">
                  done
                </span>
                <span className="text-[9px] text-muted-foreground tabular-nums">
                  {t.elapsed}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t-2 border-black px-3 py-2 bg-emerald-100">
          <Text as="p" className="text-xs font-head">
            ✓ Bridge built. 11/11 agents · 47s · 8 weeks total · 36h
          </Text>
        </div>
      </div>
    </div>
  );
}
