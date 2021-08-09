FROM node:current-alpine
WORKDIR /opt/app
COPY . .
RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python && \
  npm install --quiet node-gyp -g &&\
  npm install --quiet && \
  apk del native-deps
EXPOSE 4000
CMD ["node", "out/index.js"]