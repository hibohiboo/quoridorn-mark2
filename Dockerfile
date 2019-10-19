FROM node:12.12.0-alpine

# コンテナ上の作業ディレクトリ作成
WORKDIR /app
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
RUN npm install