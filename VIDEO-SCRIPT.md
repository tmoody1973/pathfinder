# PathFinder — Demo Video Script (On-Camera Version)

3-minute demo for Blackathon 2026. You're on camera for the open and close, voiceover during the product demo. Total runtime hard cap: 3:00.

The on-camera angle is a Blackathon strength, not a constraint. Judges see the person behind the product, not just an AI. Lean into it.

---

## The shape

| # | Scene | Time | Mode | What audience sees |
|---|---|---|---|---|
| 1 | The moment | 0:00–0:25 | **ON CAMERA** | You, talking to camera. Stakes-setting. |
| 2 | Meet the user | 0:25–0:45 | VO + screen | Persona card → landing page |
| 3 | Discovery flow | 0:45–1:15 | VO + screen | Paste LinkedIn → 3 cards |
| 4 | The build | 1:15–1:50 | VO + screen | 11 agent tiles flipping live |
| 5 | The product | 1:50–2:20 | VO + screen | Scroll path page (about / salary) |
| 6 | The counselor | 2:20–2:45 | **BUBBLE CAM + live audio** | You + product, you ask, voice replies |
| 7 | Close | 2:45–3:00 | **ON CAMERA** | You, direct to camera. Closing line. |

**Mode legend**:
- ON CAMERA = your face full-frame, no product visible
- VO + screen = voiceover (your voice) over a screen recording, no face
- BUBBLE CAM = your face in a corner overlay while screen plays

---

# SCENE 1 · The moment (0:00–0:25, ~25s) · ON CAMERA

## What you're doing

Sitting in front of the camera, talking directly to the lens. No product, no slides. Just you, eye contact, the stakes.

This is the most important scene of the video. First 5 seconds determine whether judges keep watching. **You looking into the camera and naming the moment is more powerful than any infographic.**

## What you say (verbatim)

> I'm a Black builder.
>
> Two displacements are hitting Black workers right now at the same time.
>
> One — the Department of Government Efficiency. Federal employment built much of the Black middle class since the post-Great-Society civil-service reforms. Black workers are eighteen percent of the federal workforce. Black women, fourteen percent. DOGE is reversing that in real time.
>
> Two — AI. The customer-service jobs, admin jobs, records jobs Black workers would historically pivot into are themselves being automated.
>
> I built PathFinder for that moment.

~80 words, ~25 seconds at conversational pace.

## Performance notes

- **Eye contact**: look at the camera lens, not the screen
- **Pace**: slow. Pause one full beat after "I'm a Black builder." Pause again after the eighteen-percent and fourteen-percent stats. Pause again after "in real time." The data lands when there's space around it.
- **Energy**: serious, not somber. Direct, not preachy. You're stating facts.
- **Don't smile** during this scene. Save it for scene 7.
- **Hands**: visible if possible. Light gestures on the data points add credibility.

## Recording

- Record this scene in **multiple takes**. 3-5 takes is normal. Pick the best one.
- Camera at eye level. Webcam works; external is better.
- Frame: shoulders and up. Small gap above your head.
- Look at the lens, not the screen. The dot above the camera, not the preview.

## Optional alternate opening (if "I'm a Black builder" feels too direct)

> I watched this coming. DOGE on one side, AI on the other. Both hitting the same households, the same year. I built PathFinder for that moment.
>
> Two displacements. Same household. Same year. Black workers are eighteen percent of the federal workforce. Black women, fourteen percent. The federal jobs that built the Black middle class are getting cut. The customer-service and admin jobs Black workers would have pivoted into next are being automated. Both at once.

Either works. Use whichever feels more honest to your voice.

---

# SCENE 2 · Meet the user (0:25–0:45, ~20s) · VO + screen

## What audience sees

A 5-second persona card on screen, then crossfade to the live PathFinder landing page.

**Persona card content** (build in Figma or Keynote, brutalist style: cream background, black borders, mustard accents):

```
RENÉE
47 · GS-9 Records Administrator
Health & Human Services, Maryland
18 years federal service
Two kids. One in college.
Six months severance.
No playbook for what's next.
```

Then transition to: PathFinder landing page hero, animated agent pipeline cycling on the right.

## What you say (voiceover — record over the screen)

> Meet Renée. Forty-seven. Eighteen years federal service. Just got walked out. Two kids. Husband in seasonal construction. Six months severance. She's never worked outside government.
>
> She doesn't know what "product manager" means and assumes it's not for her.
>
> PathFinder is built for Renée.

~50 words.

## Recording

