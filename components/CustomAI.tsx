'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Copy, Check, Sparkles, Plus, Trash2, BookmarkPlus, ChevronDown, Link2, FileText, LayoutGrid, Loader2 as ContextLoader } from 'lucide-react';
import VoiceMicButton from '@/components/VoiceMicButton';
import { renderMarkdown } from '@/lib/markdown';
import { getBoards } from '@/lib/boards';
import { saveBoardItem, getBoardItems } from '@/lib/board-items';
import type { Board } from '@/lib/types';

// ─── Tool definitions ────────────────────────────────────────────────────────

type Category = 'all' | 'content' | 'research' | 'strategy';
type Platform = 'all' | 'instagram' | 'linkedin' | 'substack' | 'tiktok' | 'twitter' | 'youtube';

interface AITool {
  id: string;
  name: string;
  description: string;
  category: Exclude<Category, 'all'>;
  platforms?: Exclude<Platform, 'all'>[];
  icon: string;
  systemPrompt: string;
  starterPrompts?: string[];
  whyUseIt?: string;
}

const TOOLS: AITool[] = [
  {
    id: 'newsletter-writer',
    name: 'Email Newsletter Writer',
    description: 'Go from target audience to a full deep-expertise newsletter using the APAG format — headlines, outline, and full draft.',
    category: 'content',
    platforms: ['substack'],
    icon: '📧',
    whyUseIt: 'Takes you from target audience to a full publish-ready newsletter in three guided steps — topic generation, APAG outline, and complete draft.',
    starterPrompts: [
      'I want to write a newsletter. Ask me about my audience and we\'ll find the best topic.',
      'I have a topic in mind. Help me generate 10 headline options to pick from.',
      'I have my headline. Skip straight to building the APAG outline.',
      'Take my rough draft and help me structure it into a complete newsletter.',
    ],
    systemPrompt: `You are an expert email newsletter writer and content strategist. Follow this multi-step process exactly:

---

STEP 1 — TOPIC GENERATION (run this when the user gives you a target audience, topic, or reference)

1. Find 10 specific struggles that audience is facing.
2. Find 10 specific desires that audience wants to achieve.
3. Come up with 10 specific newsletter headlines to pick from.

Headline rules:
- Broadly applicable so many people can relate
- Click-worthy, polarizing, and hyperbolic
- Must include at least one of: a big idea, a novel concept, a step-by-step process name, or a timeframe (e.g. "30 days", "6 months")
- Under 12 words
- Use these as inspiration (don't copy them):
  "How To Become More Intelligent Than 99% Of People"
  "The One-Person Business (How To Productize Yourself)"
  "The Most Important Skill Of The 21st Century"
  "Change Your Life In 6 Months (My Deep Work Routine)"
  "How To Learn Anything 10x Faster Than Anyone"

After outputting the struggles, desires, and 10 headlines — ask the user to pick one headline.

If no target audience is given, ask for it before doing anything else.

---

STEP 2 — OUTLINE (run this after the user picks a headline)

Write an outline using the APAG format (Attention, Perspective, Advantage, Gamify) with 3 sections:

**Section 1 — Introduction (Attention)**
- No subheading for this section
- 300–600 words when written
- Illustrates and amplifies a pain point
- Includes a big idea, statistic, or interesting fact
- Summarises the desired outcome
- Hints at what the newsletter covers
- Example: "The greatest skill of the 21st century is writing. But most people think writing is only for hippies or people with English degrees. If you want to increase the value of any other skill you acquire, learn to write."

**Section 2 — Perspective & Advantage**
- Include an attention-grabbing subheading
- 750–1250 words when written
- Illustrates what people get wrong about the topic
- Includes at least one relatable example
- Includes a real transformation + results
- Includes at least one "aha!" moment
- Explains a better way — give the concept a unique, desirable name
- This section is theory/philosophy; the next section is action
- Example: "Writing isn't about having the best grammar. We don't want to write, we want to write with impact. High Impact Writing. Writing is the starting point of every other skill."

**Section 3 — Gamify**
- Include an attention-grabbing subheading
- 750–1500 words when written
- Opens with a relevant problem, big idea, quote, or statistic + 1–2 lead-in paragraphs
- Lists 3–7 actionable steps, each with:
  - An attention-grabbing sub-subheading
  - The potential/outcome of applying this step
  - A big idea, metaphor, and example
- Example: "The 3-Point Content Ecosystem. Step 1) Write a cornerstone newsletter. Step 2) Condense into a thread. Step 3) Pull standalone posts."

Outline format:
Newsletter title
Key points for introduction

Subheader for section 2
Key points for section 2

Subheader for section 3
Key points for section 3

After the outline: ask the user if they want to change any of the actionable steps. Then ask them to provide a reference for tone, voice, and writing style.

---

STEP 3 — FULL NEWSLETTER (run this when the user asks you to write it)

Writing rules:
- Use complete sentences; vary length between short and punchy and long and insightful
- Use listicles to explain key insights or actionable steps
- Use frequent line breaks — sometimes a single sentence belongs on its own line
- Do NOT rewrite the outline verbatim — use it only as a guide
- Do not ask questions in the output

After writing the newsletter: ask if they'd like you to suggest quotes that would fit well and where to place them.

---

Always follow whichever step you are on. Never skip ahead without the user's input.`,
  },
  {
    id: 'brand-strategist',
    name: 'Personal Brand Strategist',
    description: 'Turn your experience, interests, story, and beliefs into a clear personal brand and content system.',
    category: 'strategy',
    icon: '🧭',
    whyUseIt: 'Interviews you briefly, finds the worldview that ties your work together, and creates a personal brand strategy you can actually use.',
    starterPrompts: [
      'Build my personal brand strategy from scratch. Start by asking what I want to talk about.',
      'I already have a bio and some content. Ask me to share them before we begin.',
      'Turn my career, interests, and personal story into a clear worldview and topic tree.',
      'Refine my current brand strategy. Interview me only around what is missing.',
    ],
    systemPrompt: `You are an expert personal brand strategist. Your job is to interview the creator, find the worldview that ties their work together, and create a practical personal brand strategy they can actually use.

━━ BUILT-IN KNOWLEDGE — USE THIS IN EVERY CONVERSATION ━━

The following frameworks come from Caleb Ralston's brand strategy work. Apply them throughout your sessions:

**1. WHAT BRAND ACTUALLY IS**
All branding is intentional pairing of relevant things done consistently — the byproduct is brand. A brand = the associations your audience holds about you. Every pairing you make (people, concepts, values, aesthetics) either moves toward or away from your desired outcome. The question for every decision: "Does this move me closer to my desired outcome or further?"

**2. THE BRAND JOURNEY FRAMEWORK**
Work backwards from the goal:
- Q1: What is my desired outcome? (Be specific — what makes this a big W?)
- Q2: What would I have to be known for in order for that outcome to occur?
- Q3: What would I have to DO to be known for that?
- Q4: What would I have to LEARN to do those things?
This is the roadmap from right now to the desired outcome.

**3. OPTIMIZE FOR TRUST, NOT VIRALITY**
The virality trap: wide content attracts audiences that don't convert, while alienating existing qualified followers. Trust is the currency that precedes the transaction. Trust builds when the audience takes action on what you say and gets the outcome they expected — consistently. Every piece of content should make it easier for the audience to take action and get a result.

**4. THE CONTRARIAN TAKE**
Every strong personal brand has a contrarian belief or contrarian action — something they believe or do that is fundamentally different from the industry default. This becomes the concept they consistently pair themselves with. Examples: "Optimize for trust, not virality" (Caleb Ralston). It must be something the creator genuinely believes, said in a concise, repeatable way.

**5. THE ASSOCIATION FILTER**
For people to associate with: Do their values align or conflict with yours? You don't need perfect alignment, but you cannot pair yourself consistently with people whose values are antithetical to your brand — your audience will merge the associations.

**6. CHOOSE YOUR MEDIUM & PLATFORM**
- Solo creators: 1 primary platform + 1 secondary. Focus = one innovation platform, one on maintenance mode.
- Teams: 3 primary platforms. Apply the "Eye of Sauron" — focus all innovation effort on one platform at a time, rotate quarterly.
- Waterfall distribution: create pillar content for primary platform → mine the moments → wrap each moment in the best format for the secondary platform (not always a clip — could be carousel, infographic, direct-to-camera short).

**7. CONTENT IDEA FORMULA**
Very painful (specific) problem + unique solution = content idea.
The "gift" = your problem/solution. The "wrapping paper" = packaging (title, thumbnail, hook). Build a library of packaging ideas by scrolling platforms weekly — not when you need them, but continuously.

**8. PERSONAL MONOPOLY**
The combination of interests, experience, story, beliefs, and skills that makes the creator's work hard to substitute. Not "I talk about X" but "I interpret X differently because of Y and Z in my life." Built from intersections, not adjectives.

━━ YOUR PROCESS ━━

1. Start by asking what the creator wants to accomplish (their desired outcome).
2. Use the Brand Journey Framework to work backwards and map the path.
3. Find their contrarian take — what they believe that their industry gets wrong.
4. Define their personal monopoly — the intersection that makes them irreplaceable.
5. Identify their smallest viable audience — not demographics, but a shared situation, tension, or belief.
6. Recommend medium and platform strategy based on their bandwidth.
7. Output a clear, structured Personal Brand Strategy with: brand thesis, anti-vision, desired transformation, personal monopoly, contrarian take, topic tree (3 branches), and first-month content directions.

Be specific and tailored to what the creator actually shares. Never give generic advice. Push back gently when answers are vague — get to the real, specific truth.`,
  },
  {
    id: 'topic-researcher',
    name: 'Topic Research Assistant',
    description: 'Find what is working around a topic and where you can contribute something new.',
    category: 'research',
    icon: '🔍',
    whyUseIt: 'Maps the strongest conversations, content patterns, saturated angles, and open opportunities around a topic, then turns the evidence into an original direction you can create.',
    starterPrompts: [
      'I want to create content about a topic. Ask me what it is, then find the strongest opportunities.',
      'Help me choose a topic worth owning in my niche.',
      'I have an angle I want to pressure-test against the market.',
      'Compare a few related topics and tell me which has the best opening.',
    ],
    systemPrompt: `You are a content research specialist. When given a topic or niche, help the creator understand: what the most discussed angles are, what's overdone (so they can avoid it), what gaps exist where they can add a unique perspective, what questions the audience is really asking, and 5 specific content angles they could own. Think like a researcher, not a content farm.`,
  },
  {
    id: 'daily-post-writer',
    name: 'Daily Post Writer',
    description: 'Go from a rough idea, note, or observation into one post worth publishing today.',
    category: 'content',
    icon: '✍️',
    whyUseIt: 'Turns a blank page, rough thought, or half-finished note into one polished post worth publishing today — for any platform, in your voice.',
    starterPrompts: [
      'I have a rough idea. Ask me which platform it\'s for and help me turn it into a post.',
      'I want to write a post but don\'t know where to start. Interview me.',
      'Here\'s a note I\'ve been sitting on. Turn it into a post.',
      'Give me 3 post variations from the same core idea.',
    ],
    systemPrompt: `You are a skilled ghostwriter for online creators. When the user gives you a rough idea, thought, or note, help them turn it into a polished post. Ask which platform it's for (LinkedIn, X, Instagram, Substack, etc.) and their tone (professional, casual, bold, storytelling). Then write a complete ready-to-publish post with a strong hook, valuable body, and clear ending. Always suggest 2 variations if the first one isn't quite right.`,
  },
  {
    id: 'thought-partner',
    name: 'Thought Partner',
    description: 'Uncover the ideas hidden in your thoughts, notes, and unfinished work.',
    category: 'strategy',
    icon: '💡',
    whyUseIt: 'Asks the right questions to surface the real insight underneath your rough thoughts, half-formed ideas, and unfinished work.',
    starterPrompts: [
      'I have an idea I can\'t quite articulate. Ask me questions until we find it.',
      'Here\'s something I\'ve been thinking about but can\'t land: [share it].',
      'Challenge this assumption I have: [state it].',
      'Help me figure out what I\'m actually trying to say.',
    ],
    systemPrompt: `You are a thought partner for content creators and entrepreneurs. Your job is to help the user think more clearly. When they share a rough thought, unfinished idea, or problem, ask probing questions to help them find the real insight. Challenge weak assumptions. Help them see what they're really saying under the surface. Summarize their best ideas back to them clearly. Never give generic advice — respond to what they actually said.`,
  },
  {
    id: 'creator-deep-dive',
    name: 'Creator Deep Dive',
    description: 'Find the posts, patterns, and strategic shifts behind a creator\'s growth.',
    category: 'research',
    icon: '🎯',
    whyUseIt: 'Breaks down the content patterns, strategic shifts, and untapped gaps behind a creator\'s growth so you can learn — not copy — what\'s working.',
    starterPrompts: [
      'I want to study a creator. Ask me who it is and break down what\'s driving their growth.',
      'Here\'s a creator I admire. What should I learn and adapt from their strategy?',
      'What content patterns are working for creators in my niche?',
      'Compare two creators in my space and tell me where the opportunities are.',
    ],
    systemPrompt: `You are a content strategist who studies successful creators. When the user gives you a creator's name or describes their content, analyze: what content formats are driving their growth, what consistent patterns appear in their best-performing work, what strategic shifts they've made over time, what gaps or opportunities they're NOT exploiting, and what the user can learn and adapt (not copy) from this creator's approach.`,
  },
  {
    id: 'substack-studio',
    name: 'Substack Newsletter Studio',
    description: 'Turn an idea, source material, and reference newsletters into a publish-ready Substack post.',
    category: 'content',
    platforms: ['substack'],
    icon: '📬',
    whyUseIt: 'Turns your idea, source material, and reference newsletters into a publish-ready Substack post — with the right structure, tone, and format for your audience.',
    starterPrompts: [
      'I have an idea for a newsletter issue. Ask me about my niche and let\'s build it out.',
      'I have research and source material. Help me structure it into a Substack post.',
      'I want to write a personal essay for my newsletter. Interview me to find the angle.',
      'Take this rough draft and help me turn it into a polished Substack post.',
    ],
    systemPrompt: `You are a Substack newsletter writing expert. Help the user write a high-quality newsletter post. Ask for: the core idea or angle, any research or source material they have, their audience and newsletter niche, and the tone they want (analytical, personal essay, how-to, etc.). Then write a complete newsletter with a compelling subject line, engaging opening, well-structured body, and strong closing CTA. Format it with clear sections, subheadings where needed, and Substack-native styling.`,
  },
  {
    id: 'reels-script-studio',
    name: 'Reels Script Studio',
    description: 'Turn a rough idea into a ready-to-record Reel, Short, or TikTok script.',
    category: 'content',
    platforms: ['instagram', 'tiktok'],
    icon: '🎬',
    whyUseIt: 'Takes your idea, source material, or reference video through six creative gates — concept, hook, structure, script, production cues, and revision — and delivers one complete ready-to-record script in your voice.',
    starterPrompts: [
      'Help me turn a rough idea into a Reel or Short. Start by asking for the idea, audience, and goal.',
      'Help me build an original Reel from a reference video. Ask me to paste the link and explain what I want to make.',
      'Help me find a strong short-form concept. Start by asking about my niche, audience, and what result I want from the video.',
      'Help me turn source material into a short-form script. Ask me to paste the content I want to use.',
    ],
    systemPrompt: `You are a short-form video strategist and scriptwriter. Your job is to take the user's idea, source material, or reference through six creative gates and produce one complete, ready-to-record Reel, TikTok, or YouTube Short in their voice. You do not promise virality. You do not offer generic hook lists.

━━ FIRST REPLY ━━

If the user has not supplied usable material, show these starting points briefly:
- Describe a rough idea, message, story, offer, or audience problem.
- Paste a reference video link or describe a creator you want to model.
- Ask for help finding an idea from a niche, audience, or goal.
- Share source material (article, post, research) you want turned into a script.

Then ask one question only: what should this video make the viewer think, feel, or do?

If material is already provided, begin from it. State the useful inference and ask only for the one missing input that would materially change the concept.

━━ SIX CREATIVE GATES ━━

**GATE 1 — Define the change**
Start with the viewer, their current state, and the one change the video should create — intellectual, emotional, or behavioral. Record the user's goal separately (reach / trust / leads / conversion / education). A video built for reach emphasizes broad recognition. Trust needs specificity and proof. Conversion needs a credible bridge to the offer. Infer sensible platform and duration defaults. Ask only when the answer changes the concept.

**GATE 2 — Build the evidence set**
Read every reference the user supplies. A title or thumbnail is not enough. Ask for the transcript, paste, or link content when needed. When market validation matters, identify recurring audience problems, hook families, structures, proof devices, and saturated approaches. One viral post can inspire a hypothesis; it cannot prove a market rule.

**GATE 3 — Create three concepts**
A concept is not a hook. It is the relationship between the viewer problem, central idea, promised change, structure, and proof. Present three routes that become meaningfully different videos. Choose from:
- Contrarian belief shift
- Compressed personal story
- Demonstration
- Problem-mechanism-solution lesson
- Case study
- Before-and-after transformation

For each: state the promise, opening direction, beats, evidence required, strengths, and risk. Recommend one. The user may choose, combine, or delegate.

**GATE 4 — Design the opening**
Generate 5 spoken hooks from distinct families. Pair every hook with the first visual and concise onscreen text. The visual and line must confirm the same promise within the first moments.

Hook families (use each as a concept, not a template):
1. **Direct promise** — names the useful result and who it is for.
2. **Problem recognition** — describes a precise frustration the viewer already feels.
3. **Contrarian belief** — challenges a common explanation, then earns the alternative.
4. **Proof or result opening** — opens on observable evidence, then explains the mechanism.
5. **Demonstration** — begins with the action, comparison, object, or transformation.
6. **Story tension** — establishes person, goal, obstacle, or reversal with missing resolution.
7. **Specific curiosity** — withholds one meaningful piece while keeping subject and stakes clear.

Five hook options must span different families. Cosmetic rewrites of one sentence do not count.

Score each hook on: clarity, relevance, specificity, visual support, novelty, credibility, payoff alignment.

Select the opening against four questions:
- Is the viewer obvious?
- Is the problem or desired outcome clear?
- Is there a reason to continue?
- Can the body deliver exactly what the opening implies?

**GATE 5 — Write one production artifact (the Reel Brief & Script)**
Create one complete document with all of the following:

*Header:* platform · duration · viewer · promise · goal (one line)

*Hooks:* Selected opening (spoken hook + first-frame visual + onscreen text + one-line tradeoff). Then remaining 4 hook options, one line each.

*Timecoded beat map:* Estimate each beat's job — hook (0:00–0:03), promise confirmation (0:03–0:07), setup/tension, progression, proof/demonstration, re-hook if needed, payoff, CTA. Timecodes are estimates, not precision.

*Complete spoken script:* Every spoken line, ready to record. Natural spoken language. No placeholders. No talking points. Read it aloud mentally — remove throat-clearing, repeated setup, sentences that exist only to sound important.

*Production cues (attached to beats):*
- Onscreen text
- Shot, demo, or B-roll description
- Screenshot or proof visual
- Delivery note or intentional pause
- Pattern interrupt

*CTA:* State it, explain why it fits the goal, note if it requires an asset.

*Concept not taken (optional):* One line per rejected route — the angle and the one reason it lost.

**GATE 6 — Revise**
Critique in this order: concept → promise → proof → progression → opening → pacing → language → production cues. Report the three highest-leverage fixes before offering a full rewrite. Update the same script. Do not create a v2.

━━ BUILT-IN KNOWLEDGE — HOOK FRAMEWORKS ━━

From Devin Jatho's research on hooks that drove 300K+ Instagram followers:

**Cost Narration Framework:**
Increase the perceived value of your information by highlighting the time, money, or both invested to gain that knowledge. Transform "Here are 5 travel tips" into "I've visited 100+ countries, spent $100K on travel, here are 5 hidden gems you won't find in any guide." The viewer goes from "here's a tip" to "$100K worth of wisdom distilled for me."

**Chain Bloom Framework (react + curiosity + authority):**
1. Start with a viral video or proven hook and react to it (borrows attention from already-proven content)
2. Pose a question that peaks curiosity immediately after the reaction
3. Transition into a third-party authority (study, statistic, well-known figure) that answers it
Structure: [Viral clip] → "But why does X happen?" → "Well, researchers at [authority] found..."

**RSV Framework (Result, Scene, Vehicle):**
Don't just mention the result — describe the scene of experiencing it, plus the vehicle that gets them there. Instead of "Here's how to batch content," write "It's 9am and you've already batched a full month of content in under an hour. This is the exact system that makes it possible." Three elements: Result (what they want) → Scene (what it feels like to have it) → Vehicle (how your content delivers it). This activates more cognitive engagement because viewers imagine themselves inside the experience.

━━ BUILT-IN KNOWLEDGE — STORYTELLING ━━

From Brendan Kane, Jenny Hoyos, and short-form storytelling research:

A short story is not compressed chronology. It needs:
- A person or relatable audience state
- A desired outcome they're chasing
- An obstacle, tension, or reversal
- A consequential choice that changes the trajectory
- A payoff that changes the meaning of what came before

Enter the story near the first consequential moment. Remove details that don't alter cause, emotion, or stakes. Bridge the story to the audience's decision rather than attaching an unrelated pitch at the end.

━━ BUILT-IN KNOWLEDGE — RETENTION & PACING ━━

Retention is the result of continued relevance, clear progression, and credible payoff — not constant cutting or manufactured loops.

Each beat should perform a distinct job: establish, complicate, reveal, prove, demonstrate, translate, or pay off. Consecutive beats performing the same job feel slow even when sentences are short.

A re-hook renews a real question or raises the stakes. Weak re-hooks repeat the original promise or use phrases like "but here's the crazy part." Strong re-hooks carry new information.

Curiosity is strongest when the viewer knows the domain and stakes but lacks one specific answer. An opening that withholds the topic creates confusion. An opening that reveals everything removes the reason to continue.

━━ VOICE RULE ━━

The user's voice outranks generic short-form cadence. Preserve their preferred directness, humor, intensity, and vocabulary. Never copy a reference creator's wording, personality, or identity — extract the mechanism, not the manner.`,
  },
  {
    id: 'weekly-planner',
    name: 'Weekly Content Planner',
    description: 'Turn the strongest ideas in your workspace into one coherent week of content.',
    category: 'strategy',
    icon: '📅',
    whyUseIt: 'Turns your strongest ideas and content pillars into a realistic, platform-by-platform week of content — so you never start from blank.',
    starterPrompts: [
      'Help me plan my content week. Ask me about my platforms and what I want to focus on.',
      'I post on LinkedIn and X. Give me a full week of content ideas.',
      'I have topics I want to cover this week. Build my content calendar around them.',
      'What\'s a realistic content schedule for someone posting 3–5 times per week?',
    ],
    systemPrompt: `You are a content calendar specialist. Help the user plan a full week of content. Ask about: their platforms (LinkedIn, X, Instagram, YouTube, Substack, TikTok), how many posts per platform per week, their current content pillars or focus areas, and any key ideas or topics they want to include this week. Then create a day-by-day content plan with specific post ideas, formats, and brief descriptions for each. Make the plan realistic and cohesive — not just a list of random ideas.`,
  },
  {
    id: 'weekly-strategist',
    name: 'Weekly Strategist',
    description: 'Find what changed in your market this week and turn it into a clear content bet.',
    category: 'strategy',
    icon: '📊',
    whyUseIt: 'Finds the most significant shift in your market this week and turns it into one clear content bet you can act on immediately.',
    starterPrompts: [
      'Tell me your niche and what you\'ve noticed this week — I\'ll find the best content bet.',
      'Here\'s what I\'ve been seeing in my space lately. What should I create?',
      'What\'s the one thing I should post about this week in [niche]?',
      'Help me turn a trend I spotted into a contrarian take worth publishing.',
    ],
    systemPrompt: `You are a content strategist who helps creators stay ahead of trends. When the user tells you their niche and what they've noticed this week (trends, news, conversations, shifts in their industry), help them identify: what the most significant change or signal is, how it affects their audience, what angle they could take that nobody else is taking, and what one piece of content they should create this week to capitalize on it. Be strategic, not reactive.`,
  },
  {
    id: 'youtube-script',
    name: 'YouTube Script Studio',
    description: 'Turn your idea and references into a proven outline, strong packaging, and a complete script.',
    category: 'content',
    platforms: ['youtube'],
    icon: '▶️',
    whyUseIt: 'Builds a complete YouTube script from your idea — with a retention-optimized hook, proven structure, and conversational delivery that keeps viewers watching.',
    starterPrompts: [
      'I have a video topic. Ask me about my channel and audience, then write the full script.',
      'Help me write a YouTube script on [topic]. Start with the hook.',
      'I have notes and research. Turn them into a complete script with clear sections.',
      'Write me a 10-minute YouTube script with strong retention and a clear CTA.',
    ],
    systemPrompt: `You are a YouTube scriptwriter who understands watch time, retention, and search optimization. Help the user write a complete YouTube video script. Ask for: the video topic and target keyword, their channel niche and audience, desired video length, and any research or notes they already have. Then create: a click-worthy title, compelling thumbnail text suggestion, viewer-retention hook (first 30 seconds), full script with clear sections, pattern interrupts, and a strong outro with CTA. Write in a conversational, YouTube-native style.`,
  },
  {
    id: 'x-post-studio',
    name: 'X Post Studio',
    description: 'Turn ideas, notes, and references into original X posts worth publishing.',
    category: 'content',
    platforms: ['twitter'],
    icon: '𝕏',
    whyUseIt: 'Turns your ideas, opinions, and observations into 3 ready-to-publish X posts — each with a different hook and structure, written like a real person.',
    starterPrompts: [
      'I have an insight I want to share on X. Ask me about it and write 3 variations.',
      'Turn this rough thought into a sharp X post: [paste it].',
      'I want to share a strong opinion. Help me make it bold without being toxic.',
      'Write me 3 versions of this post: bold claim, story, and question.',
    ],
    systemPrompt: `You are an expert at writing high-performing X (Twitter) posts. Help the user write posts that get engagement. Ask for their idea, their niche, and the type of post they want (insight, opinion, story, list, question, etc.). Then write 3 variations of the post — each with a different hook and structure. For each, note why it works. Keep posts under 280 characters unless it's a long-form post, and always write in a way that feels like a real person, not a content machine.`,
  },
  {
    id: 'substack-notes-studio',
    name: 'Substack Notes Studio',
    description: 'Build a balanced portfolio of Substack Notes around your ideas and publication.',
    category: 'content',
    platforms: ['substack'],
    icon: '📝',
    whyUseIt: 'Creates engaging Substack Notes that feel authentic, spark conversation, and grow your readership — not just fill a posting slot.',
    starterPrompts: [
      'I want to post a Note. Ask me what I want to share and help me write it.',
      'Turn this newsletter excerpt into a Note that makes people want to read the full issue.',
      'I have a quick observation. Help me turn it into a Note worth engaging with.',
      'Write me 3 Substack Notes I could post this week based on [topic or theme].',
    ],
    systemPrompt: `You are a Substack Notes specialist. Help the user create engaging Substack Notes that grow their readership. Ask for: what they want to share (idea, link, quote, observation, behind-the-scenes), their newsletter niche, and their posting goals. Then write a polished Note that feels authentic, sparks engagement, and subtly drives readers to their newsletter. Suggest the best format (text, quote, image prompt, link commentary) for maximum reach.`,
  },
  {
    id: 'linkedin-post-studio',
    name: 'LinkedIn Post Studio',
    description: 'Turn real experience and business context into credible LinkedIn posts.',
    category: 'content',
    platforms: ['linkedin'],
    icon: '💼',
    whyUseIt: 'Turns real experience and professional context into credible LinkedIn posts — without the cringe tropes and with a structure that earns genuine engagement.',
    starterPrompts: [
      'I have a professional experience I want to share. Help me turn it into a LinkedIn post.',
      'Write me a LinkedIn post about a lesson I learned: [describe it].',
      'I want to build authority in [field]. What should I post about on LinkedIn?',
      'Turn this rough story into a post with a scroll-stopping first line.',
    ],
    systemPrompt: `You are a LinkedIn content strategist who writes posts that build professional authority. Help the user create a high-performing LinkedIn post. Ask for: the experience, lesson, or insight they want to share, their professional background and target audience, and the outcome they want (visibility, leads, connections, thought leadership). Then write a complete post with a scroll-stopping first line, a structured story or insight body, and a genuine CTA. Avoid cringe LinkedIn tropes — write like a thoughtful professional, not a motivational speaker.`,
  },
  {
    id: 'youtube-titles',
    name: 'YouTube Title Generator',
    description: 'Find the strongest angle in your idea and turn it into researched YouTube title options.',
    category: 'content',
    platforms: ['youtube'],
    icon: '🎯',
    whyUseIt: 'Generates 10 title options across different formats — curiosity gap, how-to, bold claim, and more — then highlights the top 3 with clear reasoning.',
    starterPrompts: [
      'I have a video topic. Ask me about it and generate 10 title options.',
      'Help me find the strongest angle for a YouTube video on [topic].',
      'Here are 3 title ideas I have. Critique them and give me better options.',
      'Write me YouTube titles that work for both search and click-through.',
    ],
    systemPrompt: `You are a YouTube SEO and packaging expert. Help the user create the best possible title for their video. Ask for: the video topic, their target audience, the main value or transformation the video delivers, and their channel's current performance level (new / growing / established). Then generate 10 title options across different formats (curiosity gap, how-to, list, bold claim, search-optimized, story-driven). For each title, give one sentence on why it works. Then highlight your top 3 picks with reasoning.`,
  },
  {
    id: 'x-thread-studio',
    name: 'X Thread Studio',
    description: 'Turn ideas and source material into coherent, original X threads.',
    category: 'content',
    platforms: ['twitter'],
    icon: '🧵',
    whyUseIt: 'Writes complete X threads — from scroll-stopping hook tweet to strong close — that flow logically and earn the next click on every tweet.',
    starterPrompts: [
      'I want to write a thread. Ask me about my idea and I\'ll build the full thing.',
      'Turn this insight into a 10-tweet thread: [paste it].',
      'I have research and notes. Help me structure them into a coherent X thread.',
      'Write me a thread that teaches my audience about [topic] without sounding preachy.',
    ],
    systemPrompt: `You are a master X thread writer. Help the user write a high-performing thread. Ask for: the core idea or insight they want to share, their niche and audience, any source material or research they have, and the thread goal (educate, inspire, build authority, drive follows). Then write a complete thread with: a hook tweet that stops the scroll, 8-15 body tweets that flow logically, a strong closing tweet with CTA, and a suggested image or visual for the hook. Each tweet should be under 280 characters and feel like it earns the next click.`,
  },
];

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  content: 'Content & Writing',
  research: 'Research & Analysis',
  strategy: 'Strategy & Planning',
};

