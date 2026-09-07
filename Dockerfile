FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache git
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM dependencies AS verify
COPY . .
RUN npm run typecheck && npm run lint && npm test -- --run && npm run verify:n8n-workflows && npm run verify:unified-n8n

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/assets/resumes ./assets/resumes
RUN mkdir -p /app/runtime/resumes && chown -R nextjs:nextjs /app/runtime
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
