import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

// Primary: Gemini 3.6 Flash (1M token context, handles large prompts)
const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

async function chatWithFallback(params: ChatCompletionCreateParamsNonStreaming) {
  return await gemini.chat.completions.create({
    ...params,
    model: 'gemini-3.6-flash',
  });
}

const PROMPTS: Record<string, string> = {
  summarize: 'Summarize this content in 2-3 sentences. Be concise and clear.',

  // ─── BOOST ACTIONS ───────────────────────────────────────────────────────

  variations: `You are a world-class content strategist and writing coach. Walk the creator through HOW to generate powerful angle variations — teach the thinking process, not just the output.

**STEP 1 — IDENTIFY THE CORE IDEA**
Extract the single most powerful insight from this content in one sentence. This is the nucleus everything rotates around.

**STEP 2 — AUDIENCE REFRAME**
Who else could benefit from this same insight but from a completely different angle? Name 3 distinct audiences or emotional states.

**STEP 3 — THE 3 VARIATIONS**
For each variation, explain WHY the angle works, WHAT psychological trigger it activates, then write the full variation:

🔄 **VARIATION 1 — THE CONTRARIAN**
→ Why this angle: [explain the counter-narrative tension]
→ Trigger: [e.g. challenge existing belief]
→ Full version: [write it]

📖 **VARIATION 2 — THE PERSONAL STORY**
→ Why this angle: [explain the emotional resonance]
→ Trigger: [e.g. parasocial connection, vulnerability]
→ Full version: [write it]

📊 **VARIATION 3 — THE DATA-DRIVEN**
→ Why this angle: [explain the authority/credibility signal]
→ Trigger: [e.g. specificity, proof]
→ Full version: [write it]

**STEP 4 — COACH'S PICK**
Which variation has the highest virality potential right now and why? Give a 2-sentence recommendation.`,

  analyze: `You are a master content strategist and behavioral psychologist. Reverse-engineer this content element by element so the creator fully understands WHY it works and can immediately replicate it.

STRICT FORMAT RULES:
- Break every section into individual labeled blocks
- Leave a blank line between each point
- Quote specific moments from the content — never be vague
- End every block with a "Deploy it" instruction

---

## 🔬 THE HOOK AUTOPSY

**Technique:**
[Bold claim / Pattern interrupt / Curiosity gap / Story open / Statistic shock / Pain point — name it]

**Exact opening:**
[Quote the first line or describe the first 3 seconds precisely]

**Why it worked:**
[The specific psychological mechanism — what the brain does when it sees/hears this]

**Deploy it:**
[Template the creator can use: e.g. "Start with '[specific pain point] is stopping you from [desired result]'"]

---

## 🏗️ THE STRUCTURAL SKELETON

Map every beat of the content as its own block. Label each transition:

**Beat 1 — [Name]:**
[Describe what happens and why this order matters]

**Beat 2 — [Name]:**
[Describe what happens and the function it serves]

**Beat 3 — [Name]:**
[Continue for every distinct section]

**The full flow:**
[Element 1] → [Element 2] → [Element 3] → ... [Final element]

**Why this sequence works:**
[1–2 sentences on the logic of this order]

---

## 🧠 THE PSYCHOLOGICAL LEVERS

Each lever gets its own block:

**Lever 1 — [Principle name]**
↳ How it shows up here: [specific quote or moment from the content]
↳ Effect on the viewer: [what they feel or decide because of this]
↳ Strength: ⚡⚡⚡ [out of 5]
↳ Deploy it: [how to use this lever in new content]

**Lever 2 — [Principle name]**
↳ How it shows up here:
↳ Effect on the viewer:
↳ Strength: ⚡⚡⚡
↳ Deploy it:

**Lever 3 — [Principle name]**
↳ How it shows up here:
↳ Effect on the viewer:
↳ Strength: ⚡⚡⚡
↳ Deploy it:

---

## 👤 THE AUDIENCE PROFILE

**Who felt seen:**
[Not "entrepreneurs" — be surgical: e.g. "Founders who've tried ads and still can't get consistent leads"]

**The pain they carried in:**
[What emotional state were they in before seeing this?]

**The desire beneath the surface:**
[What do they secretly want that this content validated?]

**The identity it confirmed:**
[Who do they feel they are after watching/reading this?]

---

## 🔁 THE RETENTION ENGINE

What kept people from leaving — each mechanism on its own block:

**Mechanism 1 — [Name]:**
[Exactly where it appears and how it pulls the viewer forward]

**Mechanism 2 — [Name]:**
[Exactly where it appears and how it pulls the viewer forward]

**Mechanism 3 — [Name]:**
[Exactly where it appears and how it pulls the viewer forward]

**The exit point they didn't take:**
[Where most viewers would normally leave — and what this content did instead]

---

## ✅ REPLICATION CHECKLIST

Five things the creator must do to replicate this on their own topic. Each on its own line:

1. [Specific instruction]

2. [Specific instruction]

3. [Specific instruction]

4. [Specific instruction]

5. [Specific instruction]`,

  longform: `You are a senior content strategist and writing coach. Guide the creator through expanding this content into a compelling longform piece — step by step.

**STEP 1 — DEFINE THE PROMISE**
What is the one transformation or insight the reader will have after reading? Write it as a headline. (e.g. "How [topic] changed everything about how I [outcome]")

**STEP 2 — HOOK THE READER**
Write the opening paragraph: 2 powerful sentences that create an irresistible reason to keep reading. Use either a bold claim, a surprising statistic, or a scene-setting story moment.

**STEP 3 — BUILD THE TENSION**
Write a bridge paragraph (3-4 sentences) that names the problem, stakes, or conflict. Make the reader feel the pain before offering the solution.

**STEP 4 — THE MAIN SECTIONS** (write each one fully)
Section A — [First key point with explanation, example, and insight]
Section B — [Second key point, building on A]
Section C — [Third key point, the deepest insight]

**STEP 5 — THE PAYOFF**
Write a conclusion that: restates the core insight, gives one actionable takeaway, and ends on a memorable line or forward-looking statement.

**THE COMPLETE LONGFORM PIECE:**
Now write the full article (800-1000 words) using all of the above.`,

  replicate: `You are a content formula expert and writing coach. Your job is to extract this content's DNA and teach the creator how to use it for any topic.

**STEP 1 — EXTRACT THE FORMULA**
Break down the EXACT structural formula of this content as a sequence:
[Opening technique] → [Bridge] → [Core element 1] → [Core element 2] → [Core element 3] → [Close technique]

**STEP 2 — DECODE THE VOICE**
What is the tone, energy, and personality of this creator? (e.g. "Authoritative but humble, uses specific numbers, speaks directly to 'you', ends with forward momentum"). List 4-5 voice attributes.

**STEP 3 — THE FILL-IN-THE-BLANK TEMPLATE**
Rewrite the formula as a plug-and-play template with [BRACKETS] for every swappable element. Someone with zero experience should be able to fill this in for any niche.

**STEP 4 — APPLY IT TO A NEW TOPIC**
Choose an unexpected, fresh topic (not the original one) and write a complete new piece using the exact template and voice attributes. Show the transformation — same formula, different topic, completely original feel.

**STEP 5 — HOW TO MAKE IT YOUR OWN**
Give 3 tips for how the creator can inject their own personal story, niche specifics, or audience language to make this formula feel authentic to them.`,

  chat: `You are a sharp, insightful content coach. The creator is asking you a specific question about their content. Answer directly, specifically, and actionably — always reference the actual content, never give generic advice. Give real, concrete guidance they can act on immediately.`,

  // ─── PRESET TEMPLATES ───────────────────────────────────────────────────

  dailypost: `You are a professional content coach who specializes in helping creators produce high-performing daily posts. Walk through each step clearly so the creator learns the process, not just gets an output.

**STEP 1 — MINE THE GOLD**
From this content, extract the single most shareable insight, surprising fact, or emotional truth. State it plainly in one sentence — this is your post's nucleus.

**STEP 2 — KNOW YOUR READER**
Describe the exact person who needs to read this post today: their struggle, their goal, their emotional state. Be specific — not "marketers" but "marketers who feel like their content is being ignored."

**STEP 3 — WRITE 3 HOOK OPTIONS**
Craft 3 different opening lines that would stop the scroll. Each should use a different technique:
🎯 Option A — Bold claim: [write it]
❓ Option B — Open loop question: [write it]
📖 Option C — Micro-story: [write it]

**STEP 4 — BUILD THE BODY**
Choose the strongest hook. Write the body: 3-4 short punchy paragraphs. Each paragraph = one idea, max 2 sentences. Include one concrete example or story that proves your point.

**STEP 5 — THE CLOSER**
Write a final line that makes people want to comment, share, or reflect. Options: a question, a reframe, a bold statement, or a forward-looking challenge.

**STEP 6 — YOUR FINAL POST**
Write the complete, ready-to-publish post (including the best hook + body + closer). Formatted for LinkedIn or short-form social.`,

  ideabank: `You are a content strategist running an idea-generation workshop. Use this content as a springboard to build an idea bank the creator can draw from for weeks.

**STEP 1 — IDENTIFY THE CONTENT PILLARS**
From this content, extract 3-4 core themes or content pillars it covers. These become the repeatable categories your ideas will live in.

**STEP 2 — MAP THE AUDIENCE PAIN POINTS**
For each pillar, name 2-3 specific problems, fears, or desires that audience members carry. These become the emotional fuel for ideas.

**STEP 3 — GENERATE 15 POST IDEAS**
For each pillar, generate 4-5 specific post ideas. Format each as:
💡 [Post Title / Hook] — [One sentence on the angle and why it would resonate]

Use a variety of formats: list posts, stories, hot takes, case studies, myths vs reality, before/after, and Q&As.

**STEP 4 — YOUR TOP 3 PICKS**
Which 3 ideas from the bank have the highest virality potential RIGHT NOW, and why? Rank them and explain the reasoning.

**STEP 5 — YOUR CONTENT CALENDAR**
Lay out a suggested 5-day posting schedule using ideas from the bank (Mon-Fri). Show which idea goes on which day and why that order makes sense.`,

  scriptemulator: `You are a professional scriptwriter and content coach. Study this content's style and teach the creator to write a script that captures the same energy and format.

**STEP 1 — ANALYZE THE STYLE DNA**
From this content, identify: the opening hook technique, the pacing (fast/slow/punchy), the vocabulary level, the personality (educational? provocative? vulnerable?), and how information is sequenced.

**STEP 2 — DEFINE THE SCRIPT STRUCTURE**
Based on the content above, map out the EXACT script structure as a template:
[0:00-0:10] Hook — [describe the technique]
[0:10-0:40] Setup — [describe what to establish]
[0:40-2:00] Core Content — [describe the flow of information]
[2:00-2:20] Payoff — [describe the conclusion technique]
[2:20-2:30] CTA — [describe the call to action style]

**STEP 3 — WRITE THE HOOK SECTION** (the most critical part)
Write 3 alternative opening hooks in the same style as this content. Each should be 2-3 sentences max, high-energy, and make the viewer feel they CANNOT skip ahead.

**STEP 4 — WRITE THE FULL SCRIPT**
Write a complete script (2-3 minutes when read aloud) on the SAME TOPIC as the original content but in the creator's own words. Include: [HOOK], [SETUP], [MAIN CONTENT - 3 points], [PAYOFF], [CTA]. Add stage directions like [pause], [cut to B-roll], [face cam] where relevant.

**STEP 5 — DELIVERY NOTES**
Give 3-4 specific tips on how to DELIVER this script on camera to match the energy of the original content.`,

  xposts: `You are a Twitter/X growth strategist and writing coach. Use this content to create a batch of high-performing X posts, and teach the creator HOW each one was crafted.

**STEP 1 — EXTRACT THE TWEETABLE MOMENTS**
Identify 5-7 specific lines, ideas, or insights from this content that are naturally tweet-worthy. What makes each one shareable? (Surprising? Contrarian? Relatable? Quotable?)

**STEP 2 — MATCH EACH TO A POST FORMAT**
For each tweetable moment, assign a proven X format:
• The Hot Take (bold, polarizing opinion)
• The Insight Drop (surprising truth in 1-2 lines)
• The Thread Opener (hooks you into a longer read)
• The Story Post (mini-narrative with a twist)
• The Listicle (numbered insights)
• The Quote Post (quotable + your commentary)

**STEP 3 — WRITE ALL 7 POSTS**
For each post, explain the format choice and strategy FIRST, then write the full post:

Post 1 — [Format]: [Why this works] → [Full post]
Post 2 — [Format]: [Why this works] → [Full post]
...and so on.

**STEP 4 — THE THREAD VERSION**
Take the richest idea and expand it into a 5-tweet thread. Tweet 1 = hook. Tweets 2-4 = the body. Tweet 5 = the closer + CTA.

**STEP 5 — POSTING STRATEGY**
Suggest the best 3 posts to publish THIS WEEK, in what order, and why (pacing, algorithm, audience warm-up).`,

  atomizer: `You are a content repurposing strategist and coach. Your job is to help the creator turn this one piece of content into a week's worth of platform-specific posts — with step-by-step guidance on HOW to do it.

**STEP 1 — IDENTIFY THE CONTENT ATOMS**
Break the content into 5-7 standalone "atomic" ideas — each powerful enough to stand alone as a post. For each atom, state: the core idea, the target emotion, and which platform it's best suited for.

**STEP 2 — MATCH ATOMS TO PLATFORMS**
Map each atom to the best platform and format:
| Atom | Platform | Format | Why it fits |
|------|----------|--------|-------------|
[fill in for each atom]

**STEP 3 — WRITE THE WEEKLY CONTENT PLAN**

📅 MONDAY — LinkedIn: [write the full post]
*Coach note: [explain the strategy for this day/platform]*

📅 TUESDAY — Twitter/X Thread: [write the full thread]
*Coach note: [explain the strategy]*

📅 WEDNESDAY — Instagram Caption: [write the full caption]
*Coach note: [explain the strategy]*

📅 THURSDAY — Short-Form Video Script: [write the full script, 60 sec]
*Coach note: [explain why this atom works as video]*

📅 FRIDAY — Email Newsletter Intro: [write the full intro paragraph]
*Coach note: [explain how to hook email readers]*

**STEP 4 — REPURPOSING PRINCIPLES**
Give the creator 3 rules for repurposing content without it feeling repetitive or lazy.`,

  // ─── CONTENT ANALYZER PROMPTS ───────────────────────────────────────────

  whyworks: `You are a world-class viral content strategist and behavioral psychologist. Break down EXACTLY why this content performed well — piece by piece, element by element. Every section must be its own standalone insight the creator can immediately understand and deploy.

STRICT FORMAT RULES:
- Leave a blank line between every individual point
- Each element gets its own block with four sub-lines: what it is, where it appears, why it works, how to deploy it
- Be specific to THIS content — never give generic advice
- Quote actual moments from the content wherever possible

---

## 🎯 THE HOOK — First 3 Seconds

**Technique used:**
[name it precisely — bold claim / pattern interrupt / curiosity gap / story open / statistic shock / pain point]

**Exact moment:**
[quote the opening line or describe the opening seconds]

**Why it stopped the scroll:**
[1–2 sentences on the specific psychological mechanism]

**How to deploy this hook style:**
[give a fill-in-the-blank template they can use on any topic]

---

## 🔍 WHY IT WORKED — Element by Element

Analyze each individual element that made this succeed. Give each one its own block, separated by blank lines:

**Element 1 — [Name the technique]**
↳ What it is: [1-sentence definition]
↳ Where it appears: [quote or describe the exact moment in the content]
↳ Why it works: [psychological reason — fear, identity, curiosity, status, social proof, etc.]
↳ Deploy it: [one clear instruction on how to use this in their own content]

**Element 2 — [Name the technique]**
↳ What it is:
↳ Where it appears:
↳ Why it works:
↳ Deploy it:

**Element 3 — [Name the technique]**
↳ What it is:
↳ Where it appears:
↳ Why it works:
↳ Deploy it:

**Element 4 — [Name the technique]**
↳ What it is:
↳ Where it appears:
↳ Why it works:
↳ Deploy it:

**Element 5 — [Name the technique]**
↳ What it is:
↳ Where it appears:
↳ Why it works:
↳ Deploy it:

---

## 🧠 THE PSYCHOLOGICAL TRIGGERS

List each trigger on its own block with a blank line between them:

**Trigger: [Name]**
→ Where it shows up: [specific moment]
→ What it makes the viewer feel or do: [exact emotional or behavioral effect]
→ Strength: [⚡⚡⚡ out of 5]

[repeat for each trigger found]

---

## 👤 THE AUDIENCE PROFILE

Who felt seen by this content — be surgical, not broad.

**Their situation:** [specific scenario, e.g. "Founders who've tried three strategies and still aren't growing"]

**Their secret fear:** [what they're afraid to admit]

**Their hidden desire:** [what they really want beneath the surface]

**The identity it reinforced:** [who they feel they are after consuming this]

---

## 🔁 THE RETENTION ENGINE

What prevented people from leaving — break each mechanism into its own line:

**Mechanism 1:** [name it] — [how exactly it shows up in this content]

**Mechanism 2:** [name it] — [how exactly it shows up in this content]

**Mechanism 3:** [name it] — [how exactly it shows up in this content]

---

## ✅ DEPLOY THIS STYLE — Replication Checklist

Five specific, actionable steps to replicate this content's success. Each on its own line:

1. [Step 1]

2. [Step 2]

3. [Step 3]

4. [Step 4]

5. [Step 5]`,

  formula: `You are a master content architect. Reverse-engineer this content's formula so completely that any creator could replicate it for any topic.

**STEP 1 — THE STRUCTURAL BLUEPRINT**
Map the EXACT sequence of this content element by element:
[1] → [2] → [3] → [4] → [5]...
Label each element (e.g., "Pattern interrupt hook", "Credibility anchor", "Core insight", "Story proof", "Identity close")

**STEP 2 — HOOK DECONSTRUCTION**
Type: [Bold claim / Question / Story open / Statistic / Controversy / Pain point / Pattern interrupt]
What makes it work: [specific analysis]
The exact hook template: "[fill in the blank template of this hook type]"

**STEP 3 — PACING & INFORMATION ARCHITECTURE**
How was information revealed? What sequence kept people engaged? When did the emotional tension peak? When was the payoff delivered? Map the energy curve.

**STEP 4 — VOICE & TONE FINGERPRINT**
Vocabulary level, sentence length, personality markers, POV (1st/2nd/3rd person), authority signals — define the creator's style in 5 attributes.

**STEP 5 — THE COMPLETE FILL-IN-THE-BLANK TEMPLATE**
Write a complete, fully detailed template with [BRACKETS] for every swappable element. Include section labels, approximate length guidance, and tone notes. Someone with any topic should be able to plug in and create something powerful.

**STEP 6 — REPLICATION CHECKLIST**
7 specific, non-negotiable elements a creator MUST include to successfully replicate this formula.`,

  generateprompt: `You are an expert AI prompt engineer and content strategist. Create a single, masterfully crafted AI prompt that any creator can use to replicate this content's success on any topic.

The prompt you write must:
1. Open with a precise role definition that captures this creator's exact energy and expertise
2. Define the target audience with emotional specificity (not demographics — psychographics)
3. Specify the hook formula extracted from this content
4. Lay out the structural sequence step by step
5. Include tone/voice instructions (vocabulary level, sentence rhythm, personality)
6. Include 2-3 examples of the kind of language/phrasing that should appear
7. Define the emotional journey the reader/viewer should go through
8. Specify the close/CTA style
9. End with a clear output format instruction

Write ONLY the final prompt — no explanation, no preamble. Start directly with "You are a..." Make it 200-300 words. It should be immediately copy-pasteable into any AI tool.`,

  transcript: `You are a content analyst and coach. Based on this content, create a detailed breakdown that teaches the creator exactly how this piece was constructed.

**INTRODUCTION ANALYSIS**
What was the likely opening technique? Write out what the hook probably looked, sounded, or read like — and why it worked.

**STRUCTURAL BREAKDOWN**
Walk through the main sections as if you've read the full piece:
• Section 1: [what was covered and why it was sequenced first]
• Section 2: [what came next and the strategic reason]
• Section 3: [the depth/proof section and how it builds trust]

**KEY INSIGHTS EXTRACTED**
The 4-5 most powerful statements, claims, or ideas in this content. These are the "quotable moments."

**EMOTIONAL ARC**
Map the emotional journey: where did it start (what feeling), what tension was created, where was the peak, and how did it resolve?

**CONCLUSION & CTA**
How did it close and what action did it drive? Why was that the right ending for this audience?

**CREATOR LESSON**
2-3 specific things to steal from this piece for your own content.`,

  linkedin: `You are a LinkedIn content strategist and writing coach. Walk through creating a high-performing LinkedIn post from this content — step by step.

**STEP 1 — THE LINKEDIN HOOK** (the most critical part)
LinkedIn stops scrolls with the first 2-3 lines. Write 2 hook options:
Option A: [Single powerful statement that ends with "Here's why:"]
Option B: [Relatable personal observation that opens a loop]

**STEP 2 — THE SETUP**
1-2 sentences that establish the context, stakes, or struggle. Make the reader nod in recognition.

**STEP 3 — THE CORE VALUE** (3-5 short paragraphs)
Write the main content in LinkedIn format: one idea per paragraph, max 2 sentences each, white space between every paragraph. Each paragraph should earn the next.

**STEP 4 — THE CLOSER**
End with a question that invites comments, or a bold reframe that makes people want to share.

**THE FINAL POST:**
Combine all of the above into a ready-to-publish LinkedIn post (150-250 words max). Use line breaks generously.`,

  // ─── LEARN / RETENTION ACTIONS ──────────────────────────────────────────────

  keypoints: `You are a learning coach. Extract the 5-7 most important ideas from this content for maximum comprehension.

Output ONLY in this exact format — no intro, no extra text:

KEY POINT 1: [concise point — 1-2 sentences max]
DETAIL: [one supporting sentence with a concrete example or evidence]

KEY POINT 2: [concise point]
DETAIL: [supporting sentence]

KEY POINT 3: [concise point]
DETAIL: [supporting sentence]

KEY POINT 4: [concise point]
DETAIL: [supporting sentence]

KEY POINT 5: [concise point]
DETAIL: [supporting sentence]

(Add up to 7 if the content warrants it. Prioritize ideas that would change how someone thinks or acts.)`,

  tldr: `You are a clarity expert. Your job is to give the reader instant comprehension of this content.

Write EXACTLY this structure — no preamble:

**THE CORE IDEA** (1 sentence)
[The single most important takeaway in plain language]

**WHAT YOU NEED TO KNOW** (3-4 bullet points)
• [key fact or idea]
• [key fact or idea]
• [key fact or idea]
• [key fact or idea]

**THE BOTTOM LINE** (1 sentence)
[What should the reader do, think, or believe differently after reading this?]`,

  eli5: `You are the world's best teacher. Explain this content so clearly that a curious 12-year-old — or someone brand new to this topic — would fully understand it.

Use the Feynman Technique:
1. Strip away all jargon and technical terms
2. Use a vivid real-world analogy or story to explain the core idea
3. Build up from the simplest version to the full picture
4. End with a memorable one-liner that makes the concept stick forever

Format:
**THE SIMPLE VERSION**
[Explain as if talking to someone with zero background — 2-3 sentences]

**THE ANALOGY**
[One concrete analogy that makes the abstract idea tangible — 3-4 sentences]

**BUILDING IT UP**
[Add one layer of complexity at a time — 3-4 short paragraphs]

**THE STICKY SUMMARY**
[One memorable sentence that captures the essence]`,

  flashcards: `You are a learning scientist creating spaced-repetition flashcards. Generate 7 flashcards from this content that test real understanding — not just memorization.

Rules:
- Questions should test comprehension, application, or "why" — not just recall of facts
- Answers should be concise (2-4 sentences max)
- Mix question types: definition, application, comparison, consequence

Output ONLY in this exact format — no intro, no extra text:

FLASHCARD 1
Q: [question]
A: [answer]

FLASHCARD 2
Q: [question]
A: [answer]

FLASHCARD 3
Q: [question]
A: [answer]

FLASHCARD 4
Q: [question]
A: [answer]

FLASHCARD 5
Q: [question]
A: [answer]

FLASHCARD 6
Q: [question]
A: [answer]

FLASHCARD 7
Q: [question]
A: [answer]`,

  quiz: `You are an expert educator creating a comprehension quiz. Generate 5 multiple-choice questions that test deep understanding of this content.

Rules:
- Each question has exactly 4 options (A, B, C, D)
- Wrong answers should be plausible — not obviously wrong
- Include a brief explanation for the correct answer
- Test application and reasoning, not just facts

Output ONLY in this exact format — no intro, no extra text:

QUESTION 1: [question text]
A) [option]
B) [option]
C) [option]
D) [option]
CORRECT: [A/B/C/D]
EXPLANATION: [1-2 sentences explaining why]

QUESTION 2: [question text]
A) [option]
B) [option]
C) [option]
D) [option]
CORRECT: [A/B/C/D]
EXPLANATION: [1-2 sentences]

QUESTION 3: [question text]
A) [option]
B) [option]
C) [option]
D) [option]
CORRECT: [A/B/C/D]
EXPLANATION: [1-2 sentences]

QUESTION 4: [question text]
A) [option]
B) [option]
C) [option]
D) [option]
CORRECT: [A/B/C/D]
EXPLANATION: [1-2 sentences]

QUESTION 5: [question text]
A) [option]
B) [option]
C) [option]
D) [option]
CORRECT: [A/B/C/D]
EXPLANATION: [1-2 sentences]`,

  whymatters: `You are a strategic thinking coach. Help the reader understand WHY this content matters and how to apply it in the real world.

**WHY THIS MATTERS RIGHT NOW**
What problem does this solve, or what opportunity does it reveal? Why should someone care about this TODAY — not abstractly, but in practical terms?

**THE REAL-WORLD IMPACT**
If someone truly understood and applied the ideas in this content, what would change? Be specific — describe a concrete before/after scenario.

**3 WAYS TO ACT ON THIS**
Give 3 specific, actionable things the reader can do this week using the insights from this content. Each action should be concrete enough to start today.
→ Action 1: [specific action]
→ Action 2: [specific action]
→ Action 3: [specific action]

**THE BIGGER PICTURE**
How does this connect to a larger trend, principle, or shift happening in the world? What does understanding this unlock?`,

  connections: `You are a synthesis expert who sees patterns across disciplines. Your job is to connect this content to other knowledge domains to deepen understanding.

**THE CORE PRINCIPLE** (abstracted)
Strip away the specific domain. What is the underlying universal principle at work here? State it as a timeless rule.

**ANALOGIES THAT MAKE IT CLICK**
Give 3 analogies from completely different domains that illuminate the same principle:
🎯 Analogy 1 (from nature/biology): [explain the parallel]
🎯 Analogy 2 (from everyday life): [explain the parallel]
🎯 Analogy 3 (from another field): [explain the parallel]

**WHERE ELSE YOU SEE THIS**
Name 3-4 other areas, fields, or situations where this exact same pattern plays out. For each: name it, explain the connection in 1 sentence.

**WHAT THIS UNLOCKS**
Understanding this principle gives you a mental model. What other problems can you now see differently through this lens? Give 2 examples.`,

  // ─── BASIC CONTENT ──────────────────────────────────────────────────────

  summary: `Write a comprehensive overview of this content in 4-6 well-structured paragraphs. Cover: the main thesis, key supporting points, important examples or evidence, and the conclusion. Use clear, accessible language. No bullet points — flowing paragraphs only.`,

  cleantranscript: `Clean this transcript by removing: filler words (um, uh, like, you know, basically, literally), false starts and stutters, excessive repetition, and awkward transcription artifacts. Preserve the speaker's voice, style, and all actual content. Fix punctuation and capitalization. Output only the cleaned text with no commentary, headers, or labels.`,

  propernotes: `Create comprehensive, well-organized study notes from this content.

## Main Topic
**Core Thesis:** [1 sentence]

## Key Points
1. [Point] — [Brief explanation]
2. [Point] — [Brief explanation]
(continue for all major points)

## Supporting Evidence & Examples
- [Evidence or example with context]

## Key Definitions
**[Term]:** [Clear definition]

## Actionable Takeaways
→ [Specific insight to apply]
→ [Specific insight to apply]

## Open Questions
- [Question this content raises or leaves unanswered]`,

  microsummary: `Summarize this content in exactly 1-2 sentences. Capture the single most important point. Be specific — no vague generalities.`,

  shortsummary: `Write a focused, accurate summary in one paragraph (4-6 sentences). Cover: what this is about, the main point, why it matters, and one key takeaway. Write for someone who hasn't seen the content.`,

  bulletpoints: `Break this content into clear, scannable bullet points organized by theme.

**[Theme / Section 1]**
• [Key point — 1 sentence]
• [Key point — 1 sentence]

**[Theme / Section 2]**
• [Key point]
• [Key point]

Continue for all major sections. Keep bullets tight — one idea per bullet.`,

  notablequotes: `Extract the 5-8 most memorable, quotable, and impactful lines from this content.

Format each as:
"[quote or paraphrased key statement]"
Context: [brief note on when/why this was said]
Why it stands out: [1 sentence on its significance or impact]

Prioritize lines that are: surprising, deeply insightful, emotionally resonant, or highly shareable.`,

  // ─── ANALYSIS ───────────────────────────────────────────────────────────

  extractideas: `Extract every distinct idea from this content as a numbered list.

[#]. **[Idea headline — 4-6 words]**
[1-2 sentence explanation]

Include main ideas, supporting ideas, implied ideas, and creative combinations. Aim for 10-15 ideas. Order from most central to most peripheral.`,

  extractinsights: `Extract the deep, non-obvious insights from this content — the truths beneath the surface that most people miss.

For each insight:
🔍 **[Insight in bold]**
Surface: [what it appears to say]
Deeper: [the real, non-obvious truth]
Application: [one practical way to use this]

Find 5-8 insights. Focus on things that shift perspective, not just information.`,

  extractpatterns: `Identify all recurring patterns, themes, and structures across this content.

**Recurring Themes:**
• [Theme] — how it shows up: [specific examples]

**Structural Patterns:**
• [Pattern in how ideas are sequenced or framed]

**Behavioral / Situational Patterns:**
• [Patterns in the events, choices, or examples described]

**Language Patterns:**
• [Repeated phrases, metaphors, or rhetorical devices]

Explain what each pattern reveals about the content's deeper meaning.`,

  extractwisdom: `Extract the timeless wisdom, principles, and transferable lessons from this content.

**Principle [#]:** [State as a universal, timeless rule]
From the content: [how it appears here]
Wider application: [where else this principle applies]
Remember it as: [a memorable one-liner]

Find 5-7 wisdom principles. Prioritize insights that are transferable across domains, not context-specific facts.`,

  // ─── STUDY & EDUCATION ──────────────────────────────────────────────────

  conceptmap: `Create a text-based concept map of this content.

CENTRAL CONCEPT: [main topic]
│
├── [Branch 1: major theme]
│   ├── [Sub-concept]
│   └── [Sub-concept]
│
├── [Branch 2: major theme]
│   ├── [Sub-concept]
│   │   └── [Detail]
│   └── [Sub-concept]
│
└── [Branch 3: major theme]
    └── [Sub-concept]

CONNECTIONS:
• [Concept A] ↔ [Concept B]: [nature of relationship]
• [Concept C] → [Concept D]: [nature of relationship]

Include all major concepts and their meaningful relationships.`,

  qa: `Create a comprehensive Q&A study guide from this content.

Q: [Question]
A: [Complete, clear answer in 2-4 sentences]

Generate 12-15 Q&A pairs covering: key definitions, main arguments, cause-and-effect, examples, and "why/how" questions (not just "what"). Order from foundational to advanced understanding.`,

  outlinenotes: `Convert this content into a detailed hierarchical outline.

I. [Main Point]
   A. [Sub-point]
      1. [Supporting detail]
      2. [Supporting detail]
   B. [Sub-point]

II. [Main Point]
   A. [Sub-point]
   B. [Sub-point]

Use Roman numerals → Letters → Numbers → Lowercase letters for each level of nesting. Cover all major and notable minor points.`,

  cornellnotes: `Create Cornell Notes from this content.

CUES / QUESTIONS          | NOTES
--------------------------|------------------------------------------
[Key question or cue]     | [Detailed note or answer]
                          | [Supporting detail]
                          |
[Key question or cue]     | [Detailed note or answer]
                          | [Supporting detail]
                          |
[Key question or cue]     | [Detailed note or answer]
                          |
(add more as needed)      |

SUMMARY:
[3-5 sentence synthesis of the entire content in your own words, capturing the main ideas and their significance]`,

  rapidlogging: `Convert this content to Bullet Journal Rapid Logging format.

Symbols:
• Note / fact
○ Idea or insight
→ Action item or takeaway
★ Important / key point
? Question raised
! Surprising or noteworthy

[Section / Topic]:
★ [Most important point]
• [Fact]
• [Fact]
→ [Takeaway]
? [Question it raises]
○ [Idea sparked]

Keep each entry to one line. Cover all major points.`,

  tnotemethod: `Create T-Notes from this content (two-column format).

TOPIC / CUE              | NOTES / DETAILS
-------------------------|----------------------------------------
[Topic or keyword]       | [Explanation, examples, details]
                         |
[Topic or keyword]       | [Explanation, examples, details]
                         |
[Topic or keyword]       | [Explanation, examples, details]
                         |
(continue for all        | (full explanations on the right)
 major topics)           |

BOTTOM SUMMARY:
[2-3 sentence synthesis of the most important ideas from the entire content]`,

  chartingmethod: `Organize this content using the Charting Method.

| Category | Key Points | Evidence / Examples | Why It Matters |
|----------|-----------|---------------------|----------------|
| [Topic]  | [Points]  | [Examples]          | [Significance] |
| [Topic]  | [Points]  | [Examples]          | [Significance] |
| [Topic]  | [Points]  | [Examples]          | [Significance] |

Create as many rows as needed. Be specific and concise in each cell. This format is for comparing multiple topics/categories efficiently.`,

  qecmethod: `Apply the QEC (Question → Evidence → Conclusion) method to this content.

For each major argument or topic:

QUESTION: [The question this section addresses]
EVIDENCE:
• [Evidence point 1]
• [Evidence point 2]
• [Evidence point 3]
CONCLUSION: [What we can conclude from this evidence]

---

Repeat for 4-6 major topics. End with:

OVERALL THESIS: [The main argument or conclusion of the entire content in 1-2 sentences]`,

  qasplitpage: `Create a Q&A Split Page study guide — fold in half to quiz yourself.

LEFT (QUESTION)           | RIGHT (ANSWER)
--------------------------|------------------------------------------
[Question?]               | [Complete answer — 2-3 sentences]
                          |
[Question?]               | [Complete answer]
                          |
[Question?]               | [Complete answer]
                          |
(12 Q&A pairs minimum)    |

Study tip: Cover the right column and answer each question from memory before checking.`,

  // ─── CONTENT CREATION ───────────────────────────────────────────────────

  viralclips: `Identify the 5-7 most viral-worthy moments from this content for short-form video.

🎬 CLIP [#]: "[Clip title]"
Location: [approximate position — early/middle/late]
Ideal length: [15-60 seconds]
Opening hook: "[The line that would stop the scroll]"
Payoff: [what makes it worth watching to the end]
Why it's viral: [shocking / relatable / inspiring / educational / funny]
Caption: "[Suggested social caption]"
Best for: [TikTok / Instagram Reels / YouTube Shorts]

Rank from highest to lowest viral potential.`,

  twitterideas: `Generate 10 Twitter/X post ideas from this content. Vary formats and angles.

[#]. [Post idea — 1 sentence headline]
Format: [Thread / Single tweet / Poll / Quote tweet]
Hook: "[Opening line — 280 chars max]"
Why it works: [engagement angle in 1 sentence]

Mix: hot takes, surprising facts, relatable observations, practical tips, questions.`,

  linkedinarticle: `Write a full LinkedIn article based on this content.

**[Compelling, specific article title]**

[Hook paragraph — personal story or surprising insight, 2-3 sentences that make you want to read more]

**[Section 1 headline]**
[3-4 paragraphs with the first key idea, concrete examples, and insight]

**[Section 2 headline]**
[3-4 paragraphs building on the first section]

**[Section 3 headline]**
[3-4 paragraphs — the deepest or most practical insight]

**The Bottom Line**
[2-3 sentence conclusion with a strong, memorable takeaway]

*[Call to action — question for comments or a prompt to share]*

600-800 words. Short paragraphs, plenty of white space.`,

  blogarticle: `Write a complete blog article based on this content.

# [SEO-Friendly, Specific Title]
*[Subheadline — the specific promise or benefit of reading this]*

---

[Introduction — Hook + context + what the reader will learn. 2-3 paragraphs.]

## [Section 1 headline]
[Full section — 3-4 paragraphs with explanation, examples, and insight]

## [Section 2 headline]
[Full section — 3-4 paragraphs]

## [Section 3 headline]
[Full section — 3-4 paragraphs]

## Conclusion
[Summary + the most important takeaway + call to action. 2 paragraphs.]

---
700-900 words. Write for readers who know nothing about this topic.`,

  blogoutline: `Create a detailed blog post outline based on this content.

**Working Title:** [SEO-friendly, specific title]
**Target Reader:** [specific description — who they are and what they want]
**Core Promise:** [what the reader gains from this post]

---

**I. Introduction**
- Hook: [specific opening idea]
- Context: [background to establish]
- Thesis / Promise: [the main point or takeaway]

**II. [Section 1 headline]**
- Main point
- Supporting detail + example
- Sub-point

**III. [Section 2 headline]**
- Main point
- Supporting detail
- Sub-point

**IV. [Section 3 headline]**
- Main point
- Supporting detail
- Sub-point

**V. Conclusion**
- Key summary
- Call to action

**Target keywords:** [5-7 relevant phrases]`,

  tweetideas: `Generate 12 individual tweet ideas from this content. Each must stand alone — no context needed.

[#]. "[Tweet text — 280 characters max]"
Type: [Hot take / Surprising fact / Story / List / Question / Quote]
Engagement hook: [why people would like/RT/reply]

Include a variety: controversial takes, "I never knew this" facts, relatable moments, practical tips, and thought-provoking questions.`,

  // ─── SPECIALIZED ────────────────────────────────────────────────────────

  speakerid: `Profile the speaker(s) or author(s) of this content.

**SPEAKER PROFILE**
Name / Identity: [who is speaking, if identifiable]
Domain / Expertise: [their field based on what they say]
Credibility signals: [credentials, experience, or authority they establish]
Communication style: [formal/casual, pace, vocabulary level, tone]
Perspective / Angle: [their apparent worldview, agenda, or bias]

**DISTINCTIVE LANGUAGE PATTERNS**
• [Characteristic phrase, metaphor, or vocabulary choice]
• [Another distinctive pattern]

**CREDIBILITY ASSESSMENT**
Strengths: [what makes them credible on this topic]
Watch-outs: [potential biases, blind spots, or unsupported claims]

**VERDICT**
[1-paragraph summary of who this speaker is and how to weigh their perspective]`,

  aichecker: `Analyze this content for indicators of AI generation vs. human authorship.

**ASSESSMENT: [LIKELY HUMAN / MIXED / LIKELY AI]**

**Human-Authorship Indicators:**
✓ [specific element suggesting human origin]
✓ [another human element — personal anecdote, specific memory, unique phrasing]

**AI-Generation Indicators:**
⚠ [specific AI-typical pattern — overly structured, generic transitions, hedging language]
⚠ [another AI pattern]

**DETAILED ANALYSIS:**
Vocabulary & phrasing: [analysis]
Sentence variety: [analysis]
Emotional authenticity: [analysis]
Specificity vs. generality: [analysis]
Logical flow: [analysis]
Personal voice / idiosyncrasies: [analysis]

**CONCLUSION**
[2-3 sentence verdict with reasoning]
Note: This is probabilistic — not definitive proof of AI generation.`,

  predictions: `Based on the trends, arguments, and trajectory described in this content, make specific, reasoned predictions.

**SHORT-TERM (6-12 months)**
1. [Specific prediction] — Confidence: HIGH / MED / LOW
   Reasoning: [why, based on what's in the content]

**MEDIUM-TERM (1-3 years)**
1. [Specific prediction] — Confidence: HIGH / MED / LOW
   Reasoning: [why]

**LONG-TERM (3-10 years)**
1. [Specific prediction] — Confidence: HIGH / MED / LOW
   Reasoning: [why]

**WHAT COULD DISRUPT THIS**
• [Counter-scenario or risk that could invalidate a prediction]

**THE MOST IMPORTANT PREDICTION TO WATCH**
[The one prediction with the biggest stakes and why]`,

  references: `Extract and catalog all references, citations, and external mentions in this content.

**PEOPLE MENTIONED**
• [Name] — [role and context they appear in]

**BOOKS & PUBLICATIONS**
• [Title] — [Author if mentioned] — [why referenced]

**DATA & STATISTICS**
• "[Stat or claim]" — Source: [if given, else "unverified"] — Context: [what it supports]

**RESEARCH & STUDIES**
• [Finding] — [Institution/Author] — [what it showed]

**ORGANIZATIONS & PLACES**
• [Name] — [context]

**TOOLS & RESOURCES MENTIONED**
• [Tool/resource] — [purpose or recommendation]

Mark any unverified claims as ⚠ UNVERIFIED. Recommend checking key statistics before sharing.`,

  mainidea: `Identify the single central idea of this content.

**THE MAIN IDEA** (one sentence):
[State the core argument, message, or insight as precisely as possible]

**WHY THIS IS THE MAIN IDEA:**
[2-3 sentences showing how the rest of the content builds toward or supports this central point]

**HOW IT'S DEVELOPED:**
Opening: [how the content introduces or frames this idea]
Middle: [how it's built, argued, or demonstrated]
Closing: [how it's resolved, reinforced, or applied]

**THE MOST MEMORABLE FORM:**
If someone could remember only one thing from this content, it would be: "[restate as the most quotable, memorable version]"`,

  // ─── PRESET TEMPLATES ───────────────────────────────────────────────────

  thread: `You are a Twitter/X thread strategist and writing coach. Build a high-performing thread from this content step by step.

**STEP 1 — THE HOOK TWEET** (Tweet 1)
This tweet must work as a standalone post AND make people click "read more."
Write 3 options:
Option A: Bold promise ("I [did X] for [time]. Here's what I learned:")
Option B: Surprising truth ("Most people think [X]. The reality is [Y]:")
Option C: Story open ("3 years ago I [situation]. Today [transformation]. Thread 🧵")

**STEP 2 — THE SETUP TWEET** (Tweet 2)
Expand on the hook. Establish why this matters and what the reader will get. Keep it to 2-3 lines.

**STEP 3 — THE VALUE TWEETS** (Tweets 3-7)
Each tweet = one insight. Format: bold statement or numbered point + 1-2 supporting sentences + a concrete example where possible.

**STEP 4 — THE CLOSER TWEET** (Tweet 8)
Restate the core lesson in one memorable line. Follow with a CTA: "Follow me for more on [topic]" or "RT if this helped."

**THE COMPLETE THREAD:**
Write all 8 tweets numbered and ready to post.`,
};

