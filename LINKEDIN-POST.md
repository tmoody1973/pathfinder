# LinkedIn Announcement Post

Paste this into LinkedIn's composer. Tags need to be retyped manually because copy-paste doesn't preserve `@mention` autocomplete behavior — see notes at the bottom.

---

## The post

> Two things are happening to Black workers right now. Most career-change tools ignore both.
>
> One: DOGE. Federal employment built much of the Black middle class since the post-Great-Society civil-service reforms. Black workers are 18% of the federal workforce. Black women specifically hold around 14% of federal jobs, against 6-7% of the general workforce. Those federal jobs are being cut in real time.
>
> Two: AI. The customer-service, admin, and records roles Black workers would historically pivot into are themselves being automated. Goldman, McKinsey, and Brookings each project 25-40% of those task families are automatable with current LLMs.
>
> Same household. Same year. Two displacements.
>
> So I built PathFinder this weekend for **Blackathon 2026**.
>
> You paste your LinkedIn (or type two careers, if you know them). Eleven AI agents start working in parallel, in front of you.
>
> The first agent (Claude Opus 4.7) does a "skill diff" — it compares what you can already do against what the target career demands, then maps the gap to a 12-module learning path. The other ten agents fan out in parallel to fill in the content: a narrative lesson, curated videos, recommended courses, the canonical books, recent industry news, scholarly research, salary data with real citations, and an "About this career" section covering day-in-the-life, comp ladder, and honest tradeoffs.
>
> All in about sixty seconds, end to end.
>
> A few decisions I made on purpose:
>
> The salary math is anchored on YOUR actual pay, not the median. Because of the racial wealth gap (roughly 6x by Federal Reserve data), "follow your passion to a $30K cut" isn't a universal option for everyone.
>
> The counselor (Claude Sonnet 4.6) is told explicitly to understand discrimination math, wealth math, and family-breadwinner math. No pep talks. If a transition is hard at 4 hours a week, it says nine months realistic, twelve honest. It also speaks back via ElevenLabs voice.
>
> Anonymous-first. Free. Job-hunting from a shared family computer is a real constraint we built around.
>
> If you run an HBCU career center, an Urban League chapter, or a state workforce office serving displaced federal workers, I want to talk. PathFinder costs about $0.50-$1.50 per user and could fit into your workflow tomorrow.
>
> Tagging the communities that shape this work:
> @NSBE SFBA
> @Algorythm
> @BlackWPT
> @Black Women in Tech
>
> GitHub: github.com/tmoody1973/pathfinder
> Live demo: pathfinder-12w2tnc6d-tmoody1973s-projects.vercel.app
>
> #Blackathon2026 #BlackInTech #CareerChange #AI #DOGE

---

## Tagging mechanics (important)

When you paste this into LinkedIn's composer, the `@NSBE SFBA` etc. lines won't auto-tag. You have to retype each `@` and pick from LinkedIn's autocomplete dropdown. Process:

1. Delete the line `@NSBE SFBA` and retype `@NSBE`. Wait for the dropdown. Pick the SFBA chapter page from the list.
2. Same for `@Algorythm`. Verify the spelling matches their actual page; LinkedIn might list it as "Algoryth M" or "ALGORYTHM" or with a space.
3. Same for `@BlackWPT`. If it doesn't autocomplete, fall back to `#BlackWPT` as a hashtag so the post still surfaces in their community feed.
4. Same for `@Black Women in Tech`.

Hashtags work as written — LinkedIn turns them into clickable chips automatically.

---

## Format notes for LinkedIn

- LinkedIn posts perform best when the first 3 lines hook on mobile (the "see more" truncation point). My current first paragraph is the hook: "Two things are happening to Black workers right now. Most career-change tools ignore both."
- Total length is about 2,400 characters. LinkedIn's hard cap is 3,000. Substantive technical posts tend to do well in the 2,000-3,000 range when the topic is specific.
- I broke the post into short paragraphs (1-3 sentences each) for mobile readability. Don't merge them into long blocks.
- The `**Blackathon 2026**` will render as bold on LinkedIn. Use this sparingly — once is enough.

---

## Once you post

Paste the post URL back into your Blackathon submission form. The URL format will be something like:

```
https://www.linkedin.com/posts/<your-handle>_pathfinder-blackathon-careerchange-...
```

LinkedIn generates that slug automatically based on the first ~10 words of your post.

---

## Optional: alternate opening if you want Blackathon up front

If you want to mention Blackathon in the first line, swap the opening paragraph for this:

> Shipping for **Blackathon 2026** this weekend. The why matters more than the what.
>
> Two things are happening to Black workers right now. Most career-change tools ignore both.
>
> [continue with paragraph 1...]

This adds one extra line at the top (40 characters) and is honest about what the post is. Tradeoff: weaker mobile-hook (less likely to make scrollers stop) but clearer event context.

I'd default to the original opening unless you specifically want the event front and center.
