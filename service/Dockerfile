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
CMD JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1) node dist/app.js
