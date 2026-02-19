FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY . .
RUN npm --prefix packages/shared-auth ci \
 && npm --prefix packages/shared-auth run build \
 && npm --prefix BlockWalletDigi ci --legacy-peer-deps \
 && npm --prefix BlockWalletDigi run build

FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/BlockWalletDigi/dist ./dist
COPY --from=build /app/BlockWalletDigi/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
EXPOSE 8080
CMD ["npm","start"]
