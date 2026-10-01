# Property Intelligence Platform

1. **Task 1 – Housing Price Prediction Model API**: Python 3.12+, FastAPI, scikit-learn, Ridge regression, Docker and Swagger/OpenAPI.
2. **Task 2 – Multi-Application Next.js Portal**: a unified Next.js App Router portal hosting a Python-backed estimator and Java 21 / Spring Boot 3.4.4-backed market analysis application.

Current platform release: **1.1.0**. The ML model has its own independent version (**1.0.0** in the supplied artifact).

## Architecture

```text
Browser
  |
  | signed HTTP-only portal session
  v
Next.js Portal / BFF :3000
  |
  |-- /estimator --------------------> Estimator FastAPI :8001
  |                                      |
  |                                      | estimator ML identity
  |                                      | + W3C trace context
  |                                      v
  |                                   ML FastAPI :8000
  |
  `-- /market -----------------------> Spring Boot :8080
                                         |
                                         | market ML identity
                                         | + W3C trace context
                                         v
                                      ML FastAPI :8000
```

Only the portal should be internet-facing in a production topology. Estimator, Market and ML services belong on private networking.

The browser never receives internal service credentials. Portal-to-backend calls use a BFF workload credential, while Estimator and Market use separate ML workload identities.

See docs/architecture.md for additional rationale and decisions..

See [`docs/architecture.md`](docs/architecture.md) for rationale.

## Security model

### Portal authentication

The local/interview implementation uses two configurable demo identities representing:

VIEWER

ANALYST

Usernames and passwords are supplied through environment configuration and are not hardcoded in application source.

Successful login produces an HMAC-signed, HTTP-only session cookie. The browser never stores a bearer token in localStorage.

This is deliberately a lightweight authentication mechanism for the assignment. In production it should be replaced by enterprise OIDC/SAML identity integration, for example Ping, Entra ID or Okta, while retaining the same application authorization model.

### Portal authorization

`VIEWER` can use estimation and read market analytics.

`ANALYST` additionally receives what-if and CSV/PDF export permissions. 

UI gating is provided for user experience only. Next.js route handlers enforce authorization again on the server, and privileged Java backend operations independently enforce the required role after authenticating the BFF workload.

### Service-to-service identity

- Portal -> Estimator / Market: `BFF_INTERNAL_TOKEN`
- Estimator -> ML: `ESTIMATOR_ML_TOKEN`, scopes `ml:predict`, `ml:model-read`
- Market -> ML: `MARKET_ML_TOKEN`, scope `ml:predict`

This separates human identity from workload identity and demonstrates least-privilege service authorization.

ML operational endpoints such as /health, /live, /ready and /version remain probe-friendly, while /predict and /model-info require service identity.

### Configuration and secrets

Secrets are not embedded in application source.

Local development configuration is supplied through ignored .env.local files or operating-system environment variables.

Example configuration files are committed as .env.example; actual .env.local files must not be committed.

### Portal

Typical required values include:

BFF_INTERNAL_TOKEN
SESSION_SECRET
DEMO_VIEWER_USERNAME
DEMO_VIEWER_PASSWORD
DEMO_ANALYST_USERNAME
DEMO_ANALYST_PASSWORD

#### Estimator

Typical values include:

BFF_INTERNAL_TOKEN
ML_SERVICE_URL
ESTIMATOR_ML_TOKEN

#### ML

Typical values include:

ESTIMATOR_ML_TOKEN
MARKET_ML_TOKEN
MAX_BATCH_SIZE

The same workload secret must match on both sides of each trust boundary.

Portal BFF_INTERNAL_TOKEN
        =
Estimator BFF_INTERNAL_TOKEN
        =
Market BFF_INTERNAL_TOKEN

Estimator ESTIMATOR_ML_TOKEN
        =
ML ESTIMATOR_ML_TOKEN

Market MARKET_ML_TOKEN
        =
ML MARKET_ML_TOKEN

## Observability

Every service now propagates:

- `X-Request-ID`
- W3C `traceparent`
- `trace_id`
- `span_id`

Application logs include a consistent shape such as:

```json
{
  "timestamp": "2026-09-28T14:23:01Z",
  "level": "INFO",
  "service": "estimator-service",
  "environment": "local",
  "service_version": "1.1.0",
  "platform_version": "1.1.0",
  "request_id": "12a6c96b...",
  "trace_id": "abc123...",
  "span_id": "def456...",
  "operation": "create_estimate",
  "model_version": "1.0.0",
  "duration_ms": 43,
  "status": 200
}
```

X-Request-ID is the business/support correlation identifier.

traceparent carries W3C Trace Context containing the distributed trace ID and parent span context for the next service hop.

Spring Boot uses structured JSON logging with MDC. Python services emit structured JSON application events. Next.js server/BFF events are also logged as JSON.

This release implements custom W3C trace-context propagation and correlated spans in logs. It does not claim full OpenTelemetry instrumentation; the current boundaries provide a clean path to OpenTelemetry and OTLP export later.

Secrets, Authorization headers and session cookies must never be logged

## Health and version endpoints

Process health and dependency readiness are intentionally separated.

### Python services

Operational endpoints include:

  /live – process is alive

  /ready – service can perform its critical function

  /health – health/compatibility endpoint

  /version – service/platform/model version metadata where applicable

### Market Spring Boot service

Spring Boot uses Actuator health probes:

  /actuator/health/liveness
  /actuator/health/readiness

Liveness represents application-process health and does not depend on external dependencies.

Readiness includes the application's ability to serve market functionality, including successful market dataset availability.


## Repository layout

```text
housing-platform/
├── ml-service/          # Task 1 model artifact + secured inference API
├── estimator-service/   # App 1 Python application backend
├── market-service/      # App 2 Java application backend
├── portal/              # Next.js App Router portal/BFF
├── docs/
└── docker-compose.yml
```

## Manual local execution

Start in dependency order:

1. ML service `:8000`
2. Estimator service `:8001`
3. Market service `:8080`
4. Portal `:3000`

Before startup, create the required local environment files from the corresponding `.env.example` files and populate the required values.

Actual `.env.local` files are intentionally excluded from Git.

### ML

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Estimator

```powershell
cd estimator-service
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

