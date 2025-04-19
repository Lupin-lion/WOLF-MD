FROM node:lts-buster

RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp && \
    apt-get upgrade -y && \
    npm i pm2 -g && \
    rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/Lupin-lion/WOLF-MD /root/wolf-md-bot
WORKDIR /root/wolf-md-bot/

COPY package.json .
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
