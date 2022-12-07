FROM node:18

COPY ./dist/packages/swaps-prices .
COPY package.json .

RUN npm install --production

CMD node ./main.js
