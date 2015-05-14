var dict,
	options = {
		maxWildcards: 3,
		format: 'raw'
	};

function renderDict(txt) {
	return (dict = eval( "(" + txt + ")" ));
}

function createDictionary(path, suppress) {
    
	var txt = require('fs').readFileSync(path, 'utf8'),
		words = txt.replace(/\n/g, '').split(' '),
		trie = {},
		end = {},
		keepEnd = {},
		endings = [0],
		reserved = ["abstract", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue", "debugger", "default", "delete", "do", "double", "else", "enum", "export", "extends", "false", "final", "finally", "float", "for", "function", "goto", "if", "implements", "import", "in", "instanceof", "int", "interface", "long", "native", "new", "null", "package", "private", "protected", "public", "return", "short", "static", "super", "switch", "synchronized", "this", "throw", "throws", "transient", "true", "try", "typeof", "var", "void", "volatile", "while", "with"],
		ret,
		printResult = (suppress) ? false : true;

	// Build a simple Trie structure
	for (var i = 0, l = words.length; i < l; i++) {
		var word = words[i],
			letters = word.split(""),
			cur = trie;

		for (var j = 0; j < letters.length; j++) {
			var letter = letters[j],
				pos = cur[letter];

			if (pos == null) {
				cur = cur[letter] = j === letters.length - 1 ? 0 : {};

			} else if (pos === 0) {
				cur = cur[letter] = { $: 0 };

			} else {
				cur = cur[letter];
			}
		}
	}

	ret = JSON.stringify(trie).replace(/"/g, "");

	for (var i = 0; i < reserved.length; i++) {
		ret = ret.replace(new RegExp("([{,])(" + reserved[i] + "):", "g"), "$1'$2':" );
	}

	if (printResult) console.log(ret);
	
	return ret;
}

function findUniqueLetters(word){
	
	var uniqueLetters = [],
		letters = word.split(''),
		i = 0,
		l = letters.length;
			
	for (; i < l; i++)
	{
		if (uniqueLetters.indexOf(letters[i]) === -1)
			uniqueLetters.push( letters[i] );
	}
	
	return uniqueLetters.sort();
}

function findLetterFreqs(word){

	var letters = word.split(''),
		i = 0,
		l = letters.length,
		letterFreq = {};

	for (; i < l; i++)
	{
		if (letterFreq[ letters[i] ])
			letterFreq[ letters[i] ]++;
		else
			letterFreq[ letters[i] ] = 1;
	}

	return letterFreq;
}

function decrementOrDelete(node, collection) {
	collection.total--;
	
	if (collection[node] > 1)
		collection[node]--;
	else
		delete collection[node];
}

function isTrailAccurate(trail, cur) {
	var letters = trail.split(''),
		i = 0,
		l = trail.length,
		d = null;
		
	for (; i < l; i++) {
		d = (d) ? d[letters[i]] : dict[letters[i]];
	}
	
	console.log((d === cur) ? 'Trail is accurate' : 'Trail is INACCURATE');
}

function findAnagrams(rack, userOptions, callback) {
    
	var uniqueLetters = findUniqueLetters(rack),
		ul = uniqueLetters.length,
		letterFreq = findLetterFreqs(rack),
		groupedMatches = {},
		meta = { count: 0, input: '', len: 0, groups: [], items: {} },
		debug = false,
		debugTrail = false,
		recurse = true,
		i = 0,
		extend = require("node.extend"),
		mergedOptions = extend({}, options, userOptions);
		
	// reduce wildcards if necessary
	if (letterFreq['?'] && letterFreq['?'] > mergedOptions.maxWildcards) {
        letterFreq['?'] = mergedOptions.maxWildcards;
		rack = rack.replace(/\?/g, '');
		for (;i < mergedOptions.maxWildcards; i++) rack += '?';
	}

    try {
            
		// the recursion point
		function searchTrie(freq, cur, trail)
		{
			for ( var node in cur ) {

				var isWildcard = (freq[node] === undefined && freq['?'] !== undefined);

				if ( freq.total > 0 && ( freq[node] !== undefined || ( isWildcard && node !== '$' ) ) ) {

					// copy trail otherwise it will innacurately bleed into recursions for non-matches
					// deep copy freq otherwise it will innacurately bleed into recursions for non-matches
					var localTrail = trail + node,
						localFreq = extend(true, {}, freq),
						localTrailLength = localTrail.replace(/<\/*em>|\*/g, '').length;

					if (isWildcard) {

						// format
						switch (mergedOptions.format) {
							case 'html':
								localTrail = trail + '<em>' + node + '</em>';
								break;
							case 'markdown':
							case 'md':
								localTrail = trail + '*' + node + '*';
								break;
							default:
								localTrail = trail + node;
						}

						decrementOrDelete('?', localFreq);

					} else {
						decrementOrDelete(node, localFreq);
					}

					var val = cur[ node ];

					// valid anagram?
					if (val === 0 || val.$ === 0) {

						if (groupedMatches[localTrailLength] === undefined) groupedMatches[localTrailLength] = [];
						groupedMatches[localTrailLength].push({ w: localTrail.replace(/<\/?em>|\*/g, ''), f: localTrail });
						meta.count++;

					}

					// reeecurse
					if (localFreq.total > 0 && recurse) searchTrie(localFreq, val, localTrail);

				}
			}
		}

    	meta.input = rack;
        
		meta.len = letterFreq.total = rack.length;

		searchTrie( letterFreq, dict, '');

		meta.items = groupedMatches;

		callback(null, meta);
		
    } catch (e) {
        callback(e, null);
    }
	return false;
}

// Allow alternative wildcard indicators for url/cli safety
function preProcessRack(rack) {
  return rack.replace(/[\^\-_]/g, '?');
}

function init(pathToDictionary, callback) {
	var fs = require('fs');
	fs.readFile(pathToDictionary, 'utf8', function(err, data) {
		if (err) return callback(err);
		renderDict(data);
		callback();
	});
};

exports.init = init;

exports.createDictionary = createDictionary;

exports.cliWildcardHelper = function cliWildcardHelper(rack) {
    return preProcessRack(rack);
};

exports.findAnagrams = function flexibleFindAnagrams(rack, argh, callback) {
    rack = preProcessRack(rack);
    switch (typeof argh) {
    	case 'function':
    		findAnagrams(rack, null, argh);
    		break;
    	case 'object':
    		findAnagrams(rack, argh, callback);
    		break;
    	default:
    	    callback(new Error('Unexpected parameters'), null);
    		break;
    }
};