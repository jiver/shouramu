;
jQuery(function($){    
    'use strict';

    /**
     * All the code relevant to Socket.IO is collected in the IO namespace.
     *
     * @type {{init: Function, bindEvents: Function, onConnected: Function, onNewGameCreated: Function, playerJoinedRoom: Function, beginNewGame: Function, onNewWordData: Function, hostCheckAnswer: Function, gameOver: Function, error: Function}}
     */
    var IO = {

        /**
         * This is called when the page is displayed. It connects the Socket.IO client
         * to the Socket.IO server
         */
        init: function() {
            IO.socket = io.connect();
            IO.bindEvents();
        },

        /**
         * While connected, Socket.IO will listen to the following events emitted
         * by the Socket.IO server, then run the appropriate function.
         */
        bindEvents : function() {
            IO.socket.on('connected', IO.onConnected );
            IO.socket.on('newGameCreated', IO.onNewGameCreated );
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom );
            IO.socket.on('beginNewGame', IO.beginNewGame );
            IO.socket.on('hostCheckAnswer', IO.hostCheckAnswer);
            IO.socket.on('gameOver', IO.gameOver);
            IO.socket.on('error', IO.error );
            IO.socket.on('newEquationData', IO.onNewEquationData);
        },

        /**
         * The client is successfully connected!
         */
        onConnected : function() {
            // Cache a copy of the client's socket.IO session ID on the App
            App.mySocketId = IO.socket.socket.sessionid;
            // console.log(data.message);
        },

        /**
         * A new game has been created and a random game ID has been generated.
         * @param data {{ gameId: int, mySocketId: * }}
         */
        onNewGameCreated : function(data) {
            App.Host.gameInit(data);
        },

        /**
         * A player has successfully joined the game.
         * @param data {{playerName: string, gameId: int, mySocketId: int}}
         */
        playerJoinedRoom : function(data) {
            // When a player joins a room, do the updateWaitingScreen funciton.
            // There are two versions of this function: one for the 'host' and
            // another for the 'player'.
            //
            // So on the 'host' browser window, the App.Host.updateWiatingScreen function is called.
            // And on the player's browser, App.Player.updateWaitingScreen is called.
            App[App.myRole].updateWaitingScreen(data);
        },

        /**
         * Both players have joined the game.
         * @param data
         */
        beginNewGame : function(data) {
            App[App.myRole].gameCountdown(data);
        },

        /**
         * A new set of words for the round is returned from the server.
         * @param data
         */
       /* onNewWordData : function(data) {
            // Update the current round
            App.currentRound = data.round;

            // Change the word for the Host and Player
            App[App.myRole].newWord(data);
        },*/

        onNewEquationData : function(data) {
            App.currentRound = data.round;
            App[App.myRole].newEquation(data);
        },
        /**
         * A player answered. If this is the host, check the answer.
         * @param data
         */
        hostCheckAnswer : function(data) {
            if(App.myRole === 'Host') {
                App.Host.checkAnswer(data);
            }
        },

        /**
         * Let everyone know the game has ended.
         * @param data
         */
        gameOver : function(data) {
            App[App.myRole].endGame(data);
        },

        /**
         * An error has occurred.
         * @param data
         */
        error : function(data) {
            alert(data.message);
        }

    };

    var App = {

        /**
         * Keep track of the gameId, which is identical to the ID
         * of the Socket.IO Room used for the players and host to communicate
         *
         */
        gameId: 0,

        /**
         * This is used to differentiate between 'Host' and 'Player' browsers.
         */
        myRole: '',   // 'Player' or 'Host'

        /**
         * The Socket.IO socket object identifier. This is unique for
         * each player and host. It is generated when the browser initially
         * connects to the server when the page loads for the first time.
         */
        mySocketId: '',

        /**
         * Identifies the current round. Starts at 0 because it corresponds
         * to the array of word data stored on the server.
         */
        currentRound: 0,

        timer: 0,

        /* *************************************
         *                Setup                *
         * *********************************** */

        /**
         * This runs when the page initially loads.
         */
        init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

            // Initialize the fastclick library
            FastClick.attach(document.body);
        },

        /**
         * Create references to on-screen elements used throughout the game.
         */
        cacheElements: function () {
            App.$doc = $(document);

            // Templates
            App.$gameArea = $('#gameArea');
            App.$templateIntroScreen = $('#intro-screen-template').html();
            App.$templateNewGame = $('#create-game-template').html();
            App.$templateJoinGame = $('#join-game-template').html();
			App.$templateH2p = $('#h2p-template').html();
            App.$hostGame = $('#host-game-template').html();
        },

        /**
         * Create some click handlers for the various buttons that appear on-screen.
         */
        bindEvents: function () {
            // Host
            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);
			App.$doc.on('click', '#btnH2p', App.Host.onH2pClick);
            // Player
            App.$doc.on('click', '#btnJoinGame', App.Player.onJoinClick);
            App.$doc.on('click', '#btnStart',App.Player.onPlayerStartClick);
            //App.$doc.on('click', '.btnAnswer',App.Player.onPlayerAnswerClick);
            App.$doc.on('click', '#btnPlayerRestart', App.Player.onPlayerRestart);
            //App.$doc.on('mousedown', '#RecordButton', App.Player.resumeRecord);
            //App.$doc.on('mouseup', '#RecordButton', App.Player.pauseRecord);
            App.$doc.on('click', '#SubmitGuessButton', App.Player.submitGuess2);
            
           /* $( "#RecordButton" ).onmousedown = function(event) {
                App.Player.resumeRecord;
            }

            $( "#RecordButton" ).onmouseup = function(event) {
                App.Player.pauseRecord;
            }*/

            /*window.ondevicemotion = function(event) {
                console.log(event);  
                App.Player.onAnswerDeviceMotion(event);         
            }*/

            var commands = {
                    'go *word_guess': function (word_guess) {
                           App.Player.submitGuess(word_guess);
                        }
                };

            annyang.addCommands(commands);
            
                
        },

        /* *************************************
         *             Game Logic              *
         * *********************************** */

        /**
         * Show the initial Best Game Ever Title Screen
         * (with Start and Join buttons)
         */
        showInitScreen: function() {
            App.$gameArea.html(App.$templateIntroScreen);
            App.doTextFit('.title');
        },


        /* *******************************
           *         HOST CODE           *
           ******************************* */
        Host : {

            /**
             * Contains references to player data
             */
            players : [],

            /**
             * Flag to indicate if a new game is starting.
             * This is used after the first game ends, and players initiate a new game
             * without refreshing the browser windows.
             */
            isNewGame : false,

            /**
             * Keep track of the number of players that have joined the game.
             */
            numPlayersInRoom: 0,

            /**
             * A reference to the correct answer for the current round.
             */

            validWordsArray : [],

            validWordsState : [],
            
            longestWordsArray : [],

            /**
             * Handler for the "Start" button on the Title Screen.
             */
            onCreateClick: function () {
                // console.log('Clicked "Create A Game"');
                
                IO.socket.emit('hostCreateNewGame');

            },

            /**
             * The Host screen is displayed for the first time.
             * @param data{{ gameId: int, mySocketId: * }}
             */
            gameInit: function (data) {
                App.gameId = data.gameId;
                App.mySocketId = data.mySocketId;
                App.myRole = 'Host';
                App.Host.numPlayersInRoom = 0;
                App.Host.maxPlayers = 0;

                while (App.Host.maxPlayers <= 1) {
                App.Host.maxPlayers = prompt("Enter number of players [2-4]: ", "<number of players here>");
                alert("You have entered: " + App.Host.maxPlayers );
                }

                App.Host.displayNewGameScreen();
                // console.log("Game started with ID: " + App.gameId + ' by host: ' + App.mySocketId);
            },

			 /**
             * Handler for H2P .
             */
            onH2pClick: function () {
           
                App.$gameArea.html(App.$templateH2p);
                //IO.socket.emit('hostCreateNewGame');

            },
			
			
			
            /**
             * Show the Host screen containing the game URL and unique game ID
             */
            displayNewGameScreen : function() {
                // Fill the game screen with the appropriate HTML
                App.$gameArea.html(App.$templateNewGame);

                // Display the URL on screen
                $('#gameURL').text(window.location.href);
                App.doTextFit('#gameURL');

                // Show the gameId / room id on screen
                $('#spanNewGameCode').text(App.gameId);
            },

            /**
             * Update the Host screen when the first player joins
             * @param data{{playerName: string}}
             */
            updateWaitingScreen: function(data) {
                // If this is a restarted game, show the screen.
                if ( App.Host.isNewGame ) {
                    App.Host.displayNewGameScreen();
                }
                // Update host screen
                $('#playersWaiting')
                    .append('<p/>')
                    .text('Player ' + data.playerName + ' joined the game.');
                // Store the new player's data on the Host.
                App.Host.players.push(data);

                // Increment the number of players in the room
                App.Host.numPlayersInRoom += 1;

                // If max number of players have joined, you may already start the game!
                if (App.Host.numPlayersInRoom == App.Host.maxPlayers) {
                    // console.log('Room is full. Almost ready!');

                    // Let the server know that two players are present.
                    IO.socket.emit('hostRoomFull',App.gameId);
                } 
            },

            /**
             * Show the countdown screen
             */
            gameCountdown : function() {

                // Prepare the game screen with new HTML
                App.$gameArea.html(App.$hostGame);
                App.doTextFit('#MathEqn');

                // Begin the on-screen countdown timer
                var $secondsLeft = $('#MathEqn');
                App.countDown( $secondsLeft, 5, function(){
                    IO.socket.emit('hostCountdownFinished', App.gameId);
                });

                // Display the players' names and scores on screen
                for (var i = 0; i < App.Host.maxPlayers; ++i) {
                    $('#playerScores')
                        .append('<div  id="player' + (i+1) + 'Score" class="playerScore">' + 
						'<div class="score" id = "' + App.Host.players[i].mySocketId + '">0</div>' + 
                        '<span class="playerName">' + App.Host.players[i].playerName + '</span>' +
                        '</div>');
                }
            },

            newEquation : function(data) {

                $('#MathEqn').text(data.puzzleWord);
                App.doTextFitMax('#MathEqn');

                App.Host.updateEquation(data.validWordsArray, data.validWordsState);

                var $secondsLeft = $('#TIMER');
                App.countDown2( $secondsLeft, 30, function(){
                    // Prepare data to send to the server
                    App.currentRound += 1;
                            var data = {
                                gameId : App.gameId,
                                round : App.currentRound
                            };

                    IO.socket.emit('hostNextRound', data);
                });


                // Update the data for the current round
                App.Host.currentRound = data.round;
                App.Host.validWordsArray = data.validWordsArray;
                App.Host.validWordsState = data.validWordsState;
                App.Host.longestWordsArray = data.longestWordsArray;
            },

            updateEquation: function(validWordsArray, validWordsState) {
               /*
                var temmmpp = "";
                for(var i=0;i<validWordsArray.length;i++){
                    if(validWordsState[i]) {
                        temmmpp += validWordsArray[i] + "<br>";
                    }else{
                        temmmpp += validWordsArray[i].replace(/\w/gi, "_ ") + "<br>";
                    }
                }
                
                $('#ValidWords').html(temmmpp);
                App.doTextFit('#ValidWords');
                */
                var temp=[];
                for(var i=0;i<validWordsArray.length;i++){
                    if(validWordsState[i]) {
                        temp[i] = validWordsArray[i] ;
                    }else{
                        temp[i] = validWordsArray[i].replace(/\w/gi, "♪");
                    }
                }

                // Create an unordered list element
                var $list = $('<ul/>').attr('id','triple');

                // Insert a list item for each word in the word list
                // received from the server.
                $.each(temp, function(index){
                    var $i_list = $('<li/>');

                    for(var i=0;i < this.length;i++){
                        var $butttooon = $('<button/>')
                                 //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                        .val(this[i])               //  <ul> <li> <button class='btnAnswer' value='word'> </button> </li> </ul>
                        .html(this[i])

                        if(validWordsState[index]){
                            $butttooon.addClass('animated');
                            $butttooon.addClass('tada');
                            $butttooon.addClass('tileButtonSolved');
                        }else{
                            $butttooon.addClass('tileButton');
                        }
                        $i_list.append($butttooon);
                    }
                    $list.append( $i_list);
                });

                $('#ValidWords').html($list);
                //App.doTextFit('#ValidWords');
            },

            /**
             * Check the answer clicked by a player.
             * @param data{{round: *, playerId: *, answer: *, gameId: *}}
             */
            checkAnswer : function(data) {
                // Verify that the answer clicked is from the current round.
                // This prevents a 'late entry' from a player whos screen has not
                // yet updated to the current round.

                if (data.round === App.currentRound){

                    console.log( App.Host.validWordsArray);
                    console.log( App.Host.validWordsState);

                    // Get the player's score
                    var $pScore = $('#' + data.playerId);

                    // check against valid words
                    var answer_index = App.Host.validWordsArray.indexOf(data.answer.toLowerCase());
                    console.log("Index of"+data.answer+": "+answer_index);

                    // Advance player's score if it is correct
                    if( answer_index >= 0) {

                        // Add 5 to the player's score
                        $pScore.text( +$pScore.text() +  data.answer.length);
                        App.Host.validWordsState[answer_index] = 1;

                        //animate
                        //$('#' + data.playerId).addClass('animated bounceOutLeft');

                        answer_index = App.Host.longestWordsArray.indexOf(data.answer.toLowerCase())

                        App.Host.updateEquation(App.Host.validWordsArray, App.Host.validWordsState);

                        if ( answer_index >= 0) {
                            $pScore.text( +$pScore.text() +  data.answer.length );

                            console.log("Index of "+data.answer+": "+answer_index);
                            // Advance the round
                            App.currentRound += 1;

                            // Prepare data to send to the server
                            var data = {
                                gameId : App.gameId,
                                round : App.currentRound
                            }

                            clearInterval(App.timer);
                            // Notify the server to start the next round.
                            IO.socket.emit('hostNextRound',data);
                        }

                    }
                }
            },


            /**
             * All 10 rounds have played out. End the game.
             * @param data
             */
            endGame : function(data) {

                // Determine who wins the game!
                var WinnerScore = 0;
                var WinnerName = '';
                var TempWinnerScore = 0;
                var TempWinnerName = '';
                var lalaScore = 0;
                var WinnerIndex = 0;
				var isTie = 0;
                var tempWinnerScores = [];

                for (var i = 0; i < App.Host.maxPlayers; ++i) {
                    TempWinnerScore = parseInt($('#player'+ (i+1) + 'Score').find('.score').text());
                    if(TempWinnerScore > lalaScore){
                        lalaScore = TempWinnerScore;
                        WinnerIndex = i;  
                    }
                    tempWinnerScores.push(TempWinnerScore);
                }
           
                if ( App.getDuplicatedValue(tempWinnerScores, lalaScore) == lalaScore ) {
                    isTie = 1;
                }

				if(isTie == 1){
					for (var i = 0; i < App.Host.maxPlayers; ++i) {
						if(parseInt($('#player'+ (i+1) + 'Score').find('.score').text()) == lalaScore){
							WinnerName = WinnerName + $('#player'+ (i+1) + 'Score').find('.playerName').text() + ' ';
						}
					}
					//$('#MathEqn').text( 'We have liver between: ' + WinnerName + ' with '  + lalaScore + ' points!!');
                    $('#MathEqn').text( 'We have liver!');
				} else {
					WinnerName = $('#player'+ (WinnerIndex+1) + 'Score').find('.playerName').text();
					$('#MathEqn').text( 'Player ' + WinnerName + ' Wins with '  + lalaScore + ' points!!');
				}

                    console.log('!! WinnerName: ' + WinnerName);
                    console.log('!! WinnerScore' + WinnerScore);

                App.doTextFit('#MathEqn');

                // Reset game data
                App.Host.numPlayersInRoom = 0;
                App.Host.isNewGame = true;
            },

            /**
             * A player hit the 'Start Again' button after the end of a game.
             */
            restartGame : function() {
                App.$gameArea.html(App.$templateNewGame);
                $('#spanNewGameCode').text(App.gameId);

                // Reset game data
                App.Host.numPlayersInRoom = 0;
                App.Host.isNewGame = true;
            }
        },


        /* *****************************
           *        PLAYER CODE        *
           ***************************** */

        Player : {

            /**
             * A reference to the socket ID of the Host
             */
            hostSocketId: '',

            /**
             * The player's name entered on the 'Join' screen.
             */
            myName: '',

            ans: '',

            /**
             * Click handler for the 'JOIN' button
             */
            onJoinClick: function () {
                // console.log('Clicked "Join A Game"');

                // Display the Join Game HTML on the player's screen.
                App.$gameArea.html(App.$templateJoinGame);
            },

            /**
             * The player entered their name and gameId (hopefully)
             * and clicked Start.
             */
            onPlayerStartClick: function() {
                // console.log('Player clicked "Start"');

                // collect data to send to the server
                var data = {
                    gameId : +($('#inputGameId').val()),
                    playerName : $('#inputPlayerName').val()
                };

                if(data.playerName != '') {
                // Send the gameId and playerName to the server
                IO.socket.emit('playerJoinGame', data);

                // Set the appropriate properties for the current player.
                App.myRole = 'Player';
                App.Player.myName = data.playerName;
                } else {
                    $('#playerWaitingMessage')
                        .append('<p/>')
                        .text('Please input your name.');
                }
            },

            /**
             *  Click handler for the "Start Again" button that appears
             *  when a game is over.
             */
            onPlayerRestart : function() {
                var data = {
                    gameId : App.gameId,
                    playerName : App.Player.myName
                }
                IO.socket.emit('playerRestart',data);
                App.currentRound = 0;
                $('#gameArea').html;
				//App.$gameArea.html(App.$templateWaiting);
            },

            /**
             * Display the waiting screen for player 1
             * @param data
             */
            updateWaitingScreen : function(data) {
                if(IO.socket.socket.sessionid === data.mySocketId){
                    App.myRole = 'Player';
                    App.gameId = data.gameId;
                    App.playerName = data.playerName;

                    $('#playerWaitingMessage')
                        .append('<p/>')
                        .text(data.playerName + ' joined Game ' + data.gameId + '. Please wait for game to begin.');
                }
            },

            /**
             * Display 'Get Ready' while the countdown timer ticks down.
             * @param hostData
             */
            gameCountdown : function(hostData) {
                App.Player.hostSocketId = hostData.mySocketId;
                $('#gameArea')
                    .html('<div class="gameOver">Get Ready!</div>');
            },

            newEquation : function(data) {
                // Create an unordered list element
                /*var $list = $('<ul/>').attr('id','ulAnswers');

                // Insert a list item for each word in the word list
                // received from the server.
                $.each(data.choices, function(){
                    $list                                //  <ul> </ul>
                        .append( $('<li/>')              //  <ul> <li> </li> </ul>
                            .append( $('<button/>')      //  <ul> <li> <button> </button> </li> </ul>
                                .addClass('btnAnswer')   //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .addClass('btn')         //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .val(this)               //  <ul> <li> <button class='btnAnswer' value='word'> </button> </li> </ul>
                                .html(this)              //  <ul> <li> <button class='btnAnswer' value='word'>word</button> </li> </ul>
                            )
                        )
                });*/
                
                annyang.start();
                

                navigator.vibrate(1000);

                // Insert the list onto the screen.
                $('#gameArea').html('<div class="gameOver" ><input type="text" id="SubmitGuessText"/><input type="button" value="Submit" id="SubmitGuessButton" /><div id="WordGuess">Get Ready!</div></div>');
            },

            /*resumeRecord: function() {
                console.log("Voice resume!");
                annyang.resume();
            },

            pauseRecord: function() {
                console.log("Voice stop!");
                annyang.pause();
            },*/

            submitGuess: function(word_guess) {
                App.Player.ans = word_guess;
                var data = {
                    gameId: App.gameId,
                    playerId: App.mySocketId,
                    answer: App.Player.ans,
                    round: App.currentRound
                }         
                console.log(App.mySocketId+ " " + App.Player.ans + " " + App.currentRound);
                $('#WordGuess').text("Your Guess: " + word_guess);
                IO.socket.emit('playerAnswer',data);           
            },

            submitGuess2: function() {
                App.Player.ans = $("#SubmitGuessText").val();
                var data = {
                    gameId: App.gameId,
                    playerId: App.mySocketId,
                    answer: App.Player.ans,
                    round: App.currentRound
                }         
                console.log(App.mySocketId+ " " + App.Player.ans + " " + App.currentRound);
                $('#WordGuess').text("Your Guess: " + App.Player.ans);
                IO.socket.emit('playerAnswer',data);           
            },

            /**
             * Show the "Game Over" screen.
             */
            endGame : function() {
                $('#gameArea')
                    .html('<div class="gameOver">Game Over!</div>')
                    .append(
                        // Create a button to start a new game.
                        $('<button>Start Again</button>')
                            .attr('id','btnPlayerRestart')
                            .addClass('btn')
                            .addClass('btnGameOver')
                    );
            }
        },


        /* **************************
                  UTILITY CODE
           ************************** */

        /**
         * Display the countdown timer on the Host screen
         *
         * @param $el The container element for the countdown timer
         * @param startTime
         * @param callback The function to call when the timer ends.
         */
        countDown : function( $el, startTime, callback) {

            // Display the starting time on the screen.
            $el.text(startTime);
            App.doTextFit('#MathEqn');

            // console.log('Starting Countdown...');

            // Start a 1 second timer
            var timer = setInterval(countItDown,1000);

            // Decrement the displayed timer value on each 'tick'
            function countItDown(){
                startTime -= 1
                $el.text(startTime);
                App.doTextFit('#MathEqn');

                if( startTime <= 0 ){
                    // console.log('Countdown Finished.');

                    // Stop the timer and do the callback.
                    clearInterval(timer);
                    callback();
                    return;
                }
            }

        },

        countDown2 : function( $el, startTime, callback) {

            // Display the starting time on the screen.
            $el.text(startTime);
            App.doTextFit('#TIMER');

            // console.log('Starting Countdown...');

            // Start a 1 second timer
            App.timer = setInterval(countItDown,1000);

            // Decrement the displayed timer value on each 'tick'
            function countItDown(){
                startTime -= 1
                $el.text(startTime);
                App.doTextFit('#TIMER');

                if( startTime <= 0 ){
                    // console.log('Countdown Finished.');

                    // Stop the timer and do the callback.
                    clearInterval(App.timer);
                    callback();
                    return;
                }
            }

        },

        /**
         * Make the text inside the given element as big as possible
         * See: https://github.com/STRML/textFit
         *
         * @param el The parent element of some text
         */
        doTextFit : function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz:true,
                    alignVert: false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:80
                }
            );
        },
		
		doTextFitMax : function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:150
                }
            );
        },

        getDuplicatedValue : function(array, maxValue) {
            var valuesSoFar = [];
            for (var i = 0; i < array.length; ++i) {
                var value = array[i];
                if (valuesSoFar.indexOf(value) !== -1) {
                    return value;
                }
                if (value == maxValue) {
                    valuesSoFar.push(value);
                }
            }
        }

    };

    IO.init();
    App.init();

}($));
