FROM node:20-alpine3.16

#add a user/group that will be used for child processes
RUN addgroup --system --gid 1001 child
RUN adduser --system --ingroup child --uid 1001 child

#do the rest
WORKDIR /app
COPY ./CVExchange/package.json package.json 
COPY ./CVExchange/package-lock.json package-lock.json 
RUN npm install
COPY ./CVExchange/ .
CMD node app.js
