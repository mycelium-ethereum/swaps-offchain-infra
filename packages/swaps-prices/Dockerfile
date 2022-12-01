FROM node:18

# RUN pwd
COPY package*.json ./
COPY tsconfig*.json ./
COPY yarn.lock ./
COPY src ./

RUN yarn
RUN yarn run tsc

# Start the server
CMD ["node", "dist/index.js"]
