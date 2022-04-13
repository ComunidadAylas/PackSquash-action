FROM node:bullseye

ENV DEBIAN_FRONTEND=noninteractive

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

COPY \
git-set-file-times.pl dist/index.mjs \
packsquash-problem-matcher.json entrypoint.sh \
/opt/action/

ENTRYPOINT ["/opt/action/entrypoint.sh"]
