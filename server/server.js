const snakeGame = require('./snakes.js');
const antiLeak = require('./donotleak.js');
const express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();

const allClients = [];
const allClientColors = [];
var totalClientCount = 0;
var game = {};
var clientRooms = {};
var rooms = [];

const clientPath = `${__dirname}/../client`;
console.log(`Serving static from ${clientPath}`);
app.use(express.static(clientPath));
/*mysql setup
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : antiLeak.sqlPassword,
	database : 'nodelogin'
});

const clientPath = `${__dirname}/../client`;
console.log(`Serving static from ${clientPath}`);

app.use(express.static(clientPath));
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

*/
httpServer = http.createServer(app);
const httpsServer = https.createServer({
		key: fs.readFileSync(`/etc/letsencrypt/live/diefettebrxnette.xyz/privkey.pem`),
		cert: fs.readFileSync(`/etc/letsencrypt/live/diefettebrxnette.xyz/fullchain.pem`)
}, app);
var io = require("socket.io")(httpServer, {});

//pick one of the colors from the pallet and remove it afterwards
function getRandomColor(item) {
	var randomNumb = Math.floor(Math.random() * item.colorPalet.length);
	var randomColor = item.colorPalet[randomNumb];
	item.colorPalet.splice(randomNumb, 1);
	return randomColor;
}
try{
	//connection handling
	io.on('connection', function (sock) {
  	//register new User
		totalClientCount += 1;
  	io.emit('connectionInit', totalClientCount, null);

  	//new message recieved, check if syn correct and share
  	sock.on('message', (text) => {
			return;
    	if (text == "") {
      	return;
    	}else{
      	io.brodcast('messge', text.replace(/>/g,"&#62;").replace(/</g,"&#60;"), sock.id);
    	}
  	});

  	//keydown event, update player pos
  	sock.on('clientBtnPressed', (btn, numb) =>{
    	if (sock.code == null) {
				return;
			}
			const lobby = game[sock.code];
			if (lobby == null) {
				return;
			}
			if(!lobby.roundRunning)
				return;
    	for (var i = 0; i < lobby.players.length; i++) {
      	if (lobby.players[i].numb == sock.number) {
						const player = lobby.players[i];
						if (!player.alive) {
							return;
						}
						//ability registry
          	if (btn == "leftBtn") {
            	player.leftBtnPressed();
          	}else if(btn == "rightBtn"){
            	player.rightBtnPressed();
          	}else if(btn == "abilityBtn"){

							if (lobby.activeAbilities[sock.number] == null) {
								return;
							}
							if (lobby.abilityTimeOut[sock.number] != null) {
								sock.emit('AbilityOnTimeOut');
								return;
							}

							lobby.abilityTimer(player.numb);
							const abilities = lobby.activeAbilities[player.numb];
							let index = -1;

							console.log(lobby.activeAbilities[player.numb]);
							abilities.forEach((item, i) => {
								if (item != "temp") {
									index = i;
								}
							});

							if (index == -1) {
								return;
							}

							if (lobby.activeAbilities[player.numb] != null) {
								if (typeof 'blubber' != typeof abilities[0]) {
									abilities.shift();
								}
							}

							lobby.activeAbilities[sock.number] = abilities;

							console.log('Player ' + sock.number + ' using abilities | ' + lobby.activeAbilities[sock.number]);
							const ability = lobby.activeAbilities[sock.number][index];
							console.log(ability);

							if(ability == null){
									return;
								}else if (ability == "speed") {
									player.useSpeed();
								}else if(ability == "slowness"){
									player.useSlowness();
								}else if(ability == "teleport"){
									player.useTeleport(lobby);
								}else if(ability == "cubic"){
									player.useCubic();
								}else if(ability == "randomdeath"){
									player.useRandomDeath(lobby, io, sock.code);
								}else if(ability == "curve"){
									player.useCurve();
								}else if(ability == "shootholes"){
									player.useShootHoles(lobby);
								}else if(ability == "clear"){
									player.useClear(lobby, io, sock.code);
								}else{
									return;
								}

								lobby.activeAbilities[player.numb][index] = "temp";
							}
							renewTimeOut(sock.code);
        	}
      	}
    	});

			//crate new game
  	sock.on('newGame', (userName) => {
			createGame(userName);
		});

		//join existing game
		sock.on('joinGame', (code, userName) => {
			joinGame(code, userName);
  	});

		function joinGame(code, userName, color){
			const room = io.sockets.adapter.rooms.get(code);
			let numbClients = 0;
    	let allUsers;

			//Collect information about lobby
    	if (room) {
      	numbClients = room.size;
    	}

			if (game[code] == null) {
				sock.emit('unknownGame');
				return;
			}
			//Check if Lobby is joinable
    	if (numbClients === 0) {
      	sock.emit('unknownGame');
      	return;

    	}else if (game[code].players.length >= 8) {
      	sock.emit('tooManyPlayers', game[code].players.length);
      	return;

    	}else if(game[code].started == true){
				sock.emit('gameAlreadyStarted');
				return;

				//Let client connect if all tests passed
			}else{

				if (userName.length > 16) {
					sock.emit('invalidUserName', userName);
					return;
		  	}

				if (userName == "$guest") {
					game[code].guestCount++;
					userName = "Guest-" + game[code].guestCount;
				}else{
					if (!checkUserName(userName)) {
						return;
					}
					game[code].guestCount++;
				}

      	clientRooms[sock.id] = code;
      	const clientNumb =  game[code].guestCount;
				const image = "https://diefettebrxnette.xyz/images/easterLogo.png";

				if (sock.number != null && sock.code != null) {

					if (sock.code == code) {

						game[code].players.forEach((player, i) => {
							if(player.numb == sock.number)
								return;
							});

						}
					}
					sock.number = clientNumb;
					sock.code = code;
					var randomColor;

					if (color == null) {
						randomColor = getRandomColor(game[code]);
					}else{
						randomColor = color;
					}

					game[code].players.push(new snakeGame.player(null, randomColor, userName, clientNumb, image));
      	sock.emit('init', clientNumb, code, userName, game[code].players, true);

				io.to(code)
				.emit('userInit', clientNumb, userName, image, randomColor);
				sock.join(code);
				game[code].playersReady.forEach((numb, i) => {
					var playerName;
					game[code].players.forEach((player, i) => {
						if (player.numb == numb) {
							playerName = player.name;
						}
					});

					io.to(code).emit('readiedUp', numb, playerName, false);
				});
				}
				renewTimeOut(code);
			}

			function createGame(userName, roomName, color){
				//generate random id
				if (roomName == null) {
					roomName = makeId(5);
				}

    	clientRooms[sock.id] = roomName;

			//create game
    	game[roomName] = new snakeGame.game(roomName);

			//handle userName input (guest);
			if (userName.length > 16) {
				sock.emit('invalidUserName', userName);
				return;
			}


			if (userName == "$guest") {
				game[roomName].guestCount++;
				userName = "Guest-" + game[roomName].guestCount;
			}else{
				if (!checkUserName(userName)) {
					return;
				}
				game[roomName].guestCount++;
			}

			//create lobby & new player
			if (color == null) {
				color = getRandomColor(game[roomName]);
			}

			game[roomName].players.push(new snakeGame.player(null, color, userName, 1, null));
			rooms.push(roomName);
			sock.join(roomName);
    	sock.number = 1;
			sock.code = roomName;
	    sock.emit('init', 1, roomName, userName, game[roomName].players, true);
			console.log('[Game-' + roomName + '] Created a new Lobby!');
			sock.emit('readiedUp', 1, userName, false);
			game[roomName].playersReady.push(1);
			renewTimeOut(roomName);
		}

		function checkUserName(userName){
			var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_öÖäÄüÜß';
			for (var i = 0; i < 63; i++) {
				const replacer = new RegExp(chars[i], 'g');
				userName = userName.replace(replacer, "");
			}
			if (userName != "") {
				sock.emit('invalidUserName', userName);
				return false;
			}

			return true;
		}

		//start the game when start was pressed by host && all clients ready
  	sock.on('startGameHost', () =>{
			const lobby = game[sock.code];
			if (lobby == null) {
				return;
			}
			if (lobby.started) {
				return;
			}
			if (sock.number != 1) {
				return;
			}

			renewTimeOut(sock.code);

			if (allPlayersReady(lobby)) {
				startGameInterval(sock.code);
			}else{
				sock.emit('notAllPlayersReady');
			}
	  });

		function allPlayersReady(lobby){
			if (lobby.playersReady.length < lobby.players.length) {
				return false;
			}else{
				return true;
			}
		}

		//generate a random Id for the rooms
  	function makeId(length){
    	var result = '';
    	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    	var charLength = chars.length;
    	for (var i = 0; i < length; i++) {
      	result += chars.charAt(Math.floor(Math.random()*charLength));
    	}
			if (game[result]) {
				return makeId(length);
			}
    	return result;
  	}

		//Gameloop with rounds & end funciton
  	function startGameInterval(roomName){
			game[roomName].started = true;
			const rounds = game[roomName].roundCount;
			let currentRound = 1;

			//start roundLoop
			io.to(roomName).emit('startGame', currentRound, rounds, game[roomName].players);
			console.log('[Game-' + roomName + '] Starting new game');
			roundLoop(roomName, currentRound, rounds);
  	}

		function renewTimeOut(code){
			if (game[code] == null) {
				return;
			}
	    if (game[code].gameTimeOut != null) {
	      clearTimeout(game[code].gameTimeOut);
	    }

	    game[code].gameTimeOut = setTimeout(function () {
	      console.log('[Game-' + code + '] Atempting to close the lobby');
	      if (game[code] != null) {
	        console.log('[Game-' + code + '] Closing game (Timeout)');
	        io.to(code).emit('gameTimeouted', false);
	        io.socketsLeave(code);
	        game[code] = null;
	      }
	    }, 5*60000);
	  }

		function roundLoop(roomName, currentRound, rounds){
				console.log('[Game-' + roomName + '] Round: ' + currentRound);
				if (game[roomName] == null) {
					return;
				}

				const lobby = game[roomName]
				//init the round and reset all values
				lobby.newRandomPlayerPos();
				lobby.players = shufflePlayers(lobby.players);
				console.log('[Game-' + roomName + '] starting CountDown');

				lobby.playersReady = [];
				lobby.oldCoords = [];
				lobby.deadPlayers = [];
				lobby.players.forEach((player, i) => {
					player.alive = true;
					player.place = 0;
					player.lastPos = [];
					player.lastHole = 80;
					player.balance += 300;
				});
				lobby.playersAlive = lobby.players.length;

				//start the countdown and begin a new round
				io.to(roomName).emit('startCountDown', lobby.players, currentRound);

				setTimeout(function(){
					//PlayerUpdate loop
					lobby.roundRunning = true;
    			var roundLoop = setInterval(function(){

						if (game[roomName] == null) {
							clearInterval(roundLoop);
							console.log('[Game-' + roomName + '] Game closed');
							return;
						}

						lobby.playersAlive = 0;
						lobby.players.forEach((player, i) => {
							if (player.alive) {
								lobby.playersAlive++;
							}
						});

						if (lobby.playersAlive < 2) {
							lobby.roundRunning = false;
							clearInterval(roundLoop);
							currentRound++;
							lobby.currentRound = currentRound;
							var winner;
							var foundWinner = false;

							//check who won the round
							for (var i = 0; i < lobby.players.length; i++) {
								if(lobby.players[i].alive == true){
									lobby.players[i].score+=2;
									lobby.players[i].balance += 100;
									winner = lobby.players[i];

									//submit that the round is over to all clients
									foundWinner = true;
									emitRoundOver(roomName, currentRound, rounds, winner, lobby.players);
								}
							}


							//in case the last two hit each other face to face the hit detection will kill both,
							//but assigns a place to all of them
							if (!foundWinner) {
								lobby.players.forEach((player, i) => {
									if (player.place == 1) {
										winner = lobby.players[i];
										foundWinner = true;
										emitRoundOver(roomName, currentRound, rounds, winner, lobby.players);
									}
								});

							}

							//is the max round count reached, then submit the results
							if (currentRound > rounds) {

								//sort players
								var temp = lobby.players;
								for (var count = 0; count < temp.length; count++) {
            			for (var next = count + 1; next < temp.length; next++) {
                		if (temp[count].score < temp[next].score) {
                    		var tmp = temp[next];
                    		temp[next] = temp[count];
                    		temp[count] = tmp;
                		}
            			}
        				}

								console.log('[Game-' + roomName + '] Game over, found a winner & lobby will be closed soon');
								emitGameOver(roomName, temp);
								return;
							}else{
								setTimeout(function(){
									lobby.players.forEach((player, i) => {
										let abilities = lobby.activeAbilities[player.numb];
										if (lobby.activeAbilities[player.numb] != null) {
											let containsAbility = 0;
											abilities.forEach((item, i) => {
												if (item != "temp") {
													containsAbility++;
												}
											});

											if (containsAbility > 0 && containsAbility < 4) {
												abilities.forEach((placeholder, i) => {
														if (placeholder == "temp" && containsAbility > 0) {
															let foundOne = false;
															for (var j = i; j < abilities.length; j++) {
																if (abilities[j] != "temp" && !foundOne) {
																	const tempAbility = abilities[i];
																	abilities[i] = abilities[j];
																	abilities[j] = tempAbility;
																}
															}
															containsAbility--;
														}
												});

											}
										}

										lobby.activeAbilities[player.numb] = abilities;
									});
									io.to(roomName).emit('shopPhaseStarted', lobby.currentRound, lobby.players, lobby.activeAbilities, lobby.abilitiesOrder, lobby.shopCountDown);
									lobby.shopTimeOut = setTimeout(function () {
										lobby.shopTimeOut = null;
										startNewRound(roomName, currentRound, rounds);
									}, lobby.shopCountDown*1000);
								}, 4000);
							}
						}
							lobby.players.forEach((player, i) => {
          			player.update(lobby, io, roomName);
      				});

							emitGameState(roomName, lobby.players);

							if (lobby.makeHoles) {
								lobby.players.forEach((player, i) => {
									player.makeHole = [];
								});

							}
						}, 25);
					}, 4000);
				}

				//emit some stuff
				function emitGameState(roomName, gameState){
					io.to(roomName)
					.emit('gameStateUpdate', gameState);
				}

				function startNewRound(roomName, currentRound, rounds){
					roundLoop(roomName, currentRound, rounds);
				}
				function emitRoundOver(roomName, currentRound, rounds, winner, players){
					io.to(roomName)
					.emit('gameRoundOver', winner.name, winner.numb, currentRound, players);
				}

				sock.on('itemSwap', (newIndex, itemId) =>{
					var lobby = game[sock.code];
					if (lobby == null) {
						return;
					}

					if (lobby.shopTimeOut == null) {
						return;
					}

					var player;
					for (var i = 0; i < lobby.players.length; i++) {
						if (lobby.players[i].numb == sock.number) {
							player = lobby.players[i];
						}
					}

					if(player == null)
						return;

					renewTimeOut(sock.code);

					if (lobby.activeAbilities[player.numb] == null) {
						lobby.activeAbilities[player.numb] = ["temp", "temp", "temp", "temp"];
					}
					if (lobby.abilitiesOrder[player.numb] == null) {
						lobby.abilitiesOrder[player.numb] = [1, 2, 3, 4];
					}

					let index = lobby.abilitiesOrder[player.numb].indexOf(itemId);
					let tempItem
					if (lobby.activeAbilities[player.numb][index] == null) {
						tempItem = "temp";
					}else{
						tempItem = lobby.activeAbilities[player.numb][index];
					}
					let tempItemIndex = lobby.abilitiesOrder[player.numb][index];

					if (lobby.activeAbilities[player.numb][newIndex] == null) {
						lobby.activeAbilities[player.numb][newIndex] = "temp";
					}else{
						lobby.activeAbilities[player.numb][index] = lobby.activeAbilities[player.numb][newIndex];
					}
					lobby.abilitiesOrder[player.numb][index] = lobby.abilitiesOrder[player.numb][newIndex];
					lobby.activeAbilities[player.numb][newIndex] = tempItem;
					lobby.abilitiesOrder[player.numb][newIndex] = tempItemIndex;
				});

				sock.on('buyAbility', (ability) =>{
					var lobby = game[sock.code];
					if (lobby == null) {
						return;
					}

					if (lobby.shopTimeOut == null) {
						return;
					}

					var player;
					for (var i = 0; i < lobby.players.length; i++) {
						if (lobby.players[i].numb == sock.number) {
							player = lobby.players[i];
						}
					}

					if(player == null)
						return;

					renewTimeOut(sock.code);

					if (lobby.activeAbilities[player.numb] == null) {
						lobby.activeAbilities[player.numb] = ["temp", "temp", "temp", "temp"];
					}
					if (lobby.abilitiesOrder[player.numb] == null) {
						lobby.abilitiesOrder[player.numb] = [1, 2, 3, 4];
					}

					if (lobby.activeAbilities[player.numb] != null) {
						const abilities = lobby.activeAbilities[player.numb];
						if (typeof 'temp' != typeof abilities[0]) {
							abilities.shift();
						}

						lobby.activeAbilities[player.numb] = abilities;
					}


					let counter = 0;
					lobby.activeAbilities[player.numb].forEach((item, i) => {
						if (typeof 'temp' != typeof item) {
							counter++;
						}
					});


					if (counter > 3) {
						sock.emit('inventoryFull');
						return;
					}

					let price = 0;

					if (ability == "slowness" && player.balance >= 150) {
						price = 150;
					}else if(ability == "speed" && player.balance >= 200){
						price = 200;
					}else if(ability == "teleport" && player.balance >= 500){
						price = 500;
					}else if(ability == "curve" && player.balance >= 150){
						price = 150;
					}else if(ability == "shootholes" && player.balance>=200){
						price = 200;
					}else if(ability == "cubic" && player.balance>=150){
						price = 150;
					}else if(ability == "randomdeath" && player.balance>=500){
						price = 500;
					}else if(ability == "clear" && player.balance>=250){
						price = 250;
					}else{
						sock.emit('itemTooExpensive', ability);
						return;
					}

					for (var i = 0; i < 5; i++) {
						if (lobby.activeAbilities[player.numb][i] == "temp"){
							lobby.activeAbilities[player.numb][i] = ability;
							player.balance -= price;
							sock.emit('itemBought', ability, player.balance, lobby.abilitiesOrder[player.numb][i]);
							return;
						}
					}

					sock.emit('inventoryFull');
					return;
				});

				function emitGameOver(roomName, playerRanks){
					setTimeout(function (){
						io.to(roomName)
						.emit('gameOver', playerRanks);
						io.socketsLeave(roomName);
						game[roomName] = null;
					}, 6000);
				}

				//https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array lmao
				//mix the playerArray so noone gets an advantage for joining late
				function shufflePlayers(a) {
    	var j, x, i;
    	for (i = a.length - 1; i > 0; i--) {
        	j = Math.floor(Math.random() * (i + 1));
        	x = a[i];
        	a[i] = a[j];
        	a[j] = x;
    	}
    	return a;
		}

		sock.on('rematch', function(userName, color){
			if(userName == null)
				return;
				if (userName.contains('Guest-')) {
					userName = '$guest';
				}
				if (game[sock.code] == null) {
					createGame(userName, sock.code, color);
				}else{
					joinGame(sock.code, userName, color);
				}
			});

			sock.on('readyUp', function(buyphase){
				const lobby = game[sock.code];

				if (lobby == null) {
					return;
				}

				if (!lobby.playersReady.includes(sock.number)) {
					renewTimeOut(sock.code);
					lobby.playersReady.push(sock.number);
					var playerName;
					lobby.players.forEach((player, i) => {
						if (player.numb == sock.number) {
							playerName = player.name;
						}
					});
					io.to(sock.code).emit('readiedUp', sock.number, playerName, buyphase);
					if (buyphase) {
						if (lobby.playersReady.length == lobby.players.length) {
							clearTimeout(lobby.shopTimeOut);
							lobby.shopTimeOut = null;
							startNewRound(sock.code, lobby.currentRound, lobby.roundCount);
						}
					}
				}
			});

  	//someone left :/ now delete it and tell the others
  	sock.on('disconnect', function() {
				totalClientCount -= 1;

				//remove all evidence of the client
				io.emit('connectionInit', totalClientCount);

				if (game[sock.code] != null) {
					const roomName = sock.code;
					const lobby = game[roomName];

					if (!lobby.started && sock.number == 1) {
						console.log('[Game-' + roomName + '] Closing lobby (Host left)');
						io.to(roomName).emit('gameClosed', false);
						io.socketsLeave(roomName);
						game[roomName] = null;
						rooms.splice(rooms.indexOf(roomName), 1);
						return;
					}else if(lobby.started && (lobby.players.length<3)){
						console.log('[Game-' + roomName + '] Closing game (insufficent players)');
						io.to(roomName).emit('gameClosed', true);
						io.socketsLeave(roomName);
						game[roomName] = null;
						rooms.splice(rooms.indexOf(roomName), 1);
						return;
					}else if(!lobby.started){

						lobby.players.forEach((player, i) => {
							if (player.numb == sock.number) {
								lobby.colorPalet.push(player.color);
								lobby.players.splice(i, 1);
								io.to(roomName).emit('userLeft', sock.number, false);
								return;
							}
						});
					}else if(lobby.started){
						lobby.players.forEach((player, i) => {

							if (player.numb == sock.number) {
								lobby.players.splice(i, 1);
								lobby.playersLeft.push();
								io.to(roomName).emit('userLeft', sock.number, true);
								return;
							}
						});
					}
				}
   	});
	});
}catch(err){
	console.log('Something went wrong:' + err);
	const temp = rooms;
	for (var i = 0; i < temp.length; i++) {
		io.to(game[temp[i]].code).emit('gameClosed', null);
		io.socketsLeave(temp[i]);
		game[temp[i]] = null;
		rooms.splice(i, 1);
	}
}



/*
redirect http to https how!??

httpApp.use("/.well-known/acme-challenge", express.static("letsencrypt/.well-known/acme-challenge"));
httpApp.get('*', function(req, res) {
	res.redirect('https://' + req.headers.host + req.url);
})
const httpServer = http.createServer(httpApp).listen(3000, () => {
  console.log('Http Backup running on 3000');
});
Maybe at some point I'm going to understand port forwarding..*/

//server starting error
httpsServer.on('error', (err) =>{
  console.error('Server error: ', err);
});

//server started
httpsServer.listen(3001, () => {
  console.log('Running Https on 3001');
});
httpServer.listen(3000, () => {
	console.log('Running Http on 3000');
	setTimeout(() =>{
		io.emit('gameClosed', null);
	}, 2000);
});
