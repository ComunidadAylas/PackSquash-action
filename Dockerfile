FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

# https://github.com/ComunidadAylas/PackSquash/wiki/Installation-guide#linux
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    jq \
    wget \
    unzip \
    git \
    tzdata \
    libgstreamer1.0-0 \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
 && apt-get -y clean \
 && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
COPY git-set-file-times.sh /git-set-file-times.sh

ENTRYPOINT ["/entrypoint.sh"]