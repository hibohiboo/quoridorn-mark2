#!/bin/bash

# dockerのディレクトリに移動
cd /vagrant/virtual-environment/provision/docker

# 最初に一回ビルド
docker-compose stop

# バックグラウンドで起動
docker-compose up -d
