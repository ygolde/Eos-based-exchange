FROM node:8.16.0
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install
RUN npm install pm2 -g
COPY . .
EXPOSE 4000
CMD [ "npm", "start" ]