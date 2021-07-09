FROM ubuntu:18.04

# https://github.com/ComunidadAylas/PackSquash/wiki/Installation-guide#linux
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    wget \
    unzip \
    libgstreamer1.0-0 \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
 && apt-get -y clean \
 && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://api.github.com/repos/ComunidadAylas/PackSquash/releases/tags/v0.3.0-rc.1 \
 | grep "browser_download_url.*PackSquash.executable.Linux.x64.glibc.zip\"" \
 | cut -d : -f 2,3 \
 | tr -d \" \
 | wget -qi -\
 && unzip PackSquash.executable.Linux.x64.glibc \
 && chmod a+x packsquash \
 && mv packsquash /usr/local/bin/

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]