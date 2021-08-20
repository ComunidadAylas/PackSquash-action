FROM node:buster

ENV DEBIAN_FRONTEND=noninteractive NODE_ENV=production

# Override the working directory. GitHub does not recommend this, but it is
# needed for npm install to work, and we want to do not touch the GitHub
# workspace as much as possible.
# See: https://docs.github.com/en/actions/creating-actions/dockerfile-support-for-github-actions#workdir
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
 && rm -rf /var/lib/apt/lists/* \
 && npm install @actions/cache @actions/artifact

COPY git-set-file-times.pl actions-cache.mjs actions-artifact-upload.mjs entrypoint.sh ./

ENTRYPOINT ["/opt/action/entrypoint.sh"]
