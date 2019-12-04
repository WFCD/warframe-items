FROM resin/raspberry-pi-alpine-node

# Build deps
RUN apk add --update --repository http://dl-3.alpinelinux.org/alpine/edge/testing \
    vips-dev fftw-dev libc6-compat \
  && apk add --update --no-cache git openssh make gcc g++ python curl libpng-dev bash iproute2 \
  && npm install node-gyp -g

# Clone repo
RUN mkdir -p /app/warframe-items \
  && cd app \
  && git clone https://github.com/WFCD/warframe-items \
  && cd warframe-items \
  && npm install

# Clean up unnecessary dependencies
RUN apk del make gcc g++ python \
  && npm remove node-gyp -g

# Entry point for starting the app
COPY entrypoint.sh /
CMD [ "bash", "/entrypoint.sh" ]
