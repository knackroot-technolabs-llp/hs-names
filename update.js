#!/usr/bin/env node

'use strict';

// TLD Resources:
// https://www.icann.org/resources/pages/tlds-2012-02-25-en
// https://data.iana.org/TLD/tlds-alpha-by-domain.txt
// https://www.internic.net/domain/root.zone

// SLD Resources:
// https://www.google.com/search?q=alexa+top+100000
// https://www.quora.com/What-are-the-top-100-000-most-visited-websites
// https://s3.amazonaws.com/alexa-static/top-1m.csv.zip

const assert = require('assert');
const fs = require('bfile');
const Path = require('path');
const {fromZone} = require('bns/lib/wire');
const {countLabels, trimFQDN} = require('bns/lib/util');
const util = require('./util');

const TLD_PATH = Path.resolve(__dirname, 'data', 'tlds-alpha-by-domain.txt');
const ALEXA_PATH = Path.resolve(__dirname, 'data', 'top-1m.csv');
const ROOT_PATH = Path.resolve(__dirname, 'data', 'root.zone');
const WORDS_PATH = '/usr/share/dict/words';

// These names are blacklisted entirely.
// can be added
// .onion
// .internal
const BLACKLIST = [
  'example', // ICANN reserved
  'invalid', // ICANN reserved
  'local', // mDNS
  'localhost', // ICANN reserved
  'test' // ICANN reserved
];

// These names are also blacklisted
// by policy rules, but are given to
// other naming projects in case they
// want to create some kind of
// compatibility bridge. Their name
// can be removed from policy rules
// later.
const CUSTOM = [
  ['bit', 'bit.namecoin.org'], // Namecoin
  ['eth', 'eth.ens.domains'], // ENS
  ['exit', 'exit.torproject.com'], // Tor
  ['gnu', 'gnu.gplv3.com'], // GNUnet (GNS)
  ['i2p', 'i2p.geti2p.net'], // Invisible Internet Project
  ['onion', 'onion.torproject.com'], // Tor
  ['tor', 'tor.torproject.com'], // Tor (OnioNS)
  ['zkey', 'zkey.gplv3.com'], // GNS

  // Required to make the custom values work:
  ['afilias', 'afilias.info'], // Afilias plc (does not rank)
  ['blockstack', 'blockstack.com'], // Blockstack (does not rank)
  ['brave', 'brave.com'], // Brave (english word)
  ['darksi', 'darksi.de'], // Individual (does not rank)
  ['datprotocol', 'datprotocol.com'], // Dat Project (does not rank)
  ['debian', 'debian.net'], // Debian (prefer over .org)
  ['dnscrypt', 'dnscrypt.info'], // DNScrypt (does not rank)
  ['eff', 'eff.com'], // Electronic Frontier Foundation (prefer over .org)
  ['gnunet', 'gnunet.org'], // GNUnet (does not rank)
  ['keybase', 'keybase.io'], // Keybase (prefer over keybase.pub)
  ['m-d', 'm-d.net'], // Individual (does not rank)
  ['marples', 'marples.name'], // Individual (does not rank)
  ['mozilla', 'mozilla.com'], // Mozilla Foundation (prefer over .org)
  ['nlnetlabs', 'nlnetlabs.nl'], // Unbound (does not rank)
  ['numcalc', 'numcalc.com'], // Individual (does not rank)
  ['pir', 'pir.org'] // Public Internet Registry (does not rank)
].sort(([a], [b]) => {
  return a.localeCompare(b);
});

const VALUES = [
  ['afilias.info', 3400000], // Afilias plc
  ['blockstack.com', 408000], // Blockstack
  ['brave.com', 3400000], // Brave
  ['cloudflare.com', 6800000], // Cloudflare
  ['darksi.de', 608957], // Individual
  ['datprotocol.com', 405970], // Dat Project
  ['debian.net', 1194838], // Reproducible Builds Debian
  ['dnscrypt.info', 202985], // DNScrypt
  ['eff.com', 710448], // Electronic Frontier Foundation
  ['eth.ens.domains', 136000], // ENS
  ['gnu.gplv3.com', 1194838], // GNU
  ['gnunet.org', 136000], // GNUnet
  ['godaddy', 2720000], // Godaddy
  ['icann.org', 24480000], // ICANN
  ['keybase.io', 3400000], // Keybase
  ['m-d.net', 1041987], // Individual
  ['marples.name', 202985], // openresolv
  ['mozilla.com', 608955], // Mozilla Foundation
  ['namecheap.com', 2720000], // Namecheap
  ['nlnetlabs.nl', 1194838], // Unbound
  ['numcalc.com', 710448], // Individual
  ['pir.org', 3400000], // Public Internet Registry
  ['riseup.net', 202985], // Riseup Labs
  ['tor.torproject.com', 1194838], // Tor Project
  ['ubuntu.com', 710448], // Ubuntu
  ['verisign', 6800000], // Verisign
  ['webtorrent.io', 405970], // WebTorrent LLC
];

