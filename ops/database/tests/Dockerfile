FROM mcr.microsoft.com/powershell:7.4-ubuntu-22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install --yes --no-install-recommends mysql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
