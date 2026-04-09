Run unit and integration tests for both the frontend and backend, then verify that coverage meets the 90% threshold.

## Steps

### 1. Backend Tests (xUnit)
Run the backend tests with coverage collection from `NoteTakingApp/backend/`:

```bash
cd NoteTakingApp/backend && dotnet test --collect:"XPlat Code Coverage" --results-directory ./TestResults
```

Then check if a coverage report tool is available and generate a summary:
```bash
dotnet tool run dotnet-coverage merge ./TestResults/**/*.xml --output coverage.xml --output-format xml 2>/dev/null || true
```



### 2. Frontend Tests (Jest)
Run the frontend tests with coverage from `NoteTakingApp/frontend/`:

```bash
cd NoteTakingApp/frontend && npm test -- --coverage --coverageThreshold='{"global":{"lines":90,"branches":90,"functions":90,"statements":90}}' --watchAll=false
```

### 3. Report Results
After running both test suites, produce a clear summary table:

| Suite    | Lines | Branches | Functions | Statements | Pass? |
|----------|-------|----------|-----------|------------|-------|
| Backend  | X%    | X%       | X%        | X%         | ✓/✗  |
| Frontend | X%    | X%       | X%        | X%         | ✓/✗  |

- If any metric is **below 90%**, list the specific files/modules that are under-covered and suggest which tests are missing.
- If all metrics are **at or above 90%**, confirm the coverage requirement is met.

> Threshold: **90%** for lines, branches, functions, and statements in both unit and integration tests.