### Market

```powershell
cd market-service
.\gradlew.bat clean test

.\gradlew.bat bootRun
```

### Portal

```powershell
cd portal
npm install
npm run typecheck
npm run dev
```

Open `http://localhost:3000` and sign in using the locally configured demo identity.

## Direct Swagger testing after security hardening

### ML Swagger 
is available at `http://localhost:8000/docs`, but protected operations now require **Authorize** with one of the configured service tokens.

The Estimator identity has:

ml:predict
ml:model-read

The Market identity has:

ml:predict

Therefore the Market identity can invoke /predict but receives 403 Forbidden when attempting /model-info.

### Estimator Swagger 
is available at `http://localhost:8001/docs` 
Protected application endpoints require the configured BFF workload token.

Health/readiness/version operations remain accessible for local operational checks where configured.

## Java market-service build

The Java backend uses Gradle 8.14.3 with Java 21:

```
.\gradlew.bat clean test

.\gradlew.bat bootRun

.\gradlew.bat clean bootJar
```

The executable artifact is produced under: `build/libs/`.

Using the Gradle Wrapper ensures contributors and CI use the repository-defined Gradle version rather than relying on a machine-specific Gradle installation.

## ML prediction contract

The ML /predict endpoint uses one consistent batch-oriented contract.

A single prediction is represented as a batch containing one item:

[
  {
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6
  }
]

A successful response has the form:

{
  "predictions": [
    248170.54
  ],
  "model_version": "1.0.0"
}

The API enforces:

`non-empty batches`

`maximum batch size`

`feature constraints`

`rejection of unknown fields`

The Estimator sends a batch of one and unwraps the first prediction for its external single-estimate API.

The Market service uses the same ML contract for baseline/scenario what-if prediction.

## Tests

### ML FastAPI

