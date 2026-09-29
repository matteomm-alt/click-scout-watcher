# Architecture Decisions

- Formation coordinates remain persisted in the canonical editor system (net at y=0); every court-facing UI uses the shared reversible conversion in `courtPositionResolver` so existing templates remain compatible.