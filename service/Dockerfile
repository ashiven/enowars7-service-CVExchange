FROM node:20-alpine3.16

#add shadow for permission modification
RUN apk add shadow

#add a child user/group
RUN addgroup --system child
RUN adduser --system --ingroup child --uid 999 child

#change workdir to app
WORKDIR /app

#do whatever is needed to start the service
COPY ./CVExchange/package.json package.json 
COPY ./CVExchange/package-lock.json package-lock.json 
RUN npm install
COPY ./CVExchange/ .

#give full permissions to the owners of files/folders and only read permissions to everyone else
RUN chmod -R 744 /app

#set execute permissions for files inside of /uploads
RUN chmod -R 755 /app/uploads

CMD node app.js