const ACTION_LABELS: Record<string, string> = {
  variations:      'content variations',
  longform:        'a longform article',
  analyze:         'a reverse-engineering breakdown',
  replicate:       'a replication of this format',
  dailypost:       'a daily post',
  ideabank:        'a bank of content ideas',
  scriptemulator:  'a video script',
  xposts:          'X / Twitter posts',
  atomizer:        'a week of cross-platform content',
  linkedin:        'a LinkedIn post',
  thread:          'a Twitter thread',
};

const HIGH_TOKEN_ACTIONS = [
  'analyze','transcript','whyworks','formula','generateprompt',
  'longform','replicate','flashcards','quiz','connections','keypoints','whymatters',
  'summary','propernotes','cornellnotes','outlinenotes','blogarticle','linkedinarticle',
  'viralclips','qa','conceptmap','blogoutline','qecmethod','chartingmethod',
  'extractinsights','extractwisdom','extractideas','extractpatterns',
  'speakerid','aichecker','predictions','references','rapidlogging','tnotemethod',
  'qasplitpage','twitterideas','tweetideas','notablequotes',
];

function buildCoachingPrompt(action: string, content: string, title: string): string {
  const label = ACTION_LABELS[action] || 'content';
  const generationSteps = PROMPTS[action] || PROMPTS.summarize;

  // Reverse Engineer: show the full breakdown FIRST, then coach on applying it
  if (action === 'analyze') {
    return `You are a master content strategist. The creator wants to reverse-engineer this content.

REFERENCE CONTENT:
Title: "${title}"
${content ? `Content: "${content.slice(0, 8000)}"` : '(no content — work from title)'}

━━ YOUR OPENING MESSAGE — DO THIS IMMEDIATELY ━━
Do NOT ask any questions first. Instead:

1. Deliver the FULL reverse-engineering breakdown using this format:

${PROMPTS.analyze}

2. After the full breakdown, add this closing section:

---

💡 **Now let's make this yours.**

Ask the creator exactly 2 questions:
— A personal story, experience, or strong opinion they have connected to this topic
— ONE specific person in their audience this should speak to (be surgical: not "entrepreneurs" — "the founder who tried everything and still can't get traction")

━━ AFTER THEY RESPOND ━━
- If their answer is vague → push for 1 more specific detail
- If their answer is specific → write [GENERATE] on its own line, then immediately write a new version of this content in their voice, using the exact formula you just broke down, built around what they shared.
- After their 2nd reply: ALWAYS generate.

CRITICAL: Never generate the personalized content before writing [GENERATE].`;
  }

  return `You are a sharp content coach. The creator wants to make ${label}.

Your job: ask questions until their thinking is specific and personal — then generate.

REFERENCE CONTENT:
Title: "${title}"
${content ? `Content: "${content.slice(0, 8000)}"` : '(no content — work from title)'}

━━ COACHING RULES ━━
1. Open with EXACTLY 2 focused questions targeting:
   — A personal story, memory, or strong opinion connected to this topic
   — ONE specific person in their audience (not "entrepreneurs" — "the founder who feels invisible online")
2. After each user response, judge honestly: Is this specific and personal?
   • Still vague (e.g., "my audience", "people who want to grow") → ask 1–2 follow-up questions. Push for a real moment, a name, a specific feeling.
   • Specific and personal → write [GENERATE] on its own line, then immediately produce the full output.
3. After the user's 3rd message: ALWAYS generate — no more questions.
4. Keep your question messages SHORT (3–5 lines). This is a back-and-forth, not a lecture.
5. Never generate content before you write [GENERATE].

━━ GENERATION FORMAT (after [GENERATE]) ━━
${generationSteps}

CRITICAL: Every step must weave in what the creator shared — their specific story, their exact audience, their stated perspective. No generic content allowed.`;
}

