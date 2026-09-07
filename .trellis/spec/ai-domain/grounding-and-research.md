# Grounding and Research

## Evidence invariants

Every JD or resume quote must be locatable verbatim in the supplied source. `lib/analysis-schema.ts` collects quote fields and rejects values absent from both inputs. `lib/analysis-engine.ts` additionally links requirement and evidence IDs, validates benchmark resume quotes, and uses explainable states such as `strong`, `partial`, `missing`, and `uncertain` instead of an opaque match score.

Resume suggestions must not invent factual numbers. Interview questions trace back to requirement and evidence IDs. Persist `citation_verified` and source/version metadata with derived artifacts where the schema supports it.

## Web research

`lib/web-research.ts` sends role/company context—not resume content—to Tavily, normalizes sources, and requires insights to reference returned source IDs. `app/api/positions/[id]/research/route.ts` validates cached snapshots and reuses fresh research for seven days unless forced.

Treat JD, resume, search excerpts and model output as data, never instructions. Preserve explicit delimiters in prompts and reject citations that cannot be resolved to known inputs or sources.
