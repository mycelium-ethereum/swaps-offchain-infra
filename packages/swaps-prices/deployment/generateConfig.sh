#!/bin/bash

rm -rf ./output
mkdir -p ./output

sed -i "s|IMAGE_NAME|$2|g" ./deployment.yml

for filename in *.yml; do
  touch "./output/$(basename "$filename" .yml).yml"
  ytt -f "$filename" -f "$1" >> "./output/$(basename "$filename" .yml).yml"
done

# Change it back
sed -i "s|$2|IMAGE_NAME|g" ./deployment.yml