- Voiceover only. You're not on camera in this scene.
- Record the voiceover as a separate audio track in QuickTime or Voice Memos.
- The persona card → landing page transition is editing, not live.

---

# SCENE 3 · Discovery flow (0:45–1:15, ~30s) · VO + screen

## What audience sees

Continuous screen recording. Mouse moves to "Not sure?" callout, click, modal opens, paste the demo profile, click "Suggest 3 careers", progress bar runs, three cards appear, click one.

**Demo profile to paste** (copy this beforehand):

```
Senior Records Administrator at U.S. Department of Health and Human
Services, GS-9 step 7, 18 years of federal service. Managed compliance
documentation across HHS regional office. Stakeholder management with
state agencies, audit response, regulatory tracking. Cross-functional
project lead on agency-wide records modernization initiative. Hands-on
with internal data systems and regulatory reporting. Recently affected
by 2025 federal workforce reductions.
```

## What you say (voiceover)

> Most career tools assume you already know what you want next. We work for the ninety percent who don't. Renée pastes her LinkedIn into PathFinder.
>
> Eight seconds later, three careers, ranked by fit. Each one reasoned from specific phrases in her profile. Not generic. Not "you have transferable skills." Real, cited reasoning. She picks Product Manager.

~60 words.

## Recording

- Pre-test this exact profile through the discovery flow once before recording. If suggestions feel generic, regenerate.
- Move the mouse smoothly. Use trackpad two-finger gestures, not the mouse wheel.
- Hold on the three suggestion cards for ~3 seconds so the reasoning is readable.

---

# SCENE 4 · The build (1:15–1:50, ~35s) · VO + screen — THE WOW MOMENT

## What audience sees

Bridge generation page. Eleven agent tiles flipping pending → yellow → green over ~45 seconds.

**Critical**: extend the auto-collapse timer to 300s for recording so tiles stay expanded. In `app/path/[id]/page.tsx`, change `8000` to `300000` in the three useEffect blocks (SalaryPanel, PathOutlineView, AgentPipeline). Revert after recording.

## What you say (voiceover, paced to the tile fan-out)

> Eleven AI agents start working in parallel.
>
> *(beat)*
>
> Skill diff on Claude Opus 4.7. Lesson and resource agents on Haiku. Books, videos, courses each filtered by Claude for relevance. Salary fetched live from Perplexity Sonar with real source citations. About-this-career on Haiku. Scholarly research from Google Scholar.
>
> Real O*NET government data. Real cited sources. Forty-seven seconds, end to end.

~65 words.

## Recording

- Pre-cache the demo path before recording. Run the exact career pair (Records Administrator → Product Manager, Milwaukee, $90K salary) once. The Convex backend caches skill diff, so the second run is faster. That second run is your recording.
- Start recording when all tiles show "pending". End when all are green.
- Speed-ramp option: if your editor allows, speed up the middle 15s of tile fan-out by 1.5x while keeping narration at normal pace.

---

# SCENE 5 · The product (1:50–2:20, ~30s) · VO + screen

## What audience sees

Scroll through the path page hitting three specific moments:
1. **"Why this bridge" framing** — pause 2s
2. **Salary panel** — show the math
3. **About-this-career tab** — click in, scroll through (day-in-life, ladder, tradeoffs)

This is a montage. Don't linger.

## What you say (voiceover)

> The bridge framing names what she actually brings. Eighteen years of regulatory work translates to product compliance and stakeholder management.
>
> The salary math is honest. Anchored on her actual pay, not the median. Because of the wealth gap, "follow your passion to a thirty-thousand-dollar cut" isn't a universal option.
>
> About-this-career: day in the life, career ladder with comp at every rung, the tradeoffs most career sites pretend don't exist.

~70 words.

## Recording

- Trackpad scroll, slow and controlled.
- Click the "About this career" tab decisively, hold ~5 seconds on the description.

---

# SCENE 6 · The counselor (2:20–2:45, ~25s) · BUBBLE CAM + live audio

## What audience sees

Your face appears in a bubble overlay (corner of screen) while the screen shows the counselor widget. You ask the question out loud, the counselor responds, the audio plays.

This is the personal moment. Audience sees you asking the question, watches the response stream in.

## What you say (voiceover, 5s framing) → then live audio

**Voiceover setup (~5s)**:
> The counselor isn't a chatbot. It's Sonnet 4.6 with structural awareness. Discrimination math. Wealth math. Family-breadwinner math.

**Then live (you speak this on camera, into your mic, with bubble cam visible)**:
> "I'm Black. Primary breadwinner. Two kids. Just laid off from federal. Is product management realistic at forty-seven, or am I kidding myself?"

**The counselor's response plays back** (your ElevenLabs voice).

## Performance notes for the live question

- Speak the question at conversational pace, not rushed
- Pause briefly after "Just laid off from federal" — the question that follows is the emotional payload
- Look at your screen while you speak (the camera bubble shows you naturally engaged with the product)

## Recording

- **Pre-warm**: send ONE throwaway counselor message before recording so browser autoplay is unlocked
- **Voice mode**: confirm "🔊 Voice ON" toggle is showing in the widget header
- **Mic**: external mic strongly recommended. Laptop mic in this scene gets compared to the ElevenLabs voice that follows; quality gap will be obvious
- **Failure**: if the counselor pep-talks or gives generic encouragement, reword the question slightly and try again. Use the better take.

## What the counselor's response should include (rehearse + verify)

- Acknowledge federal-employment context, name specific transferable skills (regulatory, compliance, stakeholder management, scale ops)
- Address breadwinner constraints — income continuity matters
- Reference age 47 with calibrated honesty
- Mention discrimination math or network gap if relevant
- Suggest portfolio-based or referral-driven pathways
- NOT pep-talk

If response is generic, the structural-awareness section in `convex/agents/counselor.ts` needs more tuning before recording.

---

# SCENE 7 · Close (2:45–3:00, ~15s) · ON CAMERA

## What you're doing

Back to camera, full frame, direct address. Same setup as Scene 1.

## What you say (verbatim)

> A Black middle class that took six decades to build through federal employment cannot be allowed to fall in three.
>
> PathFinder doesn't fix structural inequality. It removes one specific friction point — the moment after job loss when you sit down to figure out what comes next.
>
> That's the contribution. Thank you.

~50 words, ~15 seconds.

## Performance notes

- This is the emotional landing. Slow down even more than scene 1.
- Pause one full beat between sentences.
- Hold a small, calm smile on "Thank you." First smile of the video. Lands harder for being held back.
- Look directly at the lens for the entire scene.

---

# CAMERA + AUDIO SETUP (read this BEFORE recording)

## Camera

- **Webcam**: Built-in laptop webcam works at 1080p. External webcam (Logitech Brio, etc.) is sharper if you have one.
- **Position**: At EYE LEVEL. Stack books under your laptop until the camera is at your eye line.
- **Distance**: Webcam should be 18-24 inches from your face. Too close = distortion. Too far = empty headroom.
- **Frame**: Shoulders to top-of-head. Your eyes should sit on the upper-third line (rule of thirds). Small gap of cream/wall above your hair.

## Lighting

- **Best free option**: a window facing you (NOT behind you). Daylight in front of your face = soft, flattering, free.
- **Avoid**: overhead light only (creates shadows under your eyes). Fluorescent kitchen lighting (color cast).
- **Affordable upgrade**: a $20-40 ring light or panel light from Amazon, positioned slightly above and in front of you.
- **For darker skin specifically**: under-lighting is the #1 issue with cheap webcams. Get more light on your face than you think you need. The camera under-exposes by default.

## Audio

In quality order:
1. **External lavalier mic** ($30-100) — best
2. **USB condenser mic** like the Blue Yeti or Samson Q2U — great
3. **AirPods Pro / Bose earbuds** with mic — good
4. **Laptop built-in mic** — last resort, will sound worse than the ElevenLabs counselor voice in scene 6 and create a quality mismatch

## Background

- **Plain wall** is safest. Paint color doesn't matter much.
- **Avoid clutter**: no laundry, no busy bookshelves, no political posters
- **One or two intentional objects** (a plant, a single book) add warmth without distraction
- **Avoid logos**: clothes, hats, mugs — anything branded reads weird on camera
- **Brutalist match**: if you want to lean into the brand, a black or cream-colored wall reinforces the aesthetic. A mustard yellow accent in the background (poster, blanket, lamp) ties to the logo.

## Wardrobe

- **Solid colors**, no patterns (patterns moiré on camera)
- **Avoid pure white** (overexposes, makes face look darker by contrast)
- **Avoid neon / saturated colors** that grab attention away from your face
- **Best options**: muted/warm earth tones, charcoal grey, navy. A black sweater pairs with the brutalist look. A cream/oatmeal sweater also works.
- **No glasses glare**: if you wear glasses, tilt your head slightly down so the lens reflection isn't visible, or take them off if you can read the script

## Performance

- **Eye contact**: lens, not screen. Practice a few takes looking at the dot.
- **Pace**: slower than feels natural. Adrenaline speeds you up. Aim for 130-140 wpm conversational.
- **Pauses**: after data points, after the most important sentence in each scene, hold one beat of silence
- **Energy**: serious for scenes 1 and 7, neutral for the demo. Save your one small smile for the very last "Thank you."
- **Don't apologize**: if you stumble, just stop, take a breath, and start that line over. You'll edit out the stumble.

---

# RECORDING WITH TELLA

You're using **Tella** (https://www.tella.tv). It's a great fit for this script because Tella's scene-based model maps 1:1 to our seven scenes. Record each scene as its own Tella clip, choose the right layout per scene, then drag to reorder in the editor. No separate video-editor software needed.

## Why Tella beats the alternatives for this demo

- **Scene model**: each of your 7 scenes can be a separate Tella clip. If scene 1 needs 5 takes, you record 5 times and delete the bad ones — no scrubbing through one giant file.
- **Layout per clip**: Tella lets you pick the layout per scene (Camera Only / Screen Only / Picture-in-Picture). You don't need to re-record everything if you decide to switch layouts later.
- **Built-in editor**: trim, reorder, change layouts, swap backgrounds, all in the browser. No iMovie / DaVinci context-switch.
- **Brutalist-friendly**: Tella's background colors / templates can match your cream + black + mustard palette directly.
- **Auto-zoom on clicks**: cursor highlights are baked in. The audience sees what you're clicking without you having to gesture.

## Layout per scene (use this as your cheat sheet)

| Scene | Tella layout | Background | Notes |
|---|---|---|---|
| 1 (open, on camera) | **Camera Only** full screen | Cream `#fefae0` (matches site) | Set background BEFORE recording so the brutalist aesthetic is locked |
| 2 (persona → landing) | **Screen Only** | n/a | Upload the persona card PNG as a still clip first, then live screen recording. Two clips, chained. |
| 3 (discovery flow) | **Screen Only** OR **Bubble Cam** small | n/a | Bubble cam optional. Adds engagement but the screen is the show. |
| 4 (the build, agent fan-out) | **Screen Only** | n/a | The agent tiles ARE the visual. Don't put a bubble cam on top of them. |
| 5 (product scroll) | **Bubble Cam** small bottom-right | n/a | Small bubble adds your reaction without distracting from product |
| 6 (counselor) | **Bubble Cam** medium bottom-right | n/a | This is the personal moment. Bubble bigger so audience sees you ask the question. |
| 7 (close, on camera) | **Camera Only** full screen | Same cream `#fefae0` as scene 1 | Mirrors the open. Visual bookend. |

## Suggested recording order (NOT the same as scene order)

Don't record in scene order. Record by SETUP, so you change camera/lighting/screen/microphone position the fewest times.

1. **First: scenes 1 + 7** (both "Camera Only", same background, same setup). Knock these out together. Multiple takes each, pick the best.
2. **Second: scenes 2-5** (screen-only clips with VO). Switch to your screen recording layout. Record each as a separate Tella clip.
3. **Third: scene 6** (bubble cam + live audio). Different from scenes 2-5 because you're speaking on camera AND the screen plays. Final scene because it has the most failure modes.

Total recording session: ~45-60 minutes if rehearsed.

## Tella-specific tips

