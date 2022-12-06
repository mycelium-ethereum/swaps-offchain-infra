FROM node:18

COPY ./dist/packages/swaps-prices .
COPY package.json .

#ENV PORT=3333
#EXPOSE ${PORT}
RUN npm install --production
# dependencies that express needs
#RUN npm install reflect-metadata tslib rxjs express
CMD node ./main.js
