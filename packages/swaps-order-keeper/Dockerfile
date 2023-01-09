FROM node:18

COPY ./dist/packages/swaps-order-keeper .
COPY package.json .

RUN npm install --production

CMD node ./main.js