FROM node:18

COPY ./dist/packages/swaps-liquidator .
COPY package.json .

RUN npm install --production

ENV PORT=8080

EXPOSE 8080

CMD node ./main.js