// generic TLD
// requires update - https://en.wikipedia.org/wiki/Sponsored_top-level_domain
const TLD = [
  'arpa',
  'com',
  'edu',
  'gov',
  'int',
  'mil',
  'net',
  'org'
];

// country code TLD
const CCTLD = (() => {
  const data = fs.readFileSync(TLD_PATH, 'utf8');
  const lines = data.split('\n');
  const result = [];

  for (const line of lines) {
    const name = line.trim().toLowerCase();

    if (name.length === 0)
      continue;

    if (name[0] === '#')
      continue;

    assert(name.length <= 63);

    // ccTLDs only!
    if (util.isCCTLD(name))
      result.push(name);
  }

  return result;
})();

const GTLD = (() => {
  const data = fs.readFileSync(TLD_PATH, 'utf8');
  const lines = data.split('\n');
  const result = [];

  for (const line of lines) {
    const name = line.trim().toLowerCase();

    if (name.length === 0)
      continue;

    if (name[0] === '#')
      continue;

    assert(name.length <= 63);

    // gTLDs only!
    if (util.isGTLD(name))
      result.push(name);
  }

  return result;
})();

const RTLD = (() => {
  const text = fs.readFileSync(ROOT_PATH, 'utf8');
  const records = fromZone(text);
  const set = new Set();
  const result = [];

  for (const rr of records) {
    if (countLabels(rr.name) !== 1)
      continue;

    const name = rr.name.toLowerCase();

    if (set.has(name))
      continue;

    set.add(name);

    result.push(trimFQDN(name));
  }

  return result;
})();

const ALEXA = (() => {
  const data = fs.readFileSync(ALEXA_PATH, 'utf8');
  const lines = data.split('\n');
  const result = [];

  let cur = 1;

  for (const line of lines) {
    const ln = line.trim().toLowerCase();

    if (ln.length === 0)
      continue;

    const items = ln.split(/\s*,\s*/);
    assert(items.length === 2);

    const [num, domain] = items;
    const rank = parseInt(num, 10);

    assert((rank >>> 0) === rank);

    // No idea why alexa does this.
    if (rank !== cur) {
      assert(rank > cur);
      console.error('Warning: rank inconsistency!');
      console.error('Rank %d is missing.', cur);
      cur = rank;
    }

    result.push(domain);
    cur += 1;
  }
  // Now Alexa doesn return 1M records. It returned around ~0.6M. So ignoring 1M check
  //assert(result.length === 1000000);

  return result;
})();

const WORDS = (() => {
  const data = fs.readFileSync(WORDS_PATH, 'utf8');
  const lines = data.split('\n');
  const result = [];

  for (const line of lines) {
    const word = line.trim();

    if (util.isHNS(word))
      result.push(word);
  }

  return result;
})();

fs.writeFileSync(
  Path.resolve(__dirname, 'names', 'blacklist.json'),
  JSON.stringify(BLACKLIST, null, 2) + '\n');

fs.writeFileSync(
  Path.resolve(__dirname, 'names', 'custom.json'),
  JSON.stringify(CUSTOM, null, 2) + '\n');

fs.writeFileSync(
  Path.resolve(__dirname, 'names', 'values.json'),
  JSON.stringify(VALUES, null, 2) + '\n');

fs.writeFileSync(
  Path.resolve(__dirname, 'names', 'tld.json'),
  JSON.stringify(TLD, null, 2) + '\n');

fs.writeFileSync(
  Path.resolve(__dirname, 'names', 'cctld.json'),
  JSON.stringify(CCTLD, null, 2) + '\n');

fs.writeFileSync(
  Path.resolve(__dirname, 'names', 'gtld.json'),
  JSON.stringify(GTLD, null, 2) + '\n');

fs.writeFileSync(
  Path.resolve(__dirname, 'names', 'rtld.json'),
  JSON.stringify(RTLD, null, 2) + '\n');

fs.writeFileSync(
  Path.resolve(__dirname, 'names', 'alexa.json'),
  JSON.stringify(ALEXA, null, 2) + '\n');

fs.writeFileSync(
  Path.resolve(__dirname, 'names', 'words.json'),
  JSON.stringify(WORDS, null, 2) + '\n');
