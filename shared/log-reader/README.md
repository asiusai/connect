# Update capnproto schema

first get the commaai capnp-ts fork set up (requires some enhancements)
```
# needs to be in home dir
cd ~/
git clone git@github.com:commaai/capnp-ts.git
cd capnp-ts
# requires node v8.x
nvm use lts/carbon
yarn install
yarn build
```

then convert the schema definiton to typescript
```
cd log-reader
capnpc --output=../../capnp-ts/packages/capnpc-ts/bin/capnpc-ts.js:./capnp/ --src-prefix=${CEREAL_DIR:-~/openpilot/cereal/} ${CEREAL_DIR:-~/openpilot/cereal/}/*.capnp
```
