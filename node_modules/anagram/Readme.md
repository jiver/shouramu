
# anagram

  A simple anagram generation library for use with nodejs. Forked from [jeresig/trie-js](https://github.com/jeresig/trie-js) by John Resig.

## Installation

	$ npm install anagram

## Examples

```js
var anagram = require('anagram');

anagram.init('../dict/twl06.js', function(err) {
    if (err) throw err;
    anagram.findAnagrams('dog', function(err, anagrams) {
    	console.log('`%s`: found %d anagrams', anagrams.input, anagrams.count);
    	console.log(anagrams);
    });
});
```

## Executables

  anagram comes packed with two executables: `anagram` and `anagram-build`

```shell
$ anagram-build -f dict/twl06.txt > dict/twl06.js

$ anagram -d dict/twl06.js -w anagr?m
```

## Running tests

  Install development dependencies:
  
    $ npm install -d

  Run the tests:

    $ npm test

## License

Copyright (c) 2012 Ryan Nauman

MIT Licensed