# Architecture and Senior-Engineering Decisions

## Runtime topology

```text
Internet / Browser
       |
       | user session
       v
Next.js Portal / BFF
       |
       | BFF workload identity + request/trace context
       +---------------------------+
       |                           |
       v                           v
Estimator FastAPI             Market Spring Boot
       |                           |
       | estimator ML identity     | market ML identity
       +-------------+-------------+
                     v
                 ML FastAPI
```

Only the portal should be internet-facing in a production topology. Application and ML services belong on private networking.

## Identity versus authorization

Three concerns are intentionally separated:

1. **Human authentication** – who signed into the portal?
2. **Human authorization** – may that role execute the operation?
3. **Workload identity** – which backend service is calling another service?

The local implementation uses demo credentials and static workload secrets because an enterprise identity platform is outside the assignment. The boundaries mirror how OIDC/client-credentials/mTLS can replace them later.

## Authorization model

- `VIEWER`: estimator, history/comparison, market read/filter/sort.
- `ANALYST`: VIEWER permissions plus what-if and data exports.

UI gating is convenience only. Next route handlers enforce the role, and the Java backend independently requires ANALYST for what-if/export after authenticating the BFF.

## ML scopes

- Estimator: `ml:predict`, `ml:model-read`
- Market: `ml:predict`

This demonstrates least privilege: Market does not need model coefficients/metadata to perform what-if analysis.

## Traceability

`X-Request-ID` represents the business/support correlation key. `traceparent` supplies a W3C trace identifier plus a per-hop span identifier.

```text
request_id = R1
trace_id   = T1

Portal span P1
   -> Estimator span E1
         -> ML span M1
```

All services log the IDs. This gives end-to-end diagnostic correlation today and is directly compatible with adding an OpenTelemetry exporter/collector later.

## Version strategy

Four lifecycles are distinct:

- platform release: `1.1.0`
- service version: currently `1.1.0` for all services in this release
- API version: `v1`
- model version: `1.0.0`

The model version is intentionally independent: UI/service deployment does not imply retraining, and a new approved model does not necessarily require an API-breaking change.

## Statelessness and scaling

Portal authentication uses a signed stateless session cookie, while Estimator and ML keep no authoritative user/business state in process. Spring's Caffeine cache is an optimization rather than a source of truth.

Therefore these services can scale horizontally without sticky sessions, provided any future mutable business state is externalized.

The Java service loads the supplied 50-row dataset in memory by design. A real large/mutable market dataset should move to an external database or analytics store so filtering, sorting, paging and aggregation execute close to the data.

## Data and rendering strategy

- Initial estimator metadata: Server Component -> Estimator -> ML.
- Initial market page: Server Component -> Market.
- Estimate interaction: Client Component -> Next BFF -> Estimator -> ML.
- Filters/sort: Client Component -> Next BFF -> Market.
- What-if: Client Component -> Next BFF -> Market -> ML batch predict.

This keeps initial read-heavy work server-rendered and sends only genuinely interactive state to client components.

## Resilience and protection

- bounded downstream connect/read timeouts
- standardized 503 handling
- ML maximum batch size
- Java page-size bounds
- liveness/readiness separation
- request/body limiting can additionally be enforced at ingress in production

Retries/circuit breakers are not enabled indiscriminately; they should be introduced against measured failure modes to avoid retry storms.

## Logging

A common semantic schema is used across runtimes instead of forcing one logging library across Java/Python/Node. Secrets, session cookies and Authorization headers must never be logged.

## Testing strategy

Tests prioritize business and boundary behavior:

- model/API validation and scope authorization
- internal-service authentication
- request correlation
- dataset ingestion including BOM handling
- market aggregation/filter/sort/page behavior

The objective is risk coverage, not an arbitrary 100% line-coverage target.
