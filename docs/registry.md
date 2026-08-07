# Capability registry — external skills & libraries

**How to use this file:** it is a *router*, not reading material. Nothing here is
loaded by default. Find the row whose trigger matches the task in front of you,
open **that one resource**, and ignore the rest. If no row matches, don't reach for
anything — build it directly.

All 35 candidate repositories were reviewed. They are sorted below by whether they
serve *this* project. Being excluded is a judgement about fit, not quality.

---

## Tier A — install once, use continuously

These earn their context cost on this build. Install them into Claude Code.

| Resource | What it gives us | Install |
|---|---|---|
| [obra/superpowers](https://github.com/obra/superpowers) | TDD, systematic debugging, planning and code-review methodology as composable skills. The backbone for disciplined delivery — directly supports the proposal's QA claims. | `/plugin install superpowers@claude-plugins-official` |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | The YAGNI → reuse → stdlib → native → dependency decision ladder. This *is* our prime directive; installing it enforces it automatically. | `/plugin marketplace add DietrichGebert/ponytail` then (separate message) `/plugin install ponytail@ponytail` |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 23 commands + 59 detector rules that catch AI-generated design tells (default fonts, weak contrast, dated effects). Contrast and hierarchy failures cost us SUS points directly. | `npx impeccable install` — or `/plugin marketplace add pbakaus/impeccable` |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Design-taste rulesets. Use the `minimalist-skill` and `design-taste-frontend` skills only — they match our lean brief. Ignore `brutalist-skill`. | `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"` |
| [anthropics/claude-code-security-review](https://github.com/anthropics/claude-code-security-review) | Automated security review. Serves the proposal's security objective (input validation, access control) with real evidence for the report. | Add as a GitHub Action, or run the local `/security-review` skill |

## Tier B — on demand only

Do not install these up front. Open or install one **only** when its trigger fires.

| Trigger — "when I am…" | Resource | Note |
|---|---|---|
| …stuck on a UI pattern (empty state, filter bar, table, form layout) | [monet-design/monet-registry](https://github.com/monet-design/monet-registry) | 600+ React patterns. Reference for *structure*; it's Next.js-flavoured, so port the idea, not the file. |
| …building a clickable/high-fidelity prototype or slide deck for the demo | [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) | HTML-native design skill. Docs are largely Chinese. |
| …writing or compressing prompts and context for this repo | [muratcankoylan/Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering) | Use `context-compression` + `context-optimization`. Skip the multi-agent skills. |
| …specifying a whole new feature slice from scratch | [coleam00/context-engineering-intro](https://github.com/coleam00/context-engineering-intro) | The PRP method (INITIAL.md → generate → execute). Adopt the *method*; `prompts/` already follows it. |
| …drafting the research report and it reads like AI wrote it | [blader/humanizer](https://github.com/blader/humanizer) | 33 AI-prose tells. For the write-up, never for code. |
| …handling PR review comments across the group | [pbakaus/agent-reviews](https://github.com/pbakaus/agent-reviews) | Useful once the team is running real PRs. |
| …needing a formal security/pentest pass before submission | [usestrix/strix](https://github.com/usestrix/strix) | Autonomous security agents. Only against our own deployed prototype, with supervisor sign-off. |
| …losing context repeatedly across long sessions | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Claims ~10x savings via index-before-fetch. Worth trying *after* the codebase is real; adds a dependency. |
| …reviewing a codebase too big to read (not yet true here) | [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) · [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) · [getzep/graphiti](https://github.com/getzep/graphiti) | Graph indexes for large repos. Near-zero payoff at our size — revisit past ~100 files. |
| …wanting a full simulated engineering team (architecture, QA, release) | [garrytan/gstack](https://github.com/garrytan/gstack) | 23 agents. Powerful but heavy; contradicts the lean brief unless a phase truly needs it. |
| …setting up autonomous verify-and-log loops | [cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering) | For long unattended runs. |
| …learning to write better prompts / shipping an agent | [anthropics/prompt-eng-interactive-tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial) · [anthropics/launch-your-agent](https://github.com/anthropics/launch-your-agent) | Reference material for the team, not the build. |
| …looking for a general skill we haven't thought of | [AI-Builder-Club/skills](https://github.com/AI-Builder-Club/skills) | Grab-bag; search before adopting. |
| …producing marketing/comms for the DSR "communication" phase | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | 60+ marketing skills. Only if the module asks for a launch artefact. |
| …producing a recorded demo video for the submission | [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | React video framework. Screen-recording is cheaper — use this only if a polished video is graded. |

## Tier C — excluded, with reasons

Deliberately not wired in. Each would cost context and return nothing here.

| Resource | Why it's out |
|---|---|
| [enaqx/awesome-pentest](https://github.com/enaqx/awesome-pentest) · [Z4nzu/hackingtool](https://github.com/Z4nzu/hackingtool) | Offensive tooling aimed at systems you don't own. Our security objective is defensive — `claude-code-security-review` covers it, and running these against campus infrastructure would be an ethics-approval problem, not a technical one. |
| [every-app/open-seo](https://github.com/every-app/open-seo) · [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | SupportHub sits behind authentication. It has no search-engine surface to optimise. |
| [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) | LLM gateway for routing API calls across providers. We aren't building an LLM app, and it doesn't affect Claude Code session cost. |
| [1jehuang/jcode](https://github.com/1jehuang/jcode) · [earendil-works/pi](https://github.com/earendil-works/pi) | Alternative agent harnesses/frameworks — they *replace* Claude Code rather than extend it. |
| [nexu-io/open-design](https://github.com/nexu-io/open-design) | A separate local desktop app plus MCP server. Real capability, disproportionate setup for a four-person student project. |
| [juliangarnier/anime](https://github.com/juliangarnier/anime) | Animation library. CSS transitions cover every motion this app needs; adding it violates step 3 of the ladder. |

**If you disagree with an exclusion, move the row to Tier B with a one-line trigger.
Don't install it silently.**
