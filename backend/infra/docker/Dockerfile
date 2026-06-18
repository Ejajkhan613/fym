FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages ./packages
COPY services ./services
COPY scripts ./scripts

RUN npm ci --omit=dev && npm cache clean --force

USER node

EXPOSE 4000 4101 4102 4103 4104 4105 4106 4107 4108 4109 4110 4111 4112 4113 4114 4115

CMD ["node", "scripts/start-service.js", "api-gateway"]
