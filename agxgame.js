var io;
var io;
var gameSocket;
// Create moniker for random name generator
var moniker = require('moniker');
var bitly = require('bitly');
var MAX_ROUNDS = 10

/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
    gameSocket.emit('connected', { message: "You are connected!" });

    // Host Events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostRoomFull', hostPrepareGame);
    gameSocket.on('hostCountdownFinished', hostStartGame);
    gameSocket.on('hostNextRound', hostNextRound);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerAnswer', playerAnswer);
    gameSocket.on('playerRestart', playerRestart);
}

/* *******************************
   *                             *
   *       HOST FUNCTIONS        *
   *                             *
   ******************************* */

/**
 * The 'START' button was clicked and 'hostCreateNewGame' event occurred.
 */
function hostCreateNewGame() {
    // Create a unique Socket.IO Room
    var thisGameId = ( Math.random() * 10000 ) | 0;
    //var moniker_names = moniker.generator([moniker.adjective, moniker.noun]);
    //var thisGameId = moniker_names.choose();

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});

    // Join the Room and wait for the players
    this.join(thisGameId.toString());
};

/*
 * Two players have joined. Alert the host!
 * @param gameId The game ID / room ID
 */
function hostPrepareGame(gameId) {
    var sock = this;
    var data = {
        mySocketId : sock.id,
        gameId : gameId
    };
    //console.log("All Players Present. Preparing game...");
    io.sockets.in(data.gameId).emit('beginNewGame', data);
}

/*
 * The Countdown has finished, and the game begins!
 * @param gameId The game ID / room ID
 */
function hostStartGame(gameId) {
    console.log('Game Started.');
    sendEquation(0,gameId);
};

/**
 * A player answered correctly. Time for the next word.
 * @param data Sent from the client. Contains the current round and gameId (room)
 */
function hostNextRound(data) {
    console.log(data.round);
        console.log(data.gameId);
    if(data.round < MAX_ROUNDS ){
        // Send a new equation to the user

        sendEquation(data.round, data.gameId);
    } else {
        // If the current round exceeds the number of words, send the 'gameOver' event.
        io.sockets.in(data.gameId).emit('gameOver',data);
    }
}
/* *****************************
   *                           *
   *     PLAYER FUNCTIONS      *
   *                           *
   ***************************** */

/**
 * A player clicked the 'START GAME' button.
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {
    //console.log('Player ' + data.playerName + 'attempting to join game: ' + data.gameId );

    // A reference to the player's Socket.IO socket object
    var sock = this;

    // Look up the room ID in the Socket.IO manager object.
    var room = gameSocket.manager.rooms["/" + data.gameId];

    // If the room exists...
    if( room != undefined ){
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);

        //console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        // Emit an event notifying the clients that the player has joined the room.
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        // Otherwise, send an error message back to the player.
        this.emit('error',{message: "This room does not exist."} );
    }
}

/**
 * A player has tapped a word in the word list.
 * @param data gameId
 */
function playerAnswer(data) {
    // console.log('Player ID: ' + data.playerId + ' answered a question with: ' + data.answer);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}

/**
 * The game is over, and a player has clicked a button to restart the game.
 * @param data
 */
function playerRestart(data) {
    // console.log('Player: ' + data.playerName + ' ready for new game.');

    // Emit the player's data back to the clients in the game room.
    data.playerId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedRoom',data);
}

/* *************************
   *                       *
   *      GAME LOGIC       *
   *                       *
   ************************* */



function sendEquation(roundNumber, gameId) {
    var word_data = getNewAnagram(roundNumber);
    console.log(word_data);
    io.sockets.in(word_data.gameId).emit('newEquationData', word_data);
}

function getNewAnagram(roundNumber) {
    
    var temp = roundNumber%2;

	/*
    var valid_words = [
        ["plot","lop","lot","opt","pol","pot","top"],
        ["sword","words","rows","word","pol","pot","top"]
    ];
    var vword_state = [
        [0,0,0,0,0],
        [0,0,0,0,0,0,0]
    ];
    var longest_words = [
        ["plot"],
        ["sword","words"]
    ];
    var jumbled_word = [
        "tolp",
        "rowds"
    ]; 
 
     var anagramData = {
        validWordsArray: valid_words[temp],
        validWordsState: vword_state[temp],
        longestWordsArray: longest_words[temp],
        puzzleWord: jumbled_word[temp],
         round: roundNumber
     }
     return anagramData;
	*/
    
    
    var source_words = get_game_word();
    console.log(source_words);
    var rand = Math.floor(Math.random() * (source_words.length - 1)) % 47;
    console.log("RAND :"+ rand);
    var game_word = source_words[ rand ];
    //console.log(game_word);
    var jumble_word = shuffle_string(game_word);
    var valid_words = get_subwords(game_word);
    var longest_words = [game_word];
    var vword_states = init_word_state(valid_words.length);

    var anagramData = {
        validWordsArray: valid_words,
        validWordsState: vword_states,
        longestWordsArray: longest_words,
        puzzleWord: jumble_word,
        round: roundNumber
    }
    return anagramData;
    
}

function getNewEquation(roundNumber) {
    var operators = [ "+", "-", "*" ];
    var letterAnswers = [ "A", "B", "C" ];
    var operands = ["firstNumber","secondNumber","resultingNumber"];

    // randomize first and second number
    var a = Math.floor((Math.random()*10)+1);
    var b = Math.floor((Math.random()*10)+1);

    //randomize operator
    var operator = operators[Math.floor(Math.random()*operators.length)];

    var result;
    result = (operator == "+")? a + b : result;
    result = (operator == "-")? a - b : result;
    result = (operator == "*")? a * b : result;

    var guessArray = [ a, b, result ];
    var guessIndex = Math.floor(Math.random()*guessArray.length);
    var answer = guessArray[guessIndex];
    var blankField = operands[guessIndex];
    var choices = generateChoices(answer);

    var letterAnswer = letterAnswers[getIndex(choices, answer)];

    console.log("round:"+roundNumber);
    var equationData = {
        firstNumber: a,
        operator: operator,
        secondNumber: b,
        resultingNumber: result,
        answer: answer,
        blankField: blankField,
        choices: choices,
        round: roundNumber,
        letterAnswer: letterAnswer
    }
    return equationData;
}

function generateChoices(answer) {
    var choices = [];
    choices.push(answer);
    var randomChoice = Math.floor((Math.random()*10)+1);
    while (choices.length < 3) {
        if ( !existsInArray(choices,randomChoice)){
            choices.push(randomChoice);
        }
        randomChoice = Math.floor((Math.random()*10)+1);
    }
    return shuffle(choices);
}

function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function shuffle_string(str){
	var o = str.split("");
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o.join("");
}

function existsInArray(array, value) {
    for(var i=0;i<array.length;i++) {
        if (array[i] == value) {
            return true;
        }
    }
    return false;
}

function getIndex(array, value) {
    for(var i=0;i<array.length;i++) {
        if (array[i] == value) {
            return i;
        }
    }
    return false;
}

function get_game_word() {
    var fs = require('fs');
    return fs.readFileSync('test/sources.txt').toString().split(",");
}

function init_word_state(arr) {
    var arr = [];
    for(var i = 0;i<arr.length;i++) {
        arr.push(0);
    }
    return arr;
}

function get_subwords(str) {
	file = "test/words/" + str + ".txt";
	var fs = require('fs');
	return fs.readFileSync(file).toString().split(",");
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