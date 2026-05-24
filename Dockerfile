FROM node:20-slim
WORKDIR /app
COPY package.json .
RUN npm install --ignore-scripts
RUN sed -i "s/require('.\/rak')('raknet-native')/require('.\/rak')('jsp-raknet')/" node_modules/bedrock-protocol/src/createClient.js
COPY bot.mjs .
CMD ["node", "bot.mjs"]
