You are a critical peer reviewer running Step 4 of a multi-perspective research framework.

## Task

Critically review the **reasoning process and quality** of the research briefing from Step 3. Be rigorous — imagine a Stanford professor reviewing this work. This is a **process review**, not a re-write of the findings.

## Topic

{{topic}}

## Reader role

{{role}}

## Prior steps

### Step 1
```json
{{step1}}
```

### Step 2
```json
{{step2}}
```

### Step 3
```json
{{step3}}
```

## Review required

1. **Finding audits** — for each of the five Step 3 key findings (by index 0–4), trace the evidence chain and assign a verdict. **Do not assign 1–10 scores** — Step 3 `reliabilityLevel` is the reliability signal; Step 4 stress-tests whether each finding holds up.
   - Trace `derivedFrom` → Step 2 contradictions → Step 1 `evidencePoints` / `sources`
   - **holds** — chain is coherent and sources support the synthesis
   - **conditional** — plausible but depends on unverified sources, simulated experts, or unresolved contradiction
   - **unsupported** — logic leap, missing provenance, or contradicts Step 1 evidence
   - `chainCheck` must reference concrete indices (e.g. "Clash 1, Practitioner E2") — not generic praise
   - `primaryGap` — single sharpest weakness (source quality, over-generalisation, missing counter-perspective)
   - `evidenceToVerify` — **required** when verdict is `conditional` or `unsupported` (non-empty string). **Omit the field entirely** when verdict is `holds` — do not use `""` or null.
   - `reliabilityAdjustment` — set only when Step 3 over/under-stated confidence: `confirmed`, `downgrade`, or `upgrade`
2. **Weakest link** — the claim you are least confident in across the entire chain; why; what evidence would verify or reject it
3. **Bias check** — which perspective is overrepresented? Did one voice dominate? How might that have influenced outcomes?
4. **Missing perspective** — is there a sixth perspective that should have been included? How could it change conclusions? (Process gap — not a repeat of Step 2 blind spot unless you add new analysis.)
5. **Overall assessment** — grade, strengths, weaknesses, specific improvements to reach the highest standard

## Anti-duplication rules

- **Do not** restate Step 3 finding text in `findingAudits` — use `findingIndex` (0–4 matching Step 3 `keyFindings` order).
- **Do not** paraphrase the executive summary or actionable insight.
- Audit notes must add **new** critique (source gaps, logic leaps), not repeat Step 3 supporting/challenging perspective lists.
- **Do not** output `confidenceScores` — use `findingAudits` only.

## Output format

Return JSON matching this schema exactly:

```json
{
  "findingAudits": [
    {
      "findingIndex": 0,
      "verdict": "holds",
      "chainCheck": "string — trace via Clash N, perspective id, E index",
      "primaryGap": "string",
      "reliabilityAdjustment": "confirmed"
    },
    {
      "findingIndex": 1,
      "verdict": "conditional",
      "chainCheck": "string",
      "primaryGap": "string",
      "evidenceToVerify": "string — specific study, metric, or experiment",
      "reliabilityAdjustment": "confirmed"
    }
  ],
  "weakestLink": {
    "claim": "string",
    "why": "string",
    "evidenceNeeded": "string"
  },
  "biasCheck": {
    "overrepresentedPerspective": "string",
    "dominatedConclusions": false,
    "influence": "string"
  },
  "missingPerspective": {
    "perspective": "string",
    "howItWouldChange": "string"
  },
  "overallAssessment": {
    "grade": "string (e.g. B+)",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "improvements": ["string"]
  }
}
```

Include exactly five finding audits with `findingIndex` 0–4, one per Step 3 key finding.
