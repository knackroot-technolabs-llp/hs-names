const fs = require('bfile');
const Path = require('path');

const DWEB_RESERVE_PATH = Path.resolve(__dirname, 'names', 'dwebreserve.json');

const RTLD = require('./names/rtld.json');
const BLACKLISTTLD = require('./names/blacklist.json');
const HISTORICALTLD = require('./names/historical.json');
const REJECTEDTLD = require('./names/rejected.json');
const EXISTINGPROJECTTLD = require('./names/existingproject.json');

// fetch individual list
const rtld = new Set(RTLD);
const blacklist = new Set(BLACKLISTTLD);
const historicaltld = new Set(HISTORICALTLD);
const rejectedtld = new Set(REJECTEDTLD);
const existingprojecttld = new Set(EXISTINGPROJECTTLD);

// merge all list
let arr = [...rtld, ...blacklist, ...historicaltld, ...rejectedtld, ...existingprojecttld];
arr.sort();

// remove duplicate
let result = new Set(arr);

// format and convert to json
const out = JSON.stringify([...result], null, 2);

console.log(out);

fs.writeFileSync(DWEB_RESERVE_PATH, out);
