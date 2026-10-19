FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm ci --omit=dev

COPY backend/ .

COPY database/schema.sql /database/schema.sql

EXPOSE 5000

CMD ["npm", "start"]

