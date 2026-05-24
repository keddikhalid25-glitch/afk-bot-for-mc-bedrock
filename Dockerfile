FROM node:20
WORKDIR /app
COPY package.json .
RUN apt-get update && apt-get install -y python3 make g++ cmake
RUN npm install
COPY bot.mjs .
CMD ["node", "bot.mjs"]
