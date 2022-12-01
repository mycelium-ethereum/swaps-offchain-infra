# syntax=docker/dockerfile:1

FROM node:18.0.0

ENV NODE_ENV=production

WORKDIR /keepers

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY dist .

CMD [ "node", "./index.js" ]
