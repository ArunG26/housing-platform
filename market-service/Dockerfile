FROM gradle:8.14.3-jdk21 AS build
WORKDIR /workspace

COPY --chown=gradle:gradle build.gradle settings.gradle gradle.properties ./
RUN gradle dependencies --no-daemon

COPY --chown=gradle:gradle src ./src
RUN gradle clean bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser

COPY --from=build \
    --chown=appuser:appuser \
    /workspace/build/libs/market-service.jar \
    /app/app.jar

USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD curl --fail --silent --show-error \
    http://127.0.0.1:8080/actuator/health/readiness \
    > /dev/null || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
