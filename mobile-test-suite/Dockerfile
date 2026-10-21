# Mobile test suite: builds the Flutter app for web, then serves it next to the
# tester page. Build context is the REPO ROOT (Railway: RAILWAY_DOCKERFILE_PATH=
# mobile-test-suite/Dockerfile), because the app lives in ExpansionNetworkApp/.

# Keep in step with the Flutter version used for release builds.
FROM ghcr.io/cirruslabs/flutter:3.41.6 AS build
WORKDIR /src
COPY ExpansionNetworkApp/expansion_network/ ./
RUN flutter pub get
# FIREBASE_ENV=stage: same backend as the store builds.
# E2E_SEMANTICS: exposes buttons/fields to the Playwright suite (see main.dart).
RUN flutter build web --release --no-wasm-dry-run \
      --dart-define=FIREBASE_ENV=stage \
      --dart-define=E2E_SEMANTICS=true \
      --base-href /app/ \
      --output /out/app

FROM node:20-alpine
WORKDIR /srv
COPY mobile-test-suite/server.mjs ./
COPY mobile-test-suite/public ./public
COPY --from=build /out/app ./app
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
