FROM node:bullseye

ENV DEBIAN_FRONTEND=noninteractive NODE_ENV=production

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
 && rm -rf /var/lib/apt/lists/* \
 && npm install --prefix /opt/action @actions/cache @actions/artifact

COPY git-set-file-times.pl actions-cache.mjs actions-artifact-upload.mjs entrypoint.sh /opt/action/

ENTRYPOINT ["/opt/action/entrypoint.sh"]
