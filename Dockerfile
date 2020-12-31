# compile image
FROM node:current-alpine AS compile-image
WORKDIR /opt/mre

COPY package*.json ./
COPY microsoft-mixed-reality-extension-sdk-0.20.0.tgz ./
RUN ["npm", "install", "--unsafe-perm"]

COPY src/*.ts ./src/
COPY tsconfig.json ./
RUN ["npm", "run", "build"]

# runtime image
FROM node:current-alpine AS runtime-image
WORKDIR /opt/mre

COPY package*.json ./
COPY microsoft-mixed-reality-extension-sdk-0.20.0.tgz ./
RUN ["npm", "install", "--production"]

COPY --from=compile-image /opt/mre/built ./built/
COPY public ./public/

ENV PRODUCTION=1
EXPOSE 3901/tcp
CMD ["npm", "start"]
