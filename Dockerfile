FROM node:18-alpine

# default port on which the proxy server runs
EXPOSE 80

WORKDIR /opt/vizer-hub
COPY public public
COPY utils utils
COPY app.cjs app.cjs
COPY package.json package.json
COPY LICENSE LICENSE
COPY README.md README.md


RUN npm install .
ENTRYPOINT ["/usr/local/bin/node", "app.cjs"]
