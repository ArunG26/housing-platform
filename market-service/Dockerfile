FROM gradle:8.14.3-jdk21 AS build
WORKDIR /workspace

COPY --chown=gradle:gradle build.gradle settings.gradle gradle.properties ./
RUN gradle dependencies --no-daemon

COPY --chown=gradle:gradle src ./src
RUN gradle clean bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --create-home --uid 10001 appuser
COPY --from=build --chown=appuser:appuser /workspace/build/libs/market-service-1.1.0.jar app.jar
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
