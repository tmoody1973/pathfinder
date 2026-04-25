# Demo Recording Checklist

Run through every section before hitting record. If anything fails, fix it or have a fallback ready. Each section is a few minutes; total run-through ~25-30 minutes.

If you're short on time, the **CRITICAL** sections must pass. The rest are nice-to-have.

---

## Pre-flight (run this first, 5 minutes)

- [ ] **CRITICAL** `bunx convex dev` running in one terminal, no errors in stream
- [ ] **CRITICAL** `bun dev` running in another, browser at `http://localhost:3001`, no console errors on load
- [ ] **CRITICAL** Test the deployed Vercel URL: https://pathfinder-phl3sp7nx-tmoody1973s-projects.vercel.app — loads with HTTP 200, no auth wall
- [ ] Open Chrome (NOT Firefox — Web Speech API isn't supported there)
- [ ] Mic permissions granted (System Settings → Privacy → Microphone → Chrome ON)
- [ ] Browser zoom at 100% (Cmd+0 to reset)
- [ ] DevTools console open in a side window — watch for red errors during demo
- [ ] Phone or second monitor showing SLIDES.md and RESEARCH.md for reference
- [ ] Screen recorder (QuickTime / OBS / Loom) configured: 1080p+, 30fps, audio from default mic

Optional but smart:
- [ ] Close Slack, Discord, email, anything that pings during recording
- [ ] Disable browser notifications (Settings → Privacy → Notifications)
- [ ] Quit unused apps to keep the laptop cool and Convex/Anthropic responsive

---

## Test 1: Landing page renders cleanly · CRITICAL

Visit `http://localhost:3001` (or the Vercel URL).

- [ ] Logo renders crisp (SVG, not pixelated)
- [ ] H1 reads at full size, two-tone color (foreground + foreground/40)
- [ ] Subhead about "eleven AI agents" present
- [ ] **CRITICAL** Animated agent pipeline preview on the right of hero is animating — tiles cycle pending → running → done with stagger
- [ ] "Start here ↓" pill button visible, hover slides 2px down-right
- [ ] Stat strip below hero: 11 / 60s / $0 with massive numerals
- [ ] Form section reachable by clicking "Start here"
- [ ] "Not sure?" callout with 🧭 icon visible below target career field, big and clickable
- [ ] "How it works" section: numbered rows (01, 02, 03), no emoji, no centered grid
- [ ] Yellow color block "Built with" strip
- [ ] Impact + Roadmap 2-col blocks at the bottom
- [ ] Footer: small logo + tagline
- [ ] Scroll past hero → sticky "Build my bridge ↑" pill appears bottom-center

If logo is broken / agent preview not animating: hard refresh (Cmd+Shift+R), check browser console.

---

## Test 2: Discovery flow · CRITICAL (this is the demo opener)

- [ ] Click the "Not sure?" callout
- [ ] Modal opens with profile + interests fields
- [ ] Paste a real LinkedIn into the profile field. **Recommended for Blackathon demo:** a federal records administrator profile or similar federal-government background. This makes the structural relevance unmistakable.
- [ ] Optional: type 1-2 lines of interests
- [ ] Click "Suggest 3 careers →"
- [ ] **CRITICAL** Progress bar shows + stage labels rotate: "Reading your background..." → "Considering directions that fit..." → "Filtering for ones that aren't generic..." → "Picking the 3 strongest fits..."
- [ ] After ~6-10s: 3 career cards appear with reasoning, reach score badge, first-step suggestion
- [ ] **CRITICAL** Each card's reasoning cites specific phrases from the profile (NOT generic). If reasoning is generic, regenerate.
- [ ] Click "Build my bridge to [career] →" on one card
- [ ] Modal closes, target career field auto-fills, profile carried over (collapsible expanded)

**Demo profile to use** (suggested for Blackathon — paste from your phone or a doc):

> "Senior Records Administrator at U.S. Department of Health and Human Services, GS-9 step 7, 18 years of federal service. Managed compliance documentation across HHS regional office. Stakeholder management with state agencies, audit response, regulatory tracking. Recently affected by 2025 federal workforce reductions."

If suggestions feel generic with that profile, the system prompt for `targetResolver.ts` needs tightening. Note for post-demo.

---

## Test 3: Bridge generation · CRITICAL (the wow moment)

After clicking "Build my bridge", you're redirected to `/path/[id]`.

- [ ] Page loads, breadcrumb visible at top, H1 shows the module title
- [ ] **CRITICAL** Agent pipeline shows 11 tiles, all starting as "pending"
- [ ] Skill Diff (Opus 4.7) goes first: pending → running (yellow) → done (green) in ~30-50s
- [ ] Once skill diff is done, 9 other agents fan out in parallel (yellow simultaneously)
- [ ] All eventually go green (NO red errors)
- [ ] **CRITICAL** Description agent (About this career · Sonnet 4.6) completes within 60s. If it errors with "timed out after 30000ms", you forgot to deploy the timeout fix — see fallback.
- [ ] Total path generation: ~45-65s
- [ ] Once status="done", three sections auto-collapse 8 seconds later: salary panel → strip; path outline → horizontal stepper; agent pipeline → chip
- [ ] **TIP for recording**: if you want all tiles visible during the recording without auto-collapse, temporarily change `8000` to `300000` in three useEffect calls in `app/path/[id]/page.tsx` (SalaryPanel, PathOutlineView, AgentPipeline)

---

## Test 4: Path page sections rendered

After bridge completes:

- [ ] "Why this bridge" framing visible directly under H1, as a left-bordered quote (NOT a labeled card)
- [ ] Salary panel shows: your salary → target salary, +/-% delta, Outlook %, entry education
- [ ] Path outline visible (or collapsed to stepper after 8s)
- [ ] Tabs row: Lesson · Videos · Courses · Books · About this career · Quiz · Project · Community

---

## Test 5: Tabs · CRITICAL

### Lesson tab
- [ ] Intro paragraph references the user's profile context (if profile was provided)
- [ ] 3-4 accordion sections, each clickable to expand
- [ ] Each section has a "Try this" exercise
- [ ] Spaced review schedule note at bottom

### Videos tab
- [ ] 6 videos shown by default
- [ ] Each has thumbnail, title, channel, duration, relevance %
- [ ] **CRITICAL** Click a video — opens in modal player with iframe embed (NOT new tab)
- [ ] Modal has "Open on YouTube ↗" link as escape hatch
- [ ] Esc / click outside closes modal
- [ ] "+ Show N more" expands to all 12 if available

### Courses tab
- [ ] 3-5 courses listed with audit cost / cert cost / placement signal

### Books tab
- [ ] 5 books shown by default, on-topic for the target career
- [ ] **CRITICAL** No DevOps books on a Product Manager target. No generic "Management Fundamentals" textbooks. If you see those, the books relevance filter is broken — flag and regenerate.
- [ ] Each book has a relevance score % bar
- [ ] "+ Show N more" expands to all 12

### About this career tab · CRITICAL (this is the new flagship tab)
- [ ] One-line career definition as a big quote
- [ ] Day in the life: morning / afternoon / weekly arc cards
- [ ] Tools & artifacts grid with real tool names (Figma, Linear, SQL, etc.)
- [ ] Career ladder: 4-6 rungs with comp ranges
- [ ] Trade-offs: pros (green) and cons (rose) side-by-side, **honest** language
- [ ] Entry pathways with proportions
- [ ] Adjacent careers + Who you work with (2-col)
- [ ] Recent news section with Sonar-fetched items (real URLs)
- [ ] **OPTIONAL** Scholarly research section: top 5 papers with citation counts. Hides entirely for trades/creative careers (no embarrassment).

### Quiz tab
- [ ] 5 questions, multiple choice
- [ ] Submit shows score

### Project tab
- [ ] Project description visible

### Community tab
- [ ] Communities + people-to-follow + newsletters listed

---

## Test 6: Counselor — text mode · CRITICAL

- [ ] Click floating "💬 Ask the counselor" button (bottom-right)
- [ ] Chat panel opens with header reading "AI Career Counselor · Sonnet 4.6 · sees your full path"
- [ ] Voice toggle in header reads "🔊 Voice ON" by default
- [ ] Toggle it OFF for this test (we'll test voice next)
- [ ] Type or click a starter question: "Is this transition realistic given my hours per week and age?"
- [ ] Press Enter to send
- [ ] **CRITICAL** Empty assistant bubble appears immediately under your question
- [ ] **CRITICAL** Text streams in word-by-word over 6-10s (NOT all at once at the end)
- [ ] Markdown formatting renders: bold (font-head), italic, lists, horizontal rules, links
- [ ] Auto-scrolls to bottom as new content arrives

### Counselor structural awareness check
Send this question: **"I just lost my federal job. I'm a Black woman, primary breadwinner, 47, two kids. Is product management realistic for me?"**

The response should:
- [ ] **CRITICAL** Acknowledge the federal-employment context (transferable skills: regulatory, compliance, stakeholder management, scale ops)
- [ ] **CRITICAL** Address breadwinner constraints (income continuity matters, not "take a year off")
- [ ] Reference specific timelines, not generic encouragement
- [ ] Mention discrimination math or network gap if relevant ("apply broadly converts differently for different candidates")
- [ ] NOT pep-talk ("you got this!")
- [ ] NOT recommend a $15K bootcamp without financial justification

If the response is generic or pep-talky, the structural awareness section in `convex/agents/counselor.ts` needs further tuning. Note for post-demo, but should be live now.

---

## Test 7: Counselor — voice mode · CRITICAL

- [ ] Toggle voice mode back ON
- [ ] Mic button (🎙) appears in input row
- [ ] Click mic
- [ ] Browser asks for microphone permission (first time only) — grant it
- [ ] Mic button turns red and pulses, placeholder reads "Listening… speak now"
- [ ] Speak: "What credentials actually matter for this transition?"
- [ ] **CRITICAL** Words appear in the input field as you speak (interim transcript)
- [ ] Click Send (or wait for auto-stop on silence)
- [ ] Counselor streams response text
- [ ] **CRITICAL** ~1-3 seconds after streaming completes, audio auto-plays your ElevenLabs voice
- [ ] Inline `<audio controls>` lets you replay or scrub
- [ ] Per-message audio is preserved if you scroll up

**If audio doesn't play:**
- Browser autoplay policy. Click anywhere on the page first, then send a new message.
- Convex env: confirm `ELEVENLABS_API_KEY` is set with `bunx convex env list`.
- ElevenLabs credit balance: check at elevenlabs.io/app/usage.

---

## Test 8: Auto-collapse behavior · IMPORTANT

After path is "done" for 8+ seconds:

- [ ] Salary panel collapsed to one-line strip with "expand ▾"
- [ ] Path outline collapsed to horizontal module stepper (1 / 2 / 3 / ...)
- [ ] Agent pipeline collapsed to chip "X/11 agents · 47s · expand ▾"
- [ ] Click any "expand" → section reopens
- [ ] Click "collapse" in expanded header → re-collapses (state respects user override)

For demo recording: decide if you want auto-collapse on (shows the page reorganizing itself, a moment of polish) or off (everything stays visible). Off requires the 8000 → 300000 patch.

---

## Test 9: Edge cases · NICE TO HAVE

- [ ] Refresh path page mid-generation → state preserves, agents continue from where they left off
- [ ] Open `/paths` → if signed in, dashboard shows your bridges
- [ ] Open in incognito → anonymous session works, no auth required
- [ ] Mobile viewport (Chrome DevTools → Toggle device toolbar → iPhone 14): form usable, layout collapses cleanly, counselor still works

---

## Test 10: Performance · IMPORTANT

- [ ] Total page load on landing: under 3 seconds
- [ ] Bridge generation: 45-65s end-to-end (one Opus call + 9 Haiku calls + 1 Sonnet call in parallel)
- [ ] Counselor response: text streaming starts within 1-2s of Send, completes in 6-10s
- [ ] Voice synthesis: audio URL appears 1-3s after text streaming completes

If any of these are noticeably slower, blame:
- Anthropic rate limits (try a different demo path)
- Convex cold start (warm by hitting the URL once before recording)
- Network (use ethernet if possible during recording)

---

## Demo killer fallbacks

If something breaks on stage, you have options.

**Bridge generation fails or times out:**
- Retry with a different career pair. "Customer Service Manager → Product Manager" is a strong fallback.
- Or, navigate to a previously generated path. Type the path URL directly: `localhost:3001/path/<id>`.

**Counselor voice fails:**
- Toggle voice OFF, demo with text-only streaming. Still impressive.

**Description agent times out:**
- The About-this-career tab will show "still generating". Skip it during demo, return to it later in the recording, or demo a different path that already has a working description.

**Books tab shows off-topic results:**
- This means the relevance filter failed on this run. Pick a different target career that you've already verified.

**Vercel auth wall comes back:**
- Confirm SSO protection is off via dashboard: vercel.com → pathfinder → Settings → Deployment Protection → None.
- Or fall back to localhost recording.

---

## Pre-recording warm-up

5 minutes before you hit record:

1. Generate ONE demo path end-to-end. This warms Convex and pre-caches the agent pipeline. The actual recording will be smoother.
2. Send ONE counselor message in voice mode. This unlocks browser autoplay so the actual demo audio plays without user interaction.
3. Pre-load one page with all tabs working. If your demo target ends up flaky, you have a known-good URL to navigate to.
4. Run through the demo flow once silently, no recording. Time it. Adjust pacing.

---

## After recording

- [ ] Stop recording, review playback
- [ ] Check audio levels (counselor voice + your narration both audible?)
- [ ] Check screen quality (text readable at 1080p?)
- [ ] If reshooting, copy this checklist again and redo

---

## Notes column

Use this space to track issues found during rehearsal:

- ___________________________________________________________________
- ___________________________________________________________________
- ___________________________________________________________________
- ___________________________________________________________________
- ___________________________________________________________________
