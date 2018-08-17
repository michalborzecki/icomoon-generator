# icomoon-generator

## Installation
```
git clone git@github.com:michalborzecki/icomoon-generator.git
cd icomoon-generator
npm install
```

## Usage
Font can be generated using command:

```
npm start dir-with-svg-icons output-folder config-location
```

Example:
```
npm start ../my-icons/svg public/fonts/myicons myicons-config.json
```

## Configuration
Font can be configured using json config file. Example can be found  in config-example.json. If some config option is not necessary, then it can be ommitted.
