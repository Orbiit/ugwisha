const fs = require('fs');

fs.readFile('./index.html', 'utf8', (err, data) => {
  if (err) throw err;
  fs.writeFile('./paly.html',
    data.replace(/Ugwisha/g, 'Upwisha')
      .replace(/logo/g, 'logo-paly')
      .replace('manifest.json', 'manifest-paly.json')
      .replace(/ff5959/g, '2D5727')
      .replace('gunn.js', 'paly.js')
      .replace(`<input class="toggle-setting" data-option="showSELF" data-default="true" type="checkbox" id="show-self"><label for="show-self">Show SELF?</label>`, '')
      .replace('Gunn', 'Paly'),
    'utf8', console.log);
});