Coverage includes:

  service authentication and scope authorization
  batch-of-one prediction
  multi-item batch prediction
  maximum batch-size protection
  empty-batch rejection
  feature validation
  unknown-field rejection
  model-info authorization
  request-ID propagation

Run:

cd ml-service
.\.venv\Scripts\python.exe -m pytest

### Estimator FastAPI

Coverage includes:

  BFF workload authentication
  estimate validation
  model-info proxy behavior
  readiness
  request-ID propagation

ML integration is dependency-overridden in API unit tests so the tests validate the Estimator boundary independently.

Run:

cd estimator-service
.\.venv\Scripts\python.exe -m pytest

### Java Market

JUnit coverage includes:

  security/authorization behavior
  dataset and UTF-8 BOM parsing
  market statistics
  filtering
  sorting
  pagination
  page-size bounds

Run:

cd market-service
.\gradlew.bat clean test

### Portal

The current static quality gate includes:

  npm run typecheck

A browser-level smoke or end-to-end suite is a logical future extension.

## Next.js requirements mapping

- **App Router**: `portal/app/**`
- **Server Components**: initial model metadata and market data are loaded server-side.
- **Client Components**: form state, charts, history, comparison, filters and what-if interactions.
- **BFF pattern**: browser interactions call same-origin Next.js route handlers rather than internal service ports.
- **Custom hooks**: `useEstimateHistory`, `useMarketData`.
- **State management**: state-management strategy is based on state scope; local React state is used where appropriate instead of introducing Redux without a global-state requirement.
- **Authentication state**:  server/session mechanisms remain the source of truth rather than browser global state.
- **Validation**: Zod in the browser plus Pydantic/Jakarta validation server-side.
- **Loading/error boundaries**: root and route-specific loading/error components.
- **Responsive UI**: Tailwind CSS breakpoints.
- **Accessibility**: labels, alert/live regions, keyboard focus, skip link, table caption/header semantics, reduced-motion-safe transitions.

## Statelessness and scaling

Portal authentication uses a signed stateless session cookie.

Estimator and ML services keep no authoritative user or business state in process.

Spring Caffeine caching is an optimization rather than a source of truth.

These boundaries allow horizontal scaling without sticky sessions, provided future mutable business state is externalized.

The Market service loads the supplied 50-row dataset in memory by design for the assignment.

For a real large or mutable market dataset, filtering, sorting, pagination and aggregation should move to an external database or analytics store so processing happens close to the data rather than requiring the entire dataset to reside in every application instance.

## Resilience and protection

The current implementation includes:

  bounded downstream connect/read timeouts
  standardized downstream 503 handling
  bounded ML batch size with validation
  Java page-size bounds
  liveness/readiness separation
  service authentication and least-privilege authorization

Additional request/body limits can be enforced at ingress or API-gateway level in production.

Retries and circuit breakers are intentionally not introduced indiscriminately. They should be applied based on measured downstream failure modes, idempotency characteristics and latency requirements to avoid retry amplification or retry storms.

## Deliberate production evolution

The following are intentionally not introduced merely for technology demonstration:

  enterprise OIDC/SAML identity provider
  mTLS or platform workload identity replacing static local service tokens
  OpenTelemetry instrumentation and OTLP collector
  distributed trace UI such as Jaeger/Tempo
  database-backed estimate history
  distributed cache only where mutable or large-scale data requires it
  API gateway/WAF
  Kubernetes orchestration
  production model registry

The current service boundaries allow these capabilities to be introduced without changing core business ownership

## Useful local security checks

Do not hardcode local tokens in documentation or application source.

Use the configured environment values when directly testing protected endpoints.

### Estimator through the BFF trust boundary

```powershell
$headers = @{
  Authorization = "Bearer $env:BFF_INTERNAL_TOKEN"
  "X-User-Role" = "ANALYST"
  "X-Request-ID" = "demo-request-001"
}
```
### ML identity/scopes

Estimator calls to ML use:

  ESTIMATOR_ML_TOKEN

Market calls to ML use:

  MARKET_ML_TOKEN

The Market identity can call `/predict` but receives `403` from `/model-info`; that is intentional least-privilege authorization.