interface ConvMessage { role: 'user' | 'assistant'; content: string; }

export async function POST(req: NextRequest) {
  const {
    action,
    content,
    title,
    coachingMode,
    messages,
    forceGenerate,
  }: {
    action: string;
    content?: string;
    title?: string;
    coachingMode?: boolean;
    messages?: ConvMessage[];
    forceGenerate?: boolean;
  } = await req.json();

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not set. Add it to .env.local to enable AI features.' },
      { status: 503 }
    );
  }

  try {
    // ── Coaching / conversation mode ──
    if (coachingMode && messages !== undefined) {
      let systemPrompt = buildCoachingPrompt(action, content || '', title || '');
      if (forceGenerate) {
        systemPrompt += '\n\nIMPORTANT: The creator has provided enough context. Write [GENERATE] immediately and produce the full output now.';
      }
      const userMsgCount = messages.filter((m) => m.role === 'user').length;
      const completion = await chatWithFallback({
        model: 'gemini-3.6-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(messages.length === 0
            ? [{ role: 'user' as const, content: 'Start the coaching session.' }]
            : messages),
        ],
        temperature: 0.8,
        max_tokens: (userMsgCount >= 2 || forceGenerate) ? 4096 : 1200,
      });
      const result = completion.choices[0]?.message?.content || '';
      return NextResponse.json({ result });
    }

    // ── Standard single-turn mode ──
    const basePrompt = PROMPTS[action] || PROMPTS.summarize;
    const prompt = basePrompt + '\n\nIMPORTANT: Never ask the user any questions. Never end your response with a question.';
    const rawContent = content || '';

    // NVIDIA NIM: credit-based limits, Llama 3.3 70B supports 128k context.
    // Send up to 100,000 chars. For longer content, sample 5 evenly-spaced
    // segments so the AI sees the full arc — not just the opening section.
    const TOTAL_BUDGET = 100000;
    let contentBlock: string;
    if (rawContent.length <= TOTAL_BUDGET) {
      contentBlock = rawContent;
    } else {
      const seg = Math.floor(TOTAL_BUDGET / 5);
      const len = rawContent.length;
      const s0 = rawContent.slice(0, seg);
      const s1 = rawContent.slice(Math.floor(len * 0.25) - seg / 2, Math.floor(len * 0.25) + seg / 2);
      const s2 = rawContent.slice(Math.floor(len * 0.50) - seg / 2, Math.floor(len * 0.50) + seg / 2);
      const s3 = rawContent.slice(Math.floor(len * 0.75) - seg / 2, Math.floor(len * 0.75) + seg / 2);
      const s4 = rawContent.slice(-seg);
      contentBlock = [
        s0,
        `\n[...25% through the content...]\n\n${s1}`,
        `\n[...halfway through the content...]\n\n${s2}`,
        `\n[...75% through the content...]\n\n${s3}`,
        `\n[...end of content...]\n\n${s4}`,
      ].join('\n');
    }

    const userMessage = [
      title ? `Title: ${title}` : '',
      contentBlock
        ? `Content (you are receiving ${rawContent.length > TOTAL_BUDGET ? '5 evenly-sampled segments covering the full piece' : 'the complete content'} — cite specific quotes and details from ALL parts, not just the opening):\n\n${contentBlock}`
        : '',
    ].filter(Boolean).join('\n\n');

    const completion = await chatWithFallback({
      model: 'gemini-3.6-flash',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: HIGH_TOKEN_ACTIONS.includes(action) ? 8192 : 2048,
    });
    const result = completion.choices[0]?.message?.content || '';
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI request failed' },
      { status: 500 }
    );
  }
}
