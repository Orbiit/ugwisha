const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-es');

function read(file) {
  return new Promise((res, rej) => {
    fs.readFile(path.resolve(__dirname, file), 'utf8', (err, data) => err ? rej(err) : res(data));
  });
}
function write(file, contents) {
  return new Promise((res, rej) => {
    fs.writeFile(path.resolve(__dirname, file), contents, 'utf8', err => err ? rej(err) : res());
  });
}

const options = {
  toplevel: true, // top level variable and function happiness
  compress: {
    drop_console: true, // destroys console.* functions
    keep_fargs: false, // destroys unused function arguments
    keep_fnames: false // allows destruction of function names
  },
  output: {
    preamble: '/* Approved by the sheep */' // prepends this comment to minified code
  }
};

read('src.html').then(async html => {
  const version = Date.now();
  let jsPromise, cssPromise;
  const newHTML = html
    .replace(/<!-- BEGIN: scripts -->(.|\r?\n)+<!-- END: scripts -->/, match => {
      const files = match.match(/(?<=<script src=")[^"]+(?=" charset="utf-8"><\/script>)/g);
      jsPromise = Promise.all(files.map(path => read(path)));
      return `<script src="./ugwisha.js" charset="utf-8"></script>`;
    })
    .replace(/<!-- BEGIN: styles -->(.|\r?\n)+<!-- END: styles -->/, match => {
      const files = match.match(/(?<=<link rel="stylesheet" href=")[^"]+(?=">)/g);
      cssPromise = Promise.all(files.map(path => read(path)))
        .then(css => write('./css/ugwisha.css', css
          .join('\n')
          .replace(/\/\*.*?\*\//g, '')
          .replace(/(:|,)\s+/g, '$1')
          .replace(/\s{2,}|\r?\n/g, '')));
      return `<link rel="stylesheet" href="./css/ugwisha.css">`;
    })
    .replace(/\s{2,}|\r?\n/g, '');
  if (!jsPromise) throw new Error("Can't find scripts oof");
  const jsFiles = `(() => {${(await jsPromise).join('\n\n')}\nUgwisha.version = ${version};})();`;
  console.log('Minifying...');
  const result = UglifyJS.minify(jsFiles, options);
  console.log('Minification done!');
  if (result.error) throw new Error(result.error);
  await Promise.all([
    write('./index.html', newHTML),
    write('./ugwisha.js', result.code),
    read('./sw.js').then(js => write('./sw.js', js.replace(/(?<=ugwisha-sw-v)\d+/, version))),
    cssPromise
  ]);
  console.log('Done; version ' + version);
});
