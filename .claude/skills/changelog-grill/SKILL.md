---
name: changelog-grill
description: Interview the user relentlessly about a changelog or ADR template until reaching shared understanding. Proposes point-form edits after each round.
---

# Changelog Grill

Interview me relentlessly about every aspect of this plan until we reach a shared understanding.

## Setup

1. Read the template file (path provided by user, or pasted content).
2. Read `changelog/TEMPLATE_POINT_FORM.md` for expected structure.
3. Inspect related source, interfaces, tests, and existing changelog entries to verify facts.

## Protocol

Walk down each branch of the design tree resolving dependencies between decisions one by one.

- Ask exactly ONE question per message. Never ask two or more questions in the same output.
- If the question can be answered by exploring the codebase, explore the codebase instead of asking. If there are key details missing in the template suggest them. 
- For each question, provide your recommended answer.
- After the user responds, apply the edit to the point-form template immediately, then ask the
  next single question.

Question format:

```
❓ **<title>**: <question + context>
➡️ **Recommendation:** <your recommended answer and why>
```

## After each answer

Apply the result directly to the point-form template file. Edits must use point-form technical
English: active voice, present tense, one fact per bullet, named subjects, state WHY alongside WHAT.

## Completion

Done when every section has been reviewed, no assumption remains silent, and the user confirms
shared understanding.
