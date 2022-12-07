FROM node:18

COPY ./dist/packages/siwe-chat-box-backend .
COPY package.json .

RUN npm install --omit=dev

CMD node ./main.js
