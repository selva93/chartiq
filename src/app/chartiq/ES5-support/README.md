If you need to run the library in an environment that only supports ES5, please use the files in this folder. 
These files have been transpiled with [Babel](https://babeljs.io/) using the [preset-env plugin](https://babeljs.io/docs/en/babel-preset-env).

This folder mirrors the root directory structure. To use the ES5 version of the files replace their ES6 equivalents listed below with the ones supplied here.

```
# Copy the transpiled ES5 versions of componentUI and components to the js folder
cd path/to/ES5-support
cp ./js/componentUI.js ../js/componentUI.js
cp ./js/components.js ../js/components.js
```
