FROM node:buster

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production

WORKDIR /opt/action

# Install packages we need in the entrypoint, and PackSquash dependencies. See:
# https://github.com/ComunidadAylas/PackSquash/wiki/Installation-guide#linux
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    jq \
    unzip \
    zstd \
    tzdata \
    libgstreamer1.0-0 \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
 && apt-get -y clean \
 && rm -rf /var/lib/apt/lists/*

# Install npm packages we will use for caching and uploading artifacts.
# Use WORKDIR to work around npm quirks:
# https://stackoverflow.com/questions/57534295/npm-err-tracker-idealtree-already-exists-while-creating-the-docker-image-for
RUN npm install @actions/cache @actions/artifact

COPY git-set-file-times.pl actions-cache.js actions-artifact-upload.js entrypoint.sh .

ENTRYPOINT ["entrypoint.sh"]