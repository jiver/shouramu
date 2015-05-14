console.time("Runtime");
var source_words = get_game_word();
//var game_word = source_words[Math.floor(Math.random() * (source_words.length - 1))];
var game_word = "scratch";
var jumble_word = get_jumble_word(game_word);
var valid_words = extract_english_words(get_subwords(game_word,3),build_dictionary());
console.log(jumble_word);
console.log(valid_words);
console.timeEnd("Runtime");

function get_game_word() {
    var fs = require('fs');
    source_words = fs.readFileSync('sources.txt').toString().split("\r\n");
    return source_words;
}

function get_jumble_word(str){
    random_words = permutations(str,str.length);
    return random_words[Math.floor(Math.random() * (random_words.length - 1) + 1)];
}

function init_word_state(arr) {
    var arr = [];
    for(var i = 0;i<arr.length;i++) {
        arr.push(0);
    }
    return arr;
}

function build_dictionary() {
	var fs = require('fs');
	return fs.readFileSync('dict.txt').toString().split("\r\n");
}

function extract_english_words(str_arr,dict){
    var str;
    var arr = [];
    console.time("Extr");
    for (str in str_arr){
        if (dict.indexOf(str_arr[str]) > -1) {
            arr.push(str_arr[str]);
        }    
    }
    console.timeEnd("Extr");
    return arr;    
}

function get_subwords(str,floor){
    var i = floor;
    var subwords = [];
    console.time("Sub: " + floor);
    for(;i<str.length+1;i++){
        var result = permutations(str,i);
        var word;
        for (word in result) {
            subwords.push(result[word]);
        }
    }
    console.timeEnd("Sub: " + floor);
    return subwords;
}

function permutations(array, r) {                                                  
    // Algorythm copied from Python `itertools.permutations`.                      
    var n = array.length;                                                          
    if (r === undefined) {                                                         
        r = n;                                                                     
    }                                                                              
    if (r > n) {                                                                   
        return;                                                                    
    }                                                                              
    var indices = [];                                                              
    for (var i = 0; i < n; i++) {                                                  
        indices.push(i);                                                           
    }                                                                              
    var cycles = [];                                                               
    for (var i = n; i > n - r; i-- ) {                                             
        cycles.push(i);                                                            
    }                                                                              
    var results = [];                                                              
    var res = new Array();                                                                  
    for (var k = 0; k < r; k++) {                                                  
        res.push(array[indices[k]]);                                               
    }                                                                              
    results.push(res.join(""));                                                             
                                                                                   
    var broken = false;                                                            
    while (n > 0) {                                                                
        for (var i = r - 1; i >= 0; i--) {                                         
            cycles[i]--;                                                           
            if (cycles[i] === 0) {                                                 
                indices = indices.slice(0, i).concat(                              
                    indices.slice(i+1).concat(
                        indices.slice(i, i+1)));             
                cycles[i] = n - i;                                                 
                broken = false;                                                    
            } else {                                                               
                var j = cycles[i];                                                 
                var x = indices[i];                                                
                indices[i] = indices[n - j];                          
                indices[n - j] = x;                                   
                var res = [];
                for (var k = 0; k < r; k++) {                        
                    res.push(array[indices[k]]);                                   
                }
                results.push(res.join(""));                                                 
                broken = true;                                                     
                break;                                                             
            }                                                                      
        }                                                                          
        if (broken === false) {                                                    
            break;                                                                 
        }
    }
    return unique(results);                                                                
}


function unique(arr) {
    var u = {}, a = [];
    for(var i = 0, l = arr.length; i < l; ++i){
        if(!u.hasOwnProperty(arr[i])) {
            a.push(arr[i]);
            u[arr[i]] = 1;
        }
    }
    return a;
}