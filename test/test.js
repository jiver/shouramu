var sample = "strength";
var valid_words = extract_english_words(get_subwords(sample,3),build_dictionary());
console.log(valid_words);


function build_dictionary() {
	var fs = require('fs');
	var array = fs.readFileSync('dict.txt').toString().split("\r\n");
	return array;
}

function extract_english_words(str_arr,dict){
    var str;
    var arr = [];
    for (str in str_arr){
        if (dict.indexOf(str_arr[str]) > -1) {
            arr.push(str_arr[str]);
        }    
    }
    return arr;    
}

function get_subwords(str,floor){
    var i = floor;
    var subwords = [];
    for(;i<str.length+1;i++){
        var result = permutations(str,i);
        var word;
        for (word in result) {
            subwords.push(result[word]);
        }
    }
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