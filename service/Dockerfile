FROM node:20-alpine3.16
WORKDIR /app
COPY ./CVExchange/package.json package.json 
COPY ./CVExchange/package-lock.json package-lock.json 
RUN npm install
COPY ./CVExchange/ .
CMD node app.js
