FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY . .
RUN npm --prefix packages/shared-auth ci \
 && npm --prefix packages/shared-auth run build \
 && npm --prefix CredVerseRecruiter ci --legacy-peer-deps \
 && npm --prefix CredVerseRecruiter run build

FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/CredVerseRecruiter/dist ./dist
COPY --from=build /app/CredVerseRecruiter/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
EXPOSE 8080
CMD ["npm","start"]
