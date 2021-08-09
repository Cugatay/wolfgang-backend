FROM node:current
WORKDIR /opt/app
COPY . .
RUN yarn
RUN yarn build
EXPOSE 4000
ENV NODE_ENV=production
CMD ["node", "out/index.js"]