- **Background color**: Tella → Settings → Background → custom hex `#fefae0` (matches the site's cream).
- **Cursor zoom**: enabled by default in Tella. Each click gets a soft zoom. Don't fight it.
- **Trim hot tip**: record a 1-second silence at the START and END of each clip. Gives you trim handles in the editor without losing the first/last word.
- **If you flub a line in the middle of a scene**: pause, clap once (creates a visible audio spike), then restart the line. The clap makes the bad take easy to find when editing.
- **Background music**: Tella has a music library. Use it sparingly. If you add music, mix it at -20 dB so it sits BEHIND your voice. For scenes 1, 6, 7 — no music. Pure voice.
- **Export**: Tella → 1080p MP4. Don't need 4K for a 3-minute demo and the file size doubles.

## Tella docs to skim before recording

- Welcome / orientation: https://www.tella.com/help/introduction/welcome
- Editing a video: https://www.tella.com/help/editing/edit-a-video
- Scenes and layouts: search "scenes" in Tella's help. The scene model IS the unit you're working with.

## If Tella misbehaves

| Problem | Fix |
|---|---|
| Camera looks dark on Tella but fine in Photo Booth | Check Tella settings → Camera permissions in browser. Sometimes browser webcam access defaults to lower brightness. |
| Screen recording shows browser address bar | Hide bookmarks bar (`Cmd+Shift+B`), record only the inner window. |
| Audio level mismatch between scenes | Use the same mic for ALL scenes. Don't switch between AirPods and laptop mid-recording. |
| Bubble cam covers something important on screen | Drag the bubble in Tella's editor to a different corner. Per-clip, not global. |
| Auto-zoom on clicks is too aggressive | Tella settings → cursor effects → reduce zoom intensity, or disable per clip. |

---

# TIMING BUDGET

## If you have 3 hours

| Phase | Time |
|---|---|
| Setup camera, lighting, audio, background | 30 min |
| Pre-flight + rehearsal (DEMO-CHECKLIST.md) | 30 min |
| Build persona card in Figma/Keynote | 15 min |
| Record on-camera scenes (1 + 7) — multiple takes | 30 min |
| Record voiceovers (scenes 2, 3, 4, 5, 6 setup) | 20 min |
| Record screen demo flows | 30 min |
| Edit, sync, cut to time | 45 min |

## If you have 90 minutes

Cut the rehearsal, cut the persona card (use text-on-screen overlay instead), record everything in fewer takes, edit minimally. ~90-min budget.

## If you have 30 minutes (panic mode)

Use Loom with bubble cam, record one continuous take walking through the live product while talking. Skip the structured open/close. Less polished but ships something rather than nothing.

---

# PRE-RECORDING CHECKLIST

- [ ] DEMO-CHECKLIST.md run-through completed
- [ ] Demo profile copied to clipboard
- [ ] Demo path pre-cached (run end-to-end once)
- [ ] Counselor pre-warmed (one throwaway message sent so autoplay is unlocked)
- [ ] Auto-collapse timer extended to 300s (for scene 4)
- [ ] Camera + lighting + audio tested
- [ ] Background tidy
- [ ] Wardrobe on, mic levels verified
- [ ] Phone on Do Not Disturb
- [ ] Browser at 100% zoom, bookmarks hidden, DevTools console open in side window for error monitoring

---

# FAILURE MODES DURING RECORDING

| Problem | Fix |
|---|---|
| You stumble on the on-camera lines | Stop, take a breath, restart that sentence. Edit out the stumble. |
| Bridge generation times out mid-recording | Use a previously-generated path. Type the URL: localhost:3001/path/<id>. Skip the "47 seconds" claim. |
| Counselor doesn't speak (autoplay blocked) | Click anywhere in the chat panel first, then re-send. |
| Books shows DevOps junk for PM | Skip showing books in scene 5. Show videos instead. |
| Discovery returns generic suggestions | Use a different demo profile or different career pair. |
| Vercel auth wall is back | Vercel dashboard → Project → Settings → Deployment Protection → None. |
| ElevenLabs counselor voice sounds robotic | Settings: stability 0.4-0.6, style 0.15-0.25. Re-trigger by sending the question again. |
| Lighting on your face looks bad | Position window to your front, not side. Add a piece of white paper held below the laptop reflecting up. |

---

# AFTER RECORDING

- [ ] Review at 1.5x speed first to check pacing — if any scene drags, trim it
- [ ] Audio levels: your voice and the ElevenLabs counselor voice should be at similar volume
- [ ] Cursor visible during click moments
- [ ] No accidental email/Slack/notification visible in the screen recording
- [ ] Total runtime ≤ 3:00
- [ ] Closing has the GitHub URL or Vercel URL visible (overlay text or natural to the close)
- [ ] Export at 1080p H.264 MP4

---

# SUBMISSION ASSETS

```
final-cut.mp4 (the video, 1080p, ≤3 minutes)
github: https://github.com/tmoody1973/pathfinder
live demo: https://pathfinder-12w2tnc6d-tmoody1973s-projects.vercel.app
```

## Submission description (paste this)

> PathFinder is an AI career-bridge tool built for the moment Black workers are living through. Two displacements — DOGE federal layoffs and AI automation — are converging on the same households. PathFinder removes one specific friction point: the moment after job loss when you sit down to figure out what comes next. Eleven AI agents build a personalized 8-week bridge in under 60 seconds, with honest salary math and a counselor that understands discrimination math, wealth math, and family-breadwinner math.

---

# ONE FINAL NOTE

Being on camera as a Black builder showing this product is itself the message. The demo is data and product. **You are the proof.** The first 5 seconds of you on camera, looking at the lens, saying "I'm a Black builder" — that's the most powerful moment in the video. Don't undersell it.
