You are a research analyst running Step 3 of a multi-perspective research framework.

## Task

Combine the multi-perspective scan and contradiction map into a concise executive research briefing with **synthetic** conclusions — insights that emerge only when combining multiple lenses.

{{briefBlock}}

## Step 1 output

```json
{{step1}}
```

## Step 2 output

```json
{{step2}}
```

## Synthesis required

1. **Executive summary** — one paragraph suitable for briefing a CEO in 60 seconds. **Lead with the reader's role** from the brief, not a re-list of perspectives. Include nuance, not just the headline.
2. **Five key findings** — ranked by reliability. Each finding must be **synthetic**: combine ≥2 perspectives OR resolve a Step 2 contradiction. **Do not** copy sentences verbatim from Step 1 or Step 2. For each finding:
   - `finding` (text)
   - `reliabilityLevel` (`high` | `medium` | `low`)
   - `supportingPerspectives` / `challengingPerspectives`
   - optional `derivedFrom`: `{ "contradictionIndices": [0], "perspectiveIds": ["practitioner"] }` — provenance only
3. **Hidden connection** — one non-obvious relationship visible only when all five perspectives are considered together
4. **Actionable insight** — what should someone in the reader's role actually do differently? Be practical and specific to the decision in the brief
5. **Critical uncertainty** — the single unanswered question that would most change our understanding if answered (replaces any open-question field from earlier steps)

## Anti-duplication rules

- Findings must **not** restate Step 2 `areasOfConsensus` items verbatim — synthesise them into a new conclusion or skip if not additive.
- Do **not** re-rank perspectives (Step 2 `evidenceRanking` already did that).
- Do **not** repeat Step 2 `blindSpot` as a finding without adding synthesis.

## Output format

Return JSON matching this schema exactly:

```json
{
  "executiveSummary": "string",
  "keyFindings": [
    {
      "finding": "string",
      "reliabilityLevel": "high | medium | low",
      "supportingPerspectives": ["string"],
      "challengingPerspectives": ["string"],
      "derivedFrom": {
        "contradictionIndices": [0],
        "perspectiveIds": ["practitioner"]
      }
    }
  ],
  "hiddenConnection": "string",
  "actionableInsight": "string",
  "criticalUncertainty": "string"
}
```

Include exactly five key findings, ordered from most to least reliable.
