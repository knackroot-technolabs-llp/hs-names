const fs = require('bfile');
const Path = require('path');
const assert = require('assert');

const DWEB_RESERVE_PATH = Path.resolve(__dirname, 'names', 'dwebreserve.json');

const RTLD = require('./names/rtld.json');
const BLACKLISTTLD = require('./names/blacklist.json');
const HISTORICALTLD = require('./names/historical.json');
const REJECTEDTLD = require('./names/rejected.json');
const EXISTINGPROJECTTLD = require('./names/existingproject.json');
const ALEXA = require('./names/alexa.json');
const util = require('./util');

// fetch individual list
const rtld = new Set(RTLD);
const blacklist = new Set(BLACKLISTTLD);
const historicaltld = new Set(HISTORICALTLD);
const rejectedtld = new Set(REJECTEDTLD);
const existingprojecttld = new Set(EXISTINGPROJECTTLD);

// build alexa list
let alexaSet = new Set();
for (let i = 0; i < 20000; i++) {
    const domain_ = ALEXA[i];
    const parts = domain_.split('.');

    // Strip leading `www`.
    while (parts.length > 2 && parts[0] === 'www')
      parts.shift();

    assert(parts.length >= 2);

    const domain = parts.join('.');

    // Ignore plain `www`.
    if (parts[0] === 'www') {
        console.log(`ignoring www ${domain}`);
        continue;
    }

    // Ignore deeply nested domains.
    if (parts.length > 3) {
        console.log(`ignoring deeply nested ${domain}}`);
        continue;
    }

    // Third-level domain.
    if (parts.length === 3) {

        const [, sld, tld] = parts;

        // Country Codes only (e.g. co.uk, com.cn).
        if (!util.isCCTLD(tld)) {
        continue;
        }

        // The SLD must be a known TLD
        // (or a widley used second-level
        // domain like `co` or `ac`).
        // Prioritize SLDs that have at
        // least 3 in the top 100k.
        switch (sld) {
        case 'com':
        case 'edu':
        case 'gov':
        case 'mil':
        case 'net':
        case 'org':
        case 'co': // common everywhere (1795)
        case 'ac': // common everywhere (572)
        case 'go': // govt for jp, kr, id, ke, th, tz (169)
        case 'gob': // govt for mx, ar, ve, pe, es (134)
        case 'nic': // govt for in (97)
        case 'or': // common in jp, kr, id (64)
        case 'ne': // common in jp (55)
        case 'gouv': // govt for fr (32)
        case 'jus': // govt for br (28)
        case 'gc': // govt for ca (19)
        case 'lg': // common in jp (15)
        case 'in': // common in th (14)
        case 'govt': // govt for nz (11)
        case 'gv': // common in au (8)
        case 'spb': // common in ru (6)
        case 'on': // ontario domain for ca (6)
        case 'gen': // common in tr (6)
        case 'res': // common in in (6)
        case 'qc': // quebec domain for ca (5)
        case 'kiev': // kiev domain for ua (5)
        case 'fi': // common in cr (4)
        case 'ab': // alberta domain for ca (3)
        case 'dn': // common in ua (3)
        case 'ed': // common in ao and jp (3)
            break;
        default:
            continue;
        }
        // console.log(`allowing 3rd level domain ${domain}`);
    }

    // Get lowest-level name.
    const name = parts.shift();

    // Must match standards.
    if (!util.isHNS(name)) {
        console.log(`invalid format ${domain}`);
        continue;
    }

    // Ignore single letter domains.
    if (name.length === 1) {
        console.log(`one letter domain ${domain}`);
        continue;
    }

    const tld = parts.join('.');

    // console.log(`------ name: ${name}  -  ${tld}`);
    alexaSet.add(name);
    if(alexaSet.size === 10000) break;

}

// console.log(alexaSet);


// merge all list
let arr = [...rtld, ...blacklist, ...historicaltld, ...rejectedtld, ...existingprojecttld, ...alexaSet];
arr.sort();

// remove duplicate
let result = new Set(arr);

// format and convert to json
const out = JSON.stringify([...result], null, 2);

// console.log(out);

fs.writeFileSync(DWEB_RESERVE_PATH, out);
