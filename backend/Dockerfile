FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN apt-get update -y && apt-get install -y openssl && npm install

COPY . .

RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
