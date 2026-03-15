FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5176

# Vite dev server port
CMD ["npm", "run", "dev"]
