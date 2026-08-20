FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/dist /built
CMD ["sh", "-c", "rm -rf /app/dist/* && cp -r /built/. /app/dist && sleep infinity"]
