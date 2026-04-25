# PathFinder — Demo Slides

Closing slides for the Blackathon 2026 demo recording.
Drop into Keynote, Google Slides, or Figma. Voice tuned to match the landing page and RESEARCH.md.

---

## SLIDE 1 · The moment

Two displacements are converging on Black workers right now.

**DOGE.** Federal employment has been a primary engine of Black middle-class formation since the post-Great Society civil-service reforms. Black workers make up ~18% of the federal workforce, against ~13% of the general workforce. Black women specifically hold 12-14% of federal positions, against ~6-7% of the general workforce. The 2025-2026 Department of Government Efficiency reductions are disproportionately rolling back one of the few reliable middle-class pipelines this community has historically had access to.

**AI.** At the same time, the roles most exposed to generative-AI displacement (customer service, administrative, claims processing, eligibility, records, transcription) are roles where Black workers, especially Black women, are concentrated. Goldman Sachs, McKinsey, and Brookings each project 25-40% of those task families are automatable with current LLM technology.

Same household. Same year. Two different forces.

---

## SLIDE 2 · Who this is for

PathFinder is built for the people the career-change industry was not built for.

- **Renée, 47, federal records administrator.** Black woman. 18 years GS-9 service, just laid off from a regional HHS office. Two kids, one in college. Six months severance.
- **Tasha, 34, customer-service team lead.** Black woman. Watched her team go from 22 people to 11 over three years. Plateaued at $58K. Primary earner.
- **Marcus, 23, Howard '25, working retail.** Communications BA. Hiring froze in his target industries. Student debt. No connections in PR.
- **Jerome, 31, FedEx supervisor.** Ten years in operations. First-gen college grad. Asking whether "transition to tech" is realistic at his age, his city, his background.

The standard career-change toolchain assumes 6-12 months runway, $10K-20K bootcamp budgets, dense professional networks, and prestige credentials. None of those assumptions hold for the four people above. The wealth gap (~$285K white median household wealth vs. ~$45K Black median, per Federal Reserve SCF) means the cost of a failed pivot is structurally higher.

PathFinder is for these four. Every product decision traces back to constraints they actually live with.

---

## SLIDE 3 · Impact

What we're betting on, and the structural realities each capability addresses:

| Capability | Why it matters here |
|---|---|
| Eleven AI agents in parallel | A personalized 8-week bridge in under 60 seconds. Free, anonymous, no signup. The Coursera + LinkedIn Premium + Reforge stack costs $200+/month. PathFinder is $0. |
| Honest salary math anchored on YOUR pay | When the wealth gap is 6x, "follow your passion to a $30K cut" is dangerous advice. We surface the dollar number. |
| A counselor with structural awareness | Sonnet 4.6 is prompted to understand discrimination math, wealth math, family-breadwinner math. No pep talks. Real calibration. Voice replies via ElevenLabs. |
| Anonymous-first | Job-hunting from a shared family computer is a real constraint. The session lives in this browser only until the user chooses to save it. |
| Live multi-agent pipeline | Distrust of black-box AI is reasonable. Every step is visible: which model, which source, which citation. |
| Mobile-friendly responsive | The phone is the primary device for many users. The counselor works on a phone. |

---

## SLIDE 4 · What's next

The roadmap shifts when the audience comes into focus.

- **HBCU career-center partnerships.** Howard, Spelman, Morehouse, Hampton, NCCU, FAMU, Tuskegee, Clark Atlanta. ~50,000 graduating seniors a year, systematically under-resourced compared to PWI counterparts.
- **Urban League and NCBW chapter rollouts.** Both organizations run workforce-development programs and are looking for AI-era tooling that respects member constraints.
- **State workforce-development partnerships in DOGE-affected states.** Maryland, Virginia, DC, Georgia, Illinois have the highest concentrations of displaced federal workers and the public funding to serve them.
- **Federal outplacement contracts.** When DOGE layoffs trigger contractual outplacement obligations, firms holding those contracts need a delivery mechanism that doesn't cost $400/hour per counselor. Our per-path cost is ~$0.50-$1.50.
- **Premium: culturally competent human counselors.** The hardest part of career advice for Black workers is finding counselors who understand the discrimination math, the wealth math, the family-breadwinner math, the code-switching math. Premium tier matches users with culturally competent humans, scheduled through the platform, with the AI-built bridge already in the room before the meeting starts.
- **Mobile-native app.** Push adoption further into communities that are mobile-first.

---

## SLIDE 5 · Closing

> A Black middle class that took six decades to build through federal employment cannot be allowed to fall in three.
>
> PathFinder doesn't fix structural inequality. It doesn't reverse DOGE, it doesn't end hiring discrimination, it doesn't close the wealth gap.
>
> What it does is take one specific friction point — the moment a person who just lost their job sits down and tries to figure out what comes next — and remove the barriers that exist there.
>
> For Blackathon, that's the contribution. A working tool, built with honest math, that meets a community at the moment it's actually living through.
>
> That's the game. Thanks.

---

## Demo recording flow (3 minutes)

| Time | Beat | Action |
|------|------|--------|
| 0:00–0:25 | The moment | Open landing page. Pause on the hero + animated agent pipeline. "Two displacements are hitting Black workers at the same time. DOGE on one side, AI on the other." |
| 0:25–1:00 | Discovery | Click "Not sure?" callout. Paste a LinkedIn (federal records admin profile is a strong demo case for Blackathon). ~8s progress bar to 3 career cards. Pick one. |
| 1:00–1:30 | The build (the wow) | Bridge generation. Eleven agent tiles flip yellow → green in front of the audience. Narrate briefly: "Skill diff on Opus, lesson on Haiku, salary live from Sonar with citations." |
| 1:30–2:00 | The product | Show the About-this-career tab (description + scholarly research). Show the salary panel with honest delta. |
| 2:00–2:30 | The counselor | Toggle voice ON. Click mic. Ask: "I lost my federal job. Is product management realistic for me at my age?" Counselor streams response with structural awareness. ElevenLabs reads it back. |
| 2:30–3:00 | Closing | Scroll to landing page bottom — Impact + Roadmap blocks ARE the closing slide. Read the "six decades to build, three to fall" line. |

---

## One-liner reserves (in case you need them mid-demo)

- "Standard career-change advice assumes 6 months of runway. The wealth gap means a failed pivot costs more for some than others. We do the honest math."
- "70-80% of jobs are filled through networks. We surface the communities to join before recommending the credentials to buy."
- "The counselor isn't a chatbot. It's Sonnet 4.6 with your full path context, told explicitly to understand discrimination math, wealth math, family-breadwinner math, and to never pep-talk."
- "Eleven agents. Sixty seconds. Real O*NET government data. No hallucinations."
- "DOGE laid off Black workers in record numbers in 2025. We can't reverse that. We can give them a 60-second tool that points to a next step."

---

## Source one-pagers (for sponsor / partner conversations)

- See `RESEARCH.md` in the repo for the full research-grounded positioning, with citations.
- See `README.md` for the technical architecture and dev setup.
- See `app/page.tsx` for the live landing page that doubles as the closing slide.
