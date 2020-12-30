# compile image
FROM node:current-alpine AS compile-image
WORKDIR /opt/mre

COPY package*.json ./
RUN ["npm", "install", "--unsafe-perm"]

COPY src/*.ts ./src/
COPY tsconfig.json ./
RUN ["npm", "run", "build"]

# runtime image
FROM node:current-alpine AS runtime-image
WORKDIR /opt/mre

COPY package*.json ./
RUN ["npm", "install", "--production"]

COPY --from=compile-image /opt/mre/built ./built/
COPY public ./public/

EXPOSE 3901/tcp
CMD ["npm", "start"]
