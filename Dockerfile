# Sorrida als Container: für den Betrieb bei einem Rechenzentrum mit
# C5-Testat (§ 393 SGB V) statt Vercel. Läuft mit jeder PostgreSQL-Datenbank.
# Bauen:   docker build -t sorrida .
# Starten: docker run -p 3000:3000 --env-file .env.produktion sorrida
# Benötigte Variablen: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL;
# optional ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL,
# UPSTASH_REDIS_REST_URL/TOKEN, CRON_SECRET.

# Basis-Image austauschbar, z. B. ein Spiegel im eigenen Rechenzentrum.
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS bauen
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Optional für Builds hinter einem Firmen-Proxy: BUILD_PROXY (nur für npm,
# Prisma und den Build) und das CA-Zertifikat als Build-Secret „ca_bundle“.
ARG BUILD_PROXY=
RUN --mount=type=secret,id=ca_bundle,required=false sh -c '[ -n "$BUILD_PROXY" ] && export HTTPS_PROXY=$BUILD_PROXY https_proxy=$BUILD_PROXY npm_config_https_proxy=$BUILD_PROXY; [ -f /run/secrets/ca_bundle ] && export NODE_EXTRA_CA_CERTS=/run/secrets/ca_bundle; npm ci'
COPY . .
RUN --mount=type=secret,id=ca_bundle,required=false sh -c '[ -n "$BUILD_PROXY" ] && export HTTPS_PROXY=$BUILD_PROXY https_proxy=$BUILD_PROXY npm_config_https_proxy=$BUILD_PROXY; [ -f /run/secrets/ca_bundle ] && export NODE_EXTRA_CA_CERTS=/run/secrets/ca_bundle; npx prisma generate && npm run build && npx esbuild prisma/seed.ts --bundle --platform=node --external:@prisma/client --outfile=prisma/seed.js && npm prune --omit=dev'

FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production PORT=3000 NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 1001 sorrida
COPY --from=bauen --chown=sorrida /app/package.json /app/package-lock.json ./
COPY --from=bauen --chown=sorrida /app/node_modules ./node_modules
COPY --from=bauen --chown=sorrida /app/.next ./.next
COPY --from=bauen --chown=sorrida /app/public ./public
COPY --from=bauen --chown=sorrida /app/prisma ./prisma
COPY --from=bauen --chown=sorrida /app/next.config.js ./
USER sorrida
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:3000/api/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrationen und Grunddaten (idempotent) beim Start einspielen, dann die App starten.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && npx next start -p ${PORT}"]
