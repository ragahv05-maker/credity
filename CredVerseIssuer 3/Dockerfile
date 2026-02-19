FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY . .
RUN npm --prefix packages/shared-auth ci \
 && npm --prefix packages/shared-auth run build \
 && npm --prefix "CredVerseIssuer 3" ci --legacy-peer-deps \
 && npm --prefix "CredVerseIssuer 3" run build

FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/CredVerseIssuer\ 3/dist ./dist
COPY --from=build /app/CredVerseIssuer\ 3/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
EXPOSE 8080
CMD ["npm","start"]
