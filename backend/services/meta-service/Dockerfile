FROM node:18

WORKDIR /app

RUN apt-get update && apt-get install -y netcat-openbsd

COPY package*.json ./
RUN npm install

COPY . .

COPY wait-for.sh .

RUN chmod +x wait-for.sh

RUN npm run build

EXPOSE 3002

CMD ["sh", "-c", "./wait-for.sh dynamodb-local && node dist/scripts/createTable.js && node dist/index.js"]
