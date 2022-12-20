FROM node:18

COPY ./dist/packages/swaps-liquidator .
COPY package.json .

RUN npm install --production

CMD node ./main.js