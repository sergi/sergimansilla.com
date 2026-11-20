---
title: Cheap code, expensive trust
tags:
  - engineering leadership
  - ai
  - code review
  - software engineering
description: >-
  AI broke two things teams relied on without noticing: how unwritten rules
  spread, and how reviewers decide what to trust.
date: 2026-11-19 22:54:58
---


A pull request goes through review and ships. It’s a clean diff, written by a senior engineer who happens to be new to this service. Instead of the usual first move in unfamiliar code, opening a neighboring endpoint and copying its shape, they asked an agent to scaffold it from scratch. The new endpoint does what the ticket asked, the auth middleware is attached, and the tests are green.

Two days later, someone notices the endpoint leaks records across customer accounts.

Nothing inside the diff was obviously wrong. The agent used the standard ORM query, and the reviewer saw an auth check at the top of the handler. What both missed was an unwritten rule: every query in this service is supposed to go through a custom `forTenant()` wrapper that injects the organization filter.

How does a senior engineer write that bug, and another senior engineer approve it?

Agents quietly broke two things teams relied on without noticing: how unwritten rules spread, and how reviewers decide what to trust.

<!-- more -->

## Friction was how the rules spread

When you write a sensitive endpoint by hand, the typing itself forces you to look around. How do neighboring services handle this? You open an existing endpoint or ping a teammate: "hey, why does this one check for X?" Those five-minute Slack conversations are part of the actual work, not interruptions to it.

Every codebase runs on rules nobody wrote down. Peter Naur called this the program's *theory*: the understanding that lives in the heads of the people who maintain it, which the code only partly captures. For most of our history, friction was how that theory moved from one head to another.

But an agent only knows what's written. It can read every neighboring endpoint and still not know which of their habits are rules. When an agent hands you a plausible implementation in ten seconds, the friction is gone, and so is the conversation that would have carried the rule.

Today the path of least resistance in unfamiliar code is to prompt an agent to route around the confusion, alone. I've started calling the result atomization:

- **Solo pilots.** Engineers disappear with their agent and reappear days later with a 1,500-line pull request over the wall.  
- **Late debates.** Design debates shrink up front, then explode in the review queue. There, some senior engineer reverse-engineers an agent's output with zero context on how it was built.  
- **Unargued documents.** The same happens to RFCs and design documents. They arrive polished and complete, and nobody who has to live with them ever argues over them.

## Polish used to mean something

Nobody reviews everything with the same depth. Reviewers triage, and they triage on signals: who wrote it, how careful it looks, whether the naming is consistent, whether the tests cover the edges. Sloppy code invited scrutiny. Careful code earned trust. The signals were imperfect, but they tracked how much thought the author had put in.

AI makes every pull request look careful. Polish is now free, so it carries no information. Our reviewer saw tidy code from a trusted colleague, green tests, and did what reviewers have always done. We reviewed the syntax. Nobody checked for the missing tenant isolation filter.

The reviewer wasn't lazy. They were reading a signal that had stopped meaning anything. And when the cheap signals go, the only way left to trust code is to understand it, which costs exactly what it always did. Code got cheap. Trust got more expensive.

## Everyone is a junior somewhere

The usual worry is about juniors. On codebases big enough the problem is wider: an experienced engineer stepping into an unfamiliar part of the system is, for that change, a newcomer.

How did anyone become the expert in an area of the codebase? Not by reading clean, finished pull requests. They fought through broken abstractions, debugged line by line, and had the person who owned that code explain why their "simple" change broke something deeper.

With an agent, you can ship there for months without building that understanding. Beautiful velocity chart. But expertise never forms, and the people who already had it eventually move on. Naur had a blunt word for a program whose theory is gone: dead. It keeps running. Nobody can change it intelligently.

## What I'm doing about it

Engineering teams now use agents every day, and I have zero interest in going back. Whatever you make of the productivity claims, writing code was never the hard part of serious software development. I realize that you've probably read [some version of that sentence](https://ordep.dev/posts/writing-code-was-never-the-bottleneck) this year.

The fix is accepting that when generation is free, alignment and verification are the constraints. Three rules I'd like teams to follow:

1. **Design before generation.** If a change touches core architecture, security boundaries, or data contracts, explicitly write down the unwritten rules in our heads before anyone prompts an agent. A rule that lives only in people's heads is invisible to the agent and easy for a reviewer to forget. Had that authorization boundary been written down, the agent and the reviewer would each have something to check against.  
     
2. **Budget for review, not generation.** Stop measuring how fast features enter the review queue. Measure how safely they leave it. When generation costs nothing, senior review bandwidth is the scarcest resource in the org. Keep pull requests small. Let reviewers reject uncontextualized dumps on sight.  
     
3. **Nobody works alone with an agent in unfamiliar code.** If a change lands in an area you don't know, pair with someone who does. If your name is on the pull request, you can explain every line and every failure mode without the prompt history.

None of this is free, and budgeting for review creates the most friction. To product and sales, a feature that works looks finished, and every day it waits in review looks like engineering sitting on done work. Estimates that include review time help. But once people have seen the demo, it feels done. Part of the job now is explaining that 'it works' and 'it's safe to ship' are different claims.

Budgeting for review also forces a question many teams leave fuzzy: who owns which code, and who is qualified to review it. Review capacity is uneven across the codebase, and on a small team the gaps hurt. Frontend code is lower risk, and more engineers can review it. Infrastructure code is higher risk: only the infrastructure team can. An agent produces infrastructure changes as fast as frontend changes, so the review bottleneck lands exactly where the code is most critical and the reviewers are fewest. Ownership boundaries used to be an org-chart detail, but now they decide how much you can safely ship.

AI lets us produce code without many of the conversations that used to come with it. Some of those conversations were overhead, sure, but others taught us what was safe to change. Engineering leadership now means knowing the difference, and making sure the second kind still happens.