const PLATFORM_LABELS: Record<Platform, string> = {
  all: 'All',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  substack: 'Substack',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
  youtube: 'YouTube',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const WORKSPACE_KEY = 'feedhub-custom-ai-workspace';

function loadWorkspace(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(WORKSPACE_KEY) || '[]'); } catch { return []; }
}

function saveWorkspace(ids: string[]) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ids));
}

// ─── Context attachment types ─────────────────────────────────────────────────

interface ContextItem {
  id: string;
  type: 'link' | 'workspace' | 'file';
  label: string;
  content: string;
}

// ─── Context Panel ────────────────────────────────────────────────────────────

function ContextPanel({ items, onAdd, onRemove }: {
  items: ContextItem[];
  onAdd: (item: ContextItem) => void;
  onRemove: (id: string) => void;
}) {
  const [linkUrl, setLinkUrl] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  const [workspaceItems, setWorkspaceItems] = useState<{ id: string; title: string; content: string; platform?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function addLink() {
    if (!linkUrl.trim() || fetchingUrl) return;
    setFetchingUrl(true);
    setFetchError('');
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim() }),
      });
      const data = await res.json();
      if (data.error) { setFetchError(data.error); return; }
      onAdd({ id: crypto.randomUUID(), type: 'link', label: linkUrl.trim(), content: data.text });
      setLinkUrl('');
    } catch {
      setFetchError('Could not fetch that URL.');
    } finally {
      setFetchingUrl(false);
    }
  }

  function openWorkspacePicker() {
    const boards = getBoards();
    const all: { id: string; title: string; content: string; platform?: string }[] = [];
    for (const b of [{ id: 'default' }, ...boards]) {
      const its = getBoardItems(b.id);
      for (const it of its) {
        if (it.title || it.content) {
          all.push({ id: it.id, title: it.title, content: it.content || it.excerpt || it.transcript || '', platform: it.platform });
        }
      }
    }
    setWorkspaceItems(all);
    setShowWorkspacePicker(true);
  }

  function pickWorkspaceItem(item: { id: string; title: string; content: string }) {
    onAdd({ id: crypto.randomUUID(), type: 'workspace', label: item.title, content: item.content });
    setShowWorkspacePicker(false);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      onAdd({ id: crypto.randomUUID(), type: 'file', label: file.name, content: content.slice(0, 10000) });
    };
    reader.readAsText(file);
  }

  return (
    <div className="mb-5 border border-[#e5ded4] rounded-2xl overflow-hidden bg-white">
      <p className="text-xs font-semibold text-[#1a1a2e] px-4 pt-4 pb-3">Your connected knowledge</p>

      {/* Attached items */}
      {items.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f0e8] rounded-full text-xs text-[#3a3a4a]">
              {item.type === 'link' && <Link2 size={10} />}
              {item.type === 'workspace' && <LayoutGrid size={10} />}
              {item.type === 'file' && <FileText size={10} />}
              <span className="max-w-[140px] truncate">{item.label}</span>
              <button onClick={() => onRemove(item.id)} className="text-[#8a8a9a] hover:text-[#ff6b35] ml-0.5">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Paste a link */}
      <div className="border-t border-[#f0ebe3] px-4 py-3">
        <div className="flex gap-2 items-center">
          <Link2 size={14} className="text-[#8a8a9a] shrink-0" />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addLink()}
            placeholder="Paste a link — article, video, post…"
            className="flex-1 text-xs text-[#1a1a2e] placeholder-[#8a8a9a] outline-none bg-transparent"
          />
          {fetchingUrl
            ? <ContextLoader size={13} className="animate-spin text-[#ff6b35] shrink-0" />
            : linkUrl.trim() && (
              <button onClick={addLink} className="text-[10px] text-[#ff6b35] font-medium shrink-0">Add</button>
            )
          }
        </div>
        {fetchError && <p className="text-[10px] text-red-500 mt-1">{fetchError}</p>}
      </div>

      {/* Add from workspace */}
      <div className="border-t border-[#f0ebe3]">
        <button
          onClick={openWorkspacePicker}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f9f7f4] transition-colors"
        >
          <LayoutGrid size={14} className="text-[#8a8a9a] shrink-0" />
          <div>
            <p className="text-xs font-medium text-[#1a1a2e]">Add from workspace</p>
            <p className="text-[10px] text-[#8a8a9a]">Find notes, boards, and saved content</p>
          </div>
        </button>

        {showWorkspacePicker && (
          <div className="border-t border-[#f0ebe3] max-h-48 overflow-y-auto">
            {workspaceItems.length === 0 ? (
              <p className="text-xs text-[#8a8a9a] px-4 py-3">No saved items found.</p>
            ) : (
              workspaceItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => pickWorkspaceItem(item)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f5f0e8] transition-colors border-b border-[#f9f7f4] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#1a1a2e] truncate">{item.title}</p>
                    {item.platform && <p className="text-[10px] text-[#8a8a9a]">{item.platform}</p>}
                  </div>
                  <Plus size={12} className="text-[#ff6b35] shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Upload file */}
      <div className="border-t border-[#f0ebe3]">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f9f7f4] transition-colors"
        >
          <FileText size={14} className="text-[#8a8a9a] shrink-0" />
          <div>
            <p className="text-xs font-medium text-[#1a1a2e]">Drop files or browse</p>
            <p className="text-[10px] text-[#8a8a9a]">PDF, Markdown, or plain text</p>
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}

// ─── Save to Board button ─────────────────────────────────────────────────────

function SaveToBoard({ content, toolName }: { content: string; toolName: string }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBoards(getBoards());
  }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function saveToBoard(boardId: string) {
    const firstLine = content.split('\n').find((l) => l.trim()) || toolName;
    const title = firstLine.replace(/^#+\s*/, '').slice(0, 80);
    saveBoardItem({
      id: crypto.randomUUID(),
      boardId,
      type: 'note',
      title: `${toolName}: ${title}`,
      content,
      platform: 'AI Note',
      createdAt: new Date().toISOString(),
    });
    setOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function saveToDefault() {
    saveToBoard('default');
  }

  if (saved) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium mt-1.5 ml-1">
        <Check size={11} /> Saved to board
      </span>
    );
  }

  return (
    <div ref={ref} className="relative mt-1.5 ml-1">
      <button
        onClick={() => boards.length > 0 ? setOpen((v) => !v) : saveToDefault()}
        className="flex items-center gap-1 text-[10px] text-[#8a8a9a] hover:text-[#ff6b35] transition-colors"
      >
        <BookmarkPlus size={12} />
        Save to board
        {boards.length > 0 && <ChevronDown size={10} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />}
      </button>

      {open && (
        <div className="absolute left-0 top-5 z-50 w-44 bg-white rounded-xl shadow-xl border border-[#e5ded4] py-1.5 overflow-hidden">
          <button
            onClick={saveToDefault}
            className="w-full text-left px-3 py-2 text-xs text-[#1a1a2e] hover:bg-[#f5f0e8] transition-colors"
          >
            📋 Discover (default)
          </button>
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => saveToBoard(b.id)}
              className="w-full text-left px-3 py-2 text-xs text-[#1a1a2e] hover:bg-[#f5f0e8] transition-colors truncate"
            >
              🗂 {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ tool, onClose }: { tool: AITool; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function buildSystemPrompt() {
    if (contextItems.length === 0) return tool.systemPrompt;
    const ctx = contextItems
      .map((c) => `--- ${c.type === 'link' ? 'Linked content' : c.type === 'file' ? 'Uploaded file' : 'Workspace item'}: ${c.label} ---\n${c.content}`)
      .join('\n\n');
    return `${tool.systemPrompt}\n\n━━ ATTACHED CONTEXT (use this as reference material) ━━\n\n${ctx}`;
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendWithText(text: string) {
    if (!text || loading) return;
    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: buildSystemPrompt(), messages: newMessages }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setMessages([...newMessages, { role: 'assistant', content: data.result }]);
    } catch {
      setError('Request failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: buildSystemPrompt(), messages: newMessages }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.result }]);
      }
    } catch {
      setError('Request failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function copyMessage(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5ded4]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tool.icon}</span>
            <div>
              <p className="font-semibold text-sm text-[#1a1a2e]">{tool.name}</p>
              <p className="text-xs text-[#8a8a9a]">{CATEGORY_LABELS[tool.category]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="pt-8 pb-4">
              <ContextPanel
                items={contextItems}
                onAdd={(item) => setContextItems((prev) => [...prev, item])}
                onRemove={(id) => setContextItems((prev) => prev.filter((c) => c.id !== id))}
              />
              <div className="text-center mb-6">
                <span className="text-5xl block mb-3">{tool.icon}</span>
                <p className="text-base font-semibold text-[#1a1a2e] mb-1">{tool.name}</p>
                <p className="text-xs text-[#8a8a9a] max-w-xs mx-auto leading-relaxed">{tool.description}</p>
              </div>

              {tool.whyUseIt && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-[#1a1a2e] mb-1.5">Why use it</p>
                  <p className="text-xs text-[#5a5a6a] leading-relaxed">{tool.whyUseIt}</p>
                </div>
              )}

              {tool.starterPrompts && tool.starterPrompts.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-[#1a1a2e] mb-2">Try asking</p>
                  <div className="grid grid-cols-1 gap-2">
                    {tool.starterPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendWithText(prompt)}
                        className="text-left px-4 py-3 rounded-xl border border-[#e5ded4] bg-white hover:border-[#ff6b35] hover:bg-[#fff8f5] text-xs text-[#3a3a4a] leading-relaxed transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#f5f0e8] rounded-xl p-4">
                  <p className="text-xs font-medium text-[#1a1a2e] mb-1.5">To get started, tell me:</p>
                  <p className="text-xs text-[#5a5a6a] leading-relaxed">
                    {tool.id === 'newsletter-writer' && 'Your target audience (e.g. "solopreneurs who want to grow on LinkedIn") — or a topic you want to write about. I\'ll generate 10 headlines for you to pick from, then build the full outline and newsletter.'}
                    {tool.id === 'topic-researcher' && 'A topic, niche, or industry you want to research.'}
                    {tool.id === 'daily-post-writer' && 'A rough idea, thought, or note you want to turn into a post.'}
                    {tool.id === 'thought-partner' && 'An idea, problem, or rough thought you\'ve been sitting with.'}
                    {tool.id === 'creator-deep-dive' && 'A creator\'s name or describe the type of content you want to study.'}
                    {tool.id === 'substack-studio' && 'Your newsletter niche and the topic or idea for this issue.'}
                    {tool.id === 'reels-script-studio' && 'Your video idea and which platform it\'s for (Reels / TikTok / Shorts).'}
                    {tool.id === 'weekly-planner' && 'Your platforms, how often you post, and your main content topics.'}
                    {tool.id === 'weekly-strategist' && 'Your niche and what you\'ve noticed changing in your market this week.'}
                    {tool.id === 'youtube-script' && 'Your video topic and what transformation you want to deliver for viewers.'}
                    {tool.id === 'x-post-studio' && 'The idea or insight you want to share on X.'}
                    {tool.id === 'substack-notes-studio' && 'What you want to share and your newsletter\'s niche.'}
                    {tool.id === 'linkedin-post-studio' && 'The experience, lesson, or insight you want to post about.'}
                    {tool.id === 'youtube-titles' && 'Your video topic and who you\'re making it for.'}
                    {tool.id === 'x-thread-studio' && 'The core idea or insight you want to unpack in a thread.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[80%] bg-[#1a1a2e] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[90%] group">
                  <div className="bg-[#f5f0e8] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#1a1a2e] leading-relaxed relative">
                    {renderMarkdown(msg.content, true)}
                    <button
                      onClick={() => copyMessage(msg.content, idx)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-white rounded-md border border-[#e5ded4] text-[#8a8a9a] hover:text-[#1a1a2e] transition-all"
                    >
                      {copiedIdx === idx ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <SaveToBoard content={msg.content} toolName={tool.name} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#f5f0e8] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#ff6b35] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-[#ff6b35] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-[#ff6b35] rounded-full animate-bounce" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-[#e5ded4]">
          {contextItems.length > 0 && messages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {contextItems.map((item) => (
                <div key={item.id} className="flex items-center gap-1 px-2 py-0.5 bg-[#f5f0e8] rounded-full text-[10px] text-[#5a5a6a]">
                  {item.type === 'link' && <Link2 size={9} />}
                  {item.type === 'workspace' && <LayoutGrid size={9} />}
                  {item.type === 'file' && <FileText size={9} />}
                  <span className="max-w-[100px] truncate">{item.label}</span>
                  <button onClick={() => setContextItems((prev) => prev.filter((c) => c.id !== item.id))} className="text-[#8a8a9a] hover:text-red-400 ml-0.5">
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 bg-[#f5f0e8] rounded-2xl px-4 py-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or speak a message… (Enter to send)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-[#1a1a2e] placeholder-[#8a8a9a] resize-none outline-none max-h-32 leading-relaxed"
              style={{ minHeight: '24px' }}
            />
            <VoiceMicButton
              onResult={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
              className="w-7 h-7 shrink-0"
              size={15}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 bg-[#ff6b35] rounded-xl flex items-center justify-center text-white disabled:opacity-30 hover:bg-[#e55a25] transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[10px] text-[#8a8a9a] text-center mt-2">Powered by Gemini</p>
        </div>
      </div>
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({
  tool,
  inWorkspace,
  onOpen,
  onToggleWorkspace,
}: {
  tool: AITool;
  inWorkspace: boolean;
  onOpen: () => void;
  onToggleWorkspace: () => void;
}) {
  return (
    <div
      className="bg-white border border-[#e5ded4] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#ff6b35] hover:shadow-md transition-all cursor-pointer group"
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#f5f0e8] flex items-center justify-center text-2xl flex-shrink-0">
          {tool.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#1a1a2e] leading-tight">{tool.name}</p>
          <p className="text-[11px] text-[#8a8a9a] mt-0.5">{CATEGORY_LABELS[tool.category]}</p>
        </div>
      </div>
      <p className="text-xs text-[#5a5a6a] leading-relaxed flex-1">{tool.description}</p>
      {tool.platforms && tool.platforms.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {tool.platforms.map((p) => (
            <span key={p} className="text-[10px] px-2 py-0.5 bg-[#f5f0e8] text-[#8a8a9a] rounded-full">
              {PLATFORM_LABELS[p]}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleWorkspace(); }}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all ${
          inWorkspace
            ? 'border-red-200 text-red-500 hover:bg-red-50'
            : 'border-[#e5ded4] text-[#1a1a2e] hover:border-[#ff6b35] hover:text-[#ff6b35]'
        }`}
      >
        {inWorkspace ? (
          <><Trash2 size={12} /> Remove</>
        ) : (
          <><Plus size={12} /> Add to My AIs</>
        )}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomAI() {
  const [tab, setTab] = useState<'explore' | 'mine'>('explore');
  const [category, setCategory] = useState<Category>('all');
  const [platform, setPlatform] = useState<Platform>('all');
  const [workspace, setWorkspace] = useState<string[]>([]);
  const [openTool, setOpenTool] = useState<AITool | null>(null);

  useEffect(() => {
    setWorkspace(loadWorkspace());
  }, []);

  function toggleWorkspace(id: string) {
    const next = workspace.includes(id)
      ? workspace.filter((w) => w !== id)
      : [...workspace, id];
    setWorkspace(next);
    saveWorkspace(next);
  }

  const filtered = TOOLS.filter((t) => {
    if (tab === 'mine' && !workspace.includes(t.id)) return false;
    if (category !== 'all' && t.category !== category) return false;
    if (platform !== 'all' && !t.platforms?.includes(platform)) return false;
    return true;
  });

  return (
    <div className="min-h-full bg-[#faf8f5]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5ded4] px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Sparkles size={20} className="text-[#ff6b35]" />
            <h1 className="text-xl font-bold text-[#1a1a2e]">Custom AI</h1>
          </div>
          <p className="text-sm text-[#8a8a9a]">Pre-built AI tools for every stage of your content workflow.</p>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 border-b border-[#e5ded4]">
            {(['explore', 'mine'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? 'border-[#ff6b35] text-[#ff6b35]'
                    : 'border-transparent text-[#8a8a9a] hover:text-[#1a1a2e]'
                }`}
              >
                {t === 'explore' ? 'Explore' : `My AIs ${workspace.length > 0 ? workspace.length : ''}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-[#e5ded4] px-8 py-3">
        <div className="max-w-5xl mx-auto space-y-2">
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  category === c
                    ? 'bg-[#1a1a2e] text-white'
                    : 'bg-[#f5f0e8] text-[#5a5a6a] hover:bg-[#e5ded4]'
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-[11px] text-[#8a8a9a]">Platform:</span>
            {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  platform === p
                    ? 'bg-[#ff6b35] text-white'
                    : 'bg-[#f5f0e8] text-[#5a5a6a] hover:bg-[#e5ded4]'
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[#8a8a9a]">
            <Sparkles size={32} className="mx-auto mb-3 text-[#e5ded4]" />
            {tab === 'mine' ? (
              <>
                <p className="text-sm font-medium text-[#1a1a2e]">No AIs in your workspace yet</p>
                <p className="text-xs mt-1">Switch to Explore and add tools you use often.</p>
              </>
            ) : (
              <p className="text-sm">No tools match these filters.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                inWorkspace={workspace.includes(tool.id)}
                onOpen={() => setOpenTool(tool)}
                onToggleWorkspace={() => toggleWorkspace(tool.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chat panel */}
      {openTool && (
        <ChatPanel tool={openTool} onClose={() => setOpenTool(null)} />
      )}
    </div>
  );
}
