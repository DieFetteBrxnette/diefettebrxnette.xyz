// canvas (PixiJs) setup
let app = new PIXI.Application({ width: 1400, height: 800 });
var canvas = document.getElementById("myCanvas");
var c = canvas.getContext("2d");

// connect to socket.io / disable mobiles
let sock;
if (window.innerWidth < 600) {
  document.getElementById('mobileScreen').style.display = 'flex';
  document.getElementById('initialScreen').style.display = 'none';
  document.getElementById('chatbox-button').style.display = 'none';
  sock = null;
} else {
  document.getElementById('mobileScreen').style.display = 'none';
  document.getElementById('initialScreen').style.display = 'flex';
  document.getElementById('chatbox-button').style.display = 'block';
  sock = io();
}

// start/join game Interface
const gameScreen = document.getElementById('gameScreen');
const initialSceen = document.getElementById('initialScreen');
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const gameNameInput = document.getElementById('gameNameInput');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');

newGameBtn.addEventListener('click', newGame);

// Chatbox Interface
const chatButton = document.querySelector('.chatbox__button');
const chatContent = document.querySelector('.chatbox__support');
const chatbox = new InteractiveChatbox(chatButton, chatContent);
chatbox.display();

// register drag and drop api
const dragAndDropWrapper = document.getElementById('item-wrapper');
const sortable = new Sortable(dragAndDropWrapper, {
  animation: 250,
  onEnd: function (evt) {
    sock.emit('itemSwap', evt.oldIndex, evt.newIndex, evt.item.id);
  }
});

var roomName;
var playerNumb;
var account;
var userName;
var userColor;
let score = 0;
let balance = 0;
let clients = 0;
let players = {};
let playerCount = 0;
var toastTimeout;
let timeouted = false;

// chat system
// write new Message on screen
const writeMessage = (text, isOwn) => {
  // select div
  const parent = document.querySelector('#main-chat');
  // add item to new div
  const el = document.createElement('div');

  el.innerHTML = text;

  if (isOwn) {
    el.className = "messages__item messages__item--operator";
  } else {
    el.className = "messages__item messages__item--visitor";
  }
  parent.appendChild(el);
}

// Event: Message sent
const onFormSubmitted = (e) => {
  e.preventDefault();
  // submit chatmsg to server and clear input
  const input = document.querySelector('.chat-write');
  const text = input.value;
  input.value = '';
  // but only if u have an acc registered :)
  if (account) {
    sock.emit('message', text);
    writeMessage(text, true);
  }
}

// message recieved
sock.on('message', (text, sockClient) => {
  if (account) {
    writeMessage(text, sockClient, sock.id);
  }
});


// game system

// check if given name is too long/contains something bad
function checkUserName(userName) {
  if (userName.length > 16) {
    alertOut(null, "Invalid Username", "Name can not be longer than 16 chars", true);
    return false;
  }
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_öÖäÄüÜß';
  for (var i = 0; i < 63; i++) {
    userName = userName.replaceAll(chars[i], "");
  }
  if (userName === "") {
    return true;
  }
  alertOut(null, "Invalid Username", "Name can only include letters, numbers, and underscores", true);
  return false;
}

// create a new game lobby
function newGame() {
  let userName = gameNameInput.value;
  if (checkUserName(userName)) {
    if (userName === "") {
      userName = "$guest";
    }
    sock.emit('newGame', userName);
  } else {
    gameNameInput.value = "";
  }
}

// join an existing game
function joinGame() {
  let userName = gameNameInput.value;
  if (checkUserName(userName)) {
    if (userName === "") {
      userName = "$guest";
    }
    const code = gameCodeInput.value;
    if (code == "") {
      sock.emit('newGame', userName);
    } else {
      sock.emit('joinGame', code, userName);
    }
  } else {
    gameNameInput.value = "";
  }
}

// create all the necessary shitty classes for css so it doesn't look like crap
function addUserToDisplay(userName, userNumb, userImg, userColor, animate) {

  // nice other function that mapps the usernumb to a name as they join:)
  players[userNumb] = userName;
  const playerCountDisplay = document.getElementById('playerCount');
  playerCountDisplay.innerHTML = playerCount + "/8";
  const parent = document.getElementById('userList');

  const userBadge = document.createElement('div');
  userBadge.className = 'user';
  userBadge.id = `user-${userNumb}`;

  const profileHeaderContainer = document.createElement('div');
  profileHeaderContainer.className = 'profile-header-container';

  const profileHeaderImg = document.createElement('div');
  profileHeaderImg.className = 'profile-header-img';

  const imgCircle = document.createElement('img');
  imgCircle.className = 'img-circle';
  imgCircle.id = `userImage-${userNumb}`;
  imgCircle.src = `${userImg}`;
  imgCircle.style.border = `2px solid ${userColor}`;

  const rankLabelContainer = document.createElement('div');
  rankLabelContainer.className = 'rank-label-container';
  rankLabelContainer.style.background = `${userColor}`;
  rankLabelContainer.style.borderRadius = "27px";

  const nameLabel = document.createElement('span');
  nameLabel.className = 'name-label';
  nameLabel.id = `userName-${userNumb}`;
  if (userNumb == playerNumb) {
    nameLabel.innerHTML = userName + " (You)";
  } else {
    nameLabel.innerHTML = userName;
  }

  parent.appendChild(userBadge);
  userBadge.appendChild(profileHeaderContainer);
  profileHeaderContainer.appendChild(profileHeaderImg);
  profileHeaderImg.appendChild(imgCircle);
  profileHeaderImg.appendChild(rankLabelContainer);
  rankLabelContainer.appendChild(nameLabel);

  if (animate) {
    profileHeaderContainer.classList.add('jello-vertical');
  }
}

function init(name, previousClients, privateGame) {

  document.getElementById('userList').innerHTML = '';
  document.getElementById('readyUpBtn').style.display = 'inline-block';
  document.getElementById('readiedBtn').style.display = 'none';
  document.getElementById('HTMLButton').innerHTML = 'Copy Code';
  document.getElementById('scoreboardUserList').innerHTML = '';
  userName = name;
  // display prior joined clients & own client on screen
  let prevName;
  let prevNumb;
  let prevImg;
  let prevColor;

  for (var i = 0; i < previousClients.length; i++) {
    prevColor = previousClients[i].color;
    prevName = previousClients[i].name;
    prevNumb = previousClients[i].numb;
    if (previousClients[i].img == null) {
      prevImg = "https://diefettebrxnette.xyz/images/hwLogo.png";
    } else {
      prevImg = previousClients[i].img;
    }

    if (userName == previousClients[i].name) {
      userColor = previousClients[i].color;
    }

    addUserToDisplay(prevName, prevNumb, prevImg, prevColor, false);
  }
  // display correct state of the private game button
  if (privateGame) {
    document.getElementById('privateGameSwitch').setAttribute('checked', '');;
  }

  // switch ready up button with start game button
  if (playerNumb == 1) {
    document.getElementById('readyUpBtn').style.display = "none";
  } else {
    document.getElementById('startGameBtn').style.display = "none";
  }

  document.getElementById('scoreboard').style.display = "none";
  initialSceen.style.display = "none";
  settingsScreen.style.display = "flex";
}

// init the gamescreen
function startGame() {
  const c = canvas.getContext('2d');
  canvas.width = 1400;
  canvas.height = 800;
  canvas.style.backgroundColor = "black";
  c.fillStyle = "black";
  c.fillRect(0, 0, canvas.width, canvas.height);
}

// key listener
function gameLoop() {
  if (roomName != null) {
    if (keyState[37] || keyState[65]) {
      if (!document.getElementById('chatbox').classList.contains('chatbox--active')) {
        sock.emit("clientBtnPressed", "leftBtn", playerNumb);
      }
    }
    if (keyState[39] || keyState[68]) {
      if (!document.getElementById('chatbox').classList.contains('chatbox--active')) {
        sock.emit("clientBtnPressed", "rightBtn", playerNumb);
      }
    }
    if (keyState[87] || keyState[38]) {
      if (!document.getElementById('chatbox').classList.contains('chatbox--active')) {
        if (!timeouted) {
          timeouted = true;
          sock.emit("clientBtnPressed", "abilityBtn", playerNumb);
          setTimeout(() => {
            timeouted = false;
          }, 500);
        }

      }
    }
    setTimeout(gameLoop, 10);
  }
}

// reset browser for new game
function reset() {
  roomName = null;
  playerNumb = null;
  userName = null;
  userColor = null;
  score = 0;
  balance = 0;
  clients = 0;
  players = {};
  playerCount = 0;
  gameCodeInput.value = "";
  gameCodeDisplay.innerText = "error";
  initialSceen.style.display = "flex";
  gameScreen.style.display = "none";
  settingsScreen.style.display = "none";
  document.getElementById('gameUserList').innerHTML = '';
  document.getElementById('startGameBtn').style.display = 'inline-block';
  document.getElementById('scoreboard').style.display = "none";
  document.getElementById('shopScreen').style.display = "none";
}

// start the lobby
sock.on('init', (numb, room, userName, clients, privateGame) => {
  playerNumb = numb;
  gameCodeDisplay.innerText = room;
  roomName = room;
  playerCount = clients.length;
  init(userName, clients, privateGame);
});

// display countdown for round start
sock.on('startCountDown', (players, currentRound) => {

  document.getElementById('gameScreen').style.display = "flex";
  document.getElementById('shopScreen').style.display = "none";
  const roundDeathAnimation = document.getElementById('roundDeathAnimation').style.display = "none";
  document.getElementById('roundPlacePoints').style.display = "none";
  document.getElementById('roundVictoryAnimation').style.display = "none";
  let countDownNumb = 3;
  document.getElementById('currentRoundCountDisplay').innerHTML = currentRound;
  c.clearRect(0, 0, canvas.width, canvas.height);
  var temp = players;

  players.forEach((player, i) => {
    document.getElementById(`userScore-${player.numb}`).innerHTML = player.score;
    updatePlayerPos(player);
    drawDirection(temp[i]);
  });

  displayCountDown(countDownNumb, currentRound, players);
});

function displayGamePlayers(players) {
  const list = document.getElementById('gameUserList');
  for (var i = 0; i < players.length; i++) {
    const user = document.createElement('div');
    user.id = `gameUser-${players[i].numb}`;
    user.classList.add('gameUserDisplay');
    const username = document.createElement('span');
    username.id = `gameUserName-${players[i].numb}`;

    if (players[i].numb == playerNumb) {
      username.innerHTML = players[i].name + " (You)";
    } else {
      username.innerHTML = players[i].name;
    }

    username.style.color = players[i].color;
    username.classList.add('gameUserName');
    const icon = document.createElement('span');
    icon.className = 'userListIcon';
    icon.id = `userListIconDisplay-${players[i].numb}`;
    icon.innerHTML = `<i class="fas fa-check" id="userListIcon-${players[i].numb}"></i>`;
    const userScore = document.createElement('span');
    userScore.id = `userScore-${players[i].numb}`;
    userScore.classList.add('userScore');
    user.appendChild(icon);
    user.appendChild(username);
    user.appendChild(userScore);
    list.appendChild(user);
  }
}

// start animating countdown
function displayCountDown(countDownNumb, currentRound, players) {
  setTimeout(function () {
    if (countDownNumb != 3) {
      const prevCountDownNumbDisplay = document.getElementById(`countDownNumb-${countDownNumb + 1}`);
      prevCountDownNumbDisplay.style.display = 'none';
    }
    if (countDownNumb != 0) {
      const countDownNumbDisplay = document.getElementById(`countDownNumb-${countDownNumb}`);
      countDownNumbDisplay.style.display = 'flex';
      countDownNumbDisplay.classList.add('scale-in-center');
      countDownNumb--;
      displayCountDown(countDownNumb, currentRound, players);
    }
    if (countDownNumb == 0) {
      players.forEach((player, i) => {
        updatePlayerPos(player);
      });
    }
  }, 1000);
}

// handle some errors from the server
sock.on('unknownGame', () => {
  reset();
  alertOut(null, "Unknown game code", "Given game was not found", true);
  document.getElementById('gameCodeInput').classList.add('shake-horizontal');
  setTimeout(() => {
    document.getElementById('gameCodeInput').classList.remove('shake-horizontal');
  }, 500);
});

sock.on('tooManyPlayers', (numClients) => {
  reset();
  alertOut(null, "Game full", `Maximum count of ${numClients} is reached`, true);
  document.getElementById('gameCodeInput').classList.add('shake-horizontal');
  setTimeout(() => {
    document.getElementById('gameCodeInput').classList.remove('shake-horizontal');
  }, 500);
});

sock.on('gameAlreadyStarted', () => {
  reset();
  alertOut(null, "Game already Started", "Game is already running", true);
  document.getElementById('gameCodeInput').classList.add('shake-horizontal');
  setTimeout(() => {
    document.getElementById('gameCodeInput').classList.remove('shake-horizontal');
  }, 500);
});

// user joined lobby
sock.on('userInit', (numb, userName, userImg, userColor, userCount) => {
  if (userImg == null) {
    userImg = "https://diefettebrxnette.xyz/images/xmasLogo.png";
  }

  playerCount++;
  addUserToDisplay(userName, numb, userImg, userColor, true);
});

// start the game
sock.on('startGame', (currentRound, rounds, players) => {
  document.getElementById('currentRoundCountDisplay').innerHTML = currentRound;
  document.getElementById('allRoundCountDisplay').innerHTML = '/' + rounds;
  document.getElementById('readyUpBtn').style.display = 'inline-block';
  document.getElementById('readiedBtn').style.display = 'none';
  settingsScreen.style.display = "none";
  gameScreen.style.display = "flex";
  displayGamePlayers(players);
  startGame();
  gameLoop();
});

// update playerStates in Browser
sock.on('gameStateUpdate', (players) => {
  players.forEach((player, i) => {
    updatePlayerPos(player);
    if (player.lastPos.length > 0) {
      redrawHolePos(player);
    }
    if (player.makeHole.length > 0) {
      redrawShootHolePos(player);
    }
  });
});

// player died
sock.on('playerDied', (numb, playerPlace) => {
  if (playerNumb == numb) {
    playerDiedAnimation(playerPlace);
  }

  const icon = document.getElementById(`userListIconDisplay-${numb}`);
  icon.innerHTML = `<i class="fas fa-times" id="userListIcon-${numb}"></i>`;
  document.getElementById(`userListIcon-${numb}`).style.color = 'red';
});

// update all player poses
function updatePlayerPos(player) {
  c.beginPath();
  c.arc(player.coords.x, player.coords.y, player.
    radius, 0, Math.PI * 2, false);
  c.fillStyle = player.color;
  c.fill();
}

// show where ur facings
function drawDirection(player) {
  const icon = document.getElementById(`userListIconDisplay-${player.numb}`);
  icon.innerHTML = `<i class="fas fa-check" id="userListIcon-${player.numb}"></i>`;
  document.getElementById(`userListIcon-${player.numb}`).style.color = 'green';
  for (var i = 0; i < 10; i++) {
    player.color = "grey";
    player.radius = 1.5;
    player.coords.x = player.coords.x + (player.coords.velocity.x * 2);
    player.coords.y = player.coords.y + (player.coords.velocity.y * 2);
    updatePlayerPos(player);
  }
}

// make holes (randomly generated ones and shot ones)
function redrawHolePos(player) {
  c.beginPath();
  c.arc(player.lastPos[0].x, player.lastPos[0].y, player.
    radius + 0.1, 0, Math.PI * 2, false);
  c.fillStyle = "black";
  c.fill();
}
function redrawShootHolePos(player) {
  c.beginPath();
  for (var i = 0; i < player.makeHole.length; i++) {
    c.arc(player.makeHole[i].x, player.makeHole[i].y, 5, 0, Math.PI * 2, false);
    c.fillStyle = "black";
    c.fill();
  }
}


// start animation when player ded
function playerDiedAnimation(playerPlace) {
  const roundDeathAnimation = document.getElementById('roundDeathAnimation');
  roundDeathAnimation.classList.add('slide-in-top');
  roundDeathAnimation.style.display = "flex";
  document.getElementById('roundPosition').innerHTML = playerPlace;
}

// start animation on every device when player won
function playerWonAnimation(playerName) {
  const roundVictory = document.getElementById('roundVictory');
  setTimeout(function () {
    document.getElementById('winPointerNumb').classList.add('slide-in-left');
    document.getElementById('winPointerNumb').style.display = "flex";
    setTimeout(function () {
      roundVictory.classList.add('puff-in-center');
      roundVictory.style.display = "block";
    }, 700);
  }, 300);
  document.getElementById('winPointerNumb').style.display = "none";
  roundVictory.style.display = "none";
  document.getElementById('winPointer').classList.add('slide-in-right');
  document.getElementById('roundPlayerWon').innerHTML = playerName;
  document.getElementById('roundVictoryAnimation').style.display = "flex";
}

// alert something out beautifully :)
function alertOut(icon, title, subtitle, error) {
  console.log(title);
  console.log(subtitle);
  const wrapper = document.querySelector(".toast-wrapper");
  let timeoutDuration = 0;
  if (toastTimeout != null) {
    clearTimeout(toastTimeout);
    wrapper.classList.remove("show");
    wrapper.classList.add("hide");
    timeoutDuration = 400
  }

  setTimeout(() => {
    if (wrapper.classList.contains("hide")) {
      wrapper.classList.remove("hide");
    }
    if (icon == null)
      icon = '<i class="fas fa-exclamation"></i>';

    const toast = document.getElementById('toast');
    let toastIcon = document.getElementById('toastIcon');
    toastIcon.innerHTML = icon;
    document.getElementById('toastTitle').innerHTML = title;
    document.getElementById('toastSubtitle').innerHTML = subtitle;

    if (error) {
      toastIcon.style.background = "#e81010";
      toast.style.borderColor = "#e81010";
    } else {
      toastIcon.style.background = "#2ecc71";
      toast.style.borderColor = "#2ecc71";
    }

    wrapper.style.display = "flex";
    wrapper.classList.add("show");

    closeIcon = wrapper.querySelector(".close-icon");
    closeIcon.onclick = () => {
      wrapper.classList.remove("show");
      wrapper.classList.add("hide");
      toastTimeout = null;
      setTimeout(() => {
        wrapper.style.display = "none";
      }, 1000);
    }

    toastTimeout = setTimeout(() => {
      wrapper.classList.remove("show");
      wrapper.classList.add("hide");
      toastTimeout = null;
      setTimeout(() => {
        wrapper.style.display = "none";
      }, 1000);
    }, 5000);
  }, timeoutDuration);
}

// create all the shitty elements for a goodlookin scoreboard...
function displayUserScore(player, index) {
  const scoreboardUserList = document.getElementById('scoreboardUserList');
  const scoreboardUser = document.createElement('div');
  scoreboardUser.className = 'scoreboardUser';
  scoreboardUser.id = `scoreboardUser-${player.numb}`;

  const profilePicture = document.createElement('img');
  var imageSource;
  if (player.image == null) {
    player.image = "https://diefettebrxnette.xyz/images/xmasLogo.png";
  }
  profilePicture.src = player.image;
  profilePicture.className = "pfp";

  const playerRank = document.createElement('span');
  index++;
  playerRank.className = "scoreboardPlace";
  if (index == 1) {
    playerRank.innerHTML = '<i class="fas fa-trophy"></i>';
  } else {
    playerRank.innerHTML = index + ".";
  }

  const playerName = document.createElement('span');
  playerName.className = "userName";
  playerName.innerHTML = player.name;

  const playerScore = document.createElement('span');
  playerScore.className = "userPoints";
  playerScore.innerHTML = player.score;
  playerScore.style.color = player.color;

  scoreboardUserList.appendChild(scoreboardUser);
  scoreboardUser.appendChild(playerRank);
  scoreboardUser.appendChild(profilePicture);
  scoreboardUser.appendChild(playerName);
  scoreboardUser.appendChild(playerScore);
}

sock.on('itemTooExpensive', (item) => {
  alertOut(null, "Could not buy Item", "Not enough points", true);
  document.getElementById(`buy-${item}`).classList.add('shake-horizontal');
  setTimeout(() => {
    document.getElementById(`buy-${item}`).classList.remove('shake-horizontal');
  }, 500);
});

sock.on('notAllPlayersReady', () => {
  alertOut(null, "Could not start Game", "Not every player is ready", true);
  document.getElementById('startGameBtn').classList.add('shake-horizontal');
  setTimeout(() => {
    document.getElementById('startGameBtn').classList.remove('shake-horizontal');
  }, 500);
});

// small listeners (selfexplanatory)
sock.on('gameRoundOver', (winnerName, winnerNumb, currentRound, players) => {
  players.forEach((player, i) => {
    if (player.numb == playerNumb) {
      document.getElementById('plusPoints').innerHTML = player.score - score;
      document.getElementById('totalPoints').innerHTML = player.score;
      score = player.score;
    }
  });

  if (winnerNumb == playerNumb) {
    document.getElementById('roundPosition').innerHTML = 1;
  }
  document.getElementById('roundPlacePoints').style.display = "flex";
  playerWonAnimation(winnerName);
});


// display shop site and reset some buttons
sock.on('shopPhaseStarted', function (currentRound, players, abilities, order, countDownNumb) {
  const readyBtn = document.getElementById('readyUpBtn-2');
  document.getElementById('shopPlayersReady').innerHTML = "";
  document.getElementById('readyUpBtn-2').style.display = 'inline-block';
  document.getElementById('readiedBtn-2').style.display = 'none';

  const abilityList = ["slowness", "teleport", "speed", "curve", "shootholes", "cubic", "clear", "randomdeath"];
  abilityList.forEach((ability, i) => {
    const badge = document.getElementById(`${ability}-Owned`);
    if (badge != null) {
      badge.innerHTML = '';
      badge.remove();
    }
  });

  var points;
  players.forEach((player, i) => {
    if (player.numb == playerNumb) {
      points = player.balance;
      let count = 0;
      if (abilities[playerNumb] != null && order != null) {
        abilities[playerNumb].forEach((ability, i) => {
          if (ability != null && ability != "temp") {
            var badge = document.getElementById(`${ability}-Owned`);

            const index = order[playerNumb][i];
            const card = document.getElementById(`item-card-${index}`);
            document.getElementById(`card-title-${index}`).innerHTML = ability;


            if (badge != null) {
              badge = badge.querySelector('.itemBadge');
              if (badge.innerHTML == 'Owned') {
                badge.innerHTML = 'Owned (x2)';
              } else if (badge.innerHTML == 'Owned (x2)') {
                badge.innerHTML = 'Owned (x3)';
              } else if (badge.innerHTML == 'Owned (x3)') {
                badge.innerHTML = 'Owned (x4)';
              }
            } else {
              badge = document.createElement('div');
              badge.classList.add('ribbon-top-right');
              badge.classList.add('ribbon');
              badge.classList.add('itemBadge');
              const badgeTag = document.createElement('span');
              badge.id = `${ability}-Owned`;
              badgeTag.innerHTML = 'Owned';
              badge.appendChild(badgeTag);

              document.getElementById(ability).appendChild(badge);
            }

            count++;
          }
        });



        if (count < 4) {
          for (var i = count; i < 4; i++) {
            const index = order[playerNumb][i];
            const card = document.getElementById(`item-card-${index}`);
            card.querySelector('.title').innerHTML = 'empty';
          }
        }
      } else {
        for (var i = 1; i < 5; i++) {
          const card = document.getElementById(`item-card-${i}`);
          card.querySelector('.title').innerHTML = 'empty';
        }
      }
    }
  });

  if (points < 150) {
    sock.emit('readyUp', roomName, playerNumb, true);
  }

  document.getElementById('shopCurrentRound').innerHTML = currentRound;
  document.getElementById('shopCurrentPoints').innerHTML = points;
  document.getElementById('gameScreen').style.display = "none";
  document.getElementById('shopScreen').style.display = "flex";

  document.getElementById('shopCountDown').innerHTML = countDownNumb;
  showCountDown(countDownNumb - 1);
});


// countdown Loop
function showCountDown(countDownNumb) {
  if (countDownNumb == 0) {
    return;
  }
  setTimeout(() => {
    document.getElementById('shopCountDown').innerHTML = `${countDownNumb}`;
    countDownNumb--;
    showCountDown(countDownNumb);
  }, 1000);
}

sock.on('inventoryFull', () => {
  alertOut(null, "Could not buy item", "Your inventory is full", true);
});

sock.on('AbilityOnTimeOut', () => {
  alertOut(null, "Could not use item", "You are on cooldown", false);
});

// small check, that it worked :)
sock.on('itemBought', (ability, newScore, cardId) => {
  balance = newScore;
  document.getElementById('shopCurrentPoints').innerHTML = balance;
  document.getElementById(`buy-${ability}`).innerHTML = "bought";

  setTimeout(() => {
    document.getElementById(`buy-${ability}`).innerHTML = "buy ability";
  }, 700);

  var badge = document.getElementById(`${ability}-Owned`);
  if (badge != null) {
    badge = badge.querySelector('.itemBadge');
    if (badge.innerHTML == 'Owned') {
      badge.innerHTML = 'Owned (x2)';
    } else if (badge.innerHTML == 'Owned (x2)') {
      badge.innerHTML = 'Owned (x3)';
    } else if (badge.innerHTML == 'Owned (x3)') {
      badge.innerHTML = 'Owned (x4)';
    }
  } else {
    badge = document.createElement('div');
    badge.classList.add('itemBadge');
    badge.classList.add('ribbon-top-right');
    badge.classList.add('ribbon');
    const badgeTag = document.createElement('span');
    badge.id = `${ability}-Owned`;
    badgeTag.innerHTML = 'Owned';
    badge.appendChild(badgeTag);
    document.getElementById(ability).appendChild(badge);
  }

  const card = document.getElementById(`item-card-${cardId}`);
  document.getElementById(`card-title-${cardId}`).innerHTML = ability;
});

// use ability clear board and reset every line
sock.on('clearBoard', () => {
  startGame();
});

// handle user leaves
sock.on('userLeft', (number, inGame) => {
  playerCount--;
  if (!inGame) {
    document.getElementById('playerCount').innerHTML = `${playerCount}/8`
    const user = document.getElementById(`user-${number}`);
    if (user.classList.contains('jello-vertical')) {
      user.classList.remove('jello-vertical');
    }
    user.classList.add('jello-vertical');
    setTimeout(() => {
      user.innerHTML = '';
      user.remove();
    }, 700);

  } else {
    const user = document.getElementById(`gameUserName-${number}`);
    user.style.textDecoration = 'line-through';
    user.style.color = 'grey';
    const icon = document.getElementById(`userListIconDisplay-${number}`);
    icon.innerHTML = `<i class="fas fa-times" id="userListIcon-${number}"></i>`;
    document.getElementById(`userListIcon-${number}`).style.color = 'red';
  }
});

// game has ended, display final scores
sock.on('gameOver', (playerRanks) => {
  const scoreboard = document.getElementById('scoreboard');
  playerRanks.forEach((item, i) => {
    displayUserScore(item, i);
  });
  scoreboard.style.display = "flex";
});

// close lobbys without enough or inactive players
sock.on('gameClosed', (inGame) => {
  reset();
  if (inGame != null) {
    if (inGame) {
      alertOut('<i class="fas fa-info"></i>', 'Game terminated', 'You were the last active player', false);
    } else {
      alertOut('<i class="fas fa-info"></i>', 'Lobby closed', 'The host left the lobby', false);
    }
  } else {
    alertOut('<i class="fas fa-info"></i>', 'Game terminated', 'Something went wrong on the server', false);
  }

});

sock.on('gameTimeOut', () => {
  reset();
  alertOut('<i class="fas fa-info"></i>', 'Lobby timed out', 'Nothing happened for 5min', false);
});

// new connection
sock.on('connectionInit', (newClients, account) => {
  clients = newClients;

  // Print hello
  if (account) {
    writeMessage(`Welcome to the global chat! There are currently ${newClients - 1} others, have fun :)`, true);
  } else {
    writeMessage(`Please login or signup in order to write in the global chat`, true);
  }

  // change online count
  document.querySelector('.clientCount').innerHTML = clients;
});

// register key down listener for controls
document
  .querySelector('.chat-form')
  .addEventListener('submit', onFormSubmitted);

var keyState = {};
window.addEventListener('keydown', function (e) {
  keyState[e.keyCode || e.which] = true;
}, true);
window.addEventListener('keyup', function (e) {
  keyState[e.keyCode || e.which] = false;
}, true);

x = 100;

// adblock checker
const detect = document.querySelector("#detect");
let adClasses = ["ad", "ads", "adsbox", "doubleclick", "ad-placement", "ad-placeholder", "adbadge", "BannerAd"];
for (let item of adClasses) {
  detect.classList.add(item);
}
let getProperty = window.getComputedStyle(detect).getPropertyValue("display");
if (getProperty == "none") {
  alertOut('<i class="far fa-frown"></i>', "Ad-Blocker detected", "Disable it, in order to use all features", true);
}

// ensure that no other users except the host changes buttons
document.getElementById('privateGameSwitch').click(function (event) {
  var checkbox = (this);

  // Ensures this code runs AFTER the browser handles click however it wants.
  if (playerNumb === 1) {
    return;
  } else {
    setTimeout(function () {
      if (checkbox.is(":checked")) {
        checkbox.removeAttribute('checked');
      } else {
        checkbox.setAttribute('checked', '');
      }

    }, 0);

    event.preventDefault();
    event.stopPropagation();
  }
});


// button registry (selfexplanatory)
document.getElementById('rematchBtn').onclick = function () {
  var room = roomName;
  reset();
  setTimeout(() => {
    sock.emit('rematch', userName, userColor);
  }, 500);
};

document.getElementById('readyUpBtn').onclick = function () {
  sock.emit('readyUp', false);
};

document.getElementById('readyUpBtn-2').onclick = function () {
  sock.emit('readyUp', true);
};

document.getElementById('buy-slowness').onclick = function () {
  sock.emit('buyAbility', 'slowness');
};
document.getElementById('buy-teleport').onclick = function () {
  sock.emit('buyAbility', 'teleport');
};
document.getElementById('buy-speed').onclick = function () {
  sock.emit('buyAbility', 'speed');
};
document.getElementById('buy-shootholes').onclick = function () {
  sock.emit('buyAbility', 'shootholes');
};
document.getElementById('buy-curve').onclick = function () {
  sock.emit('buyAbility', 'curve');
};
document.getElementById('buy-cubic').onclick = function () {
  sock.emit('buyAbility', 'cubic');
};
document.getElementById('buy-clear').onclick = function () {
  sock.emit('buyAbility', 'clear');
};
document.getElementById('buy-randomdeath').onclick = function () {
  sock.emit('buyAbility', 'randomdeath');
};

// user is ready (shop phase or waiting room)
sock.on('readiedUp', (numb, userName, buyphase) => {
  if (buyphase) {
    if (playerNumb == numb) {
      document.getElementById('readyUpBtn-2').style.display = 'none';
      document.getElementById('readiedBtn-2').style.display = 'inline-block';
    }
    const playersReady = document.getElementById('shopPlayersReady');
    playersReady.innerHTML = playersReady.innerHTML + '<i class="far fa-check-circle"></i>';

  } else {
    if (playerNumb == numb) {
      if (playerNumb != 1) {
        document.getElementById('readyUpBtn').style.display = 'none';
        document.getElementById('readiedBtn').style.display = 'inline-block';
      }
      const userProfile = document.getElementById(`userName-${numb}`);
      userProfile.innerHTML = userName + ' (You) <i class="far fa-check-circle"></i>';
    } else {
      const userProfile = document.getElementById(`userName-${numb}`);
      if (userProfile == null) {
        return;
      }
      userProfile.innerHTML = userName + ' <i class="far fa-check-circle"></i>';
    }
  }
});


// copy game code
let inputField = document.getElementById("gameCodeDisplay");
let HTMLButton = document.getElementById("HTMLButton");

document.getElementById("startGameBtn").onclick = function () {
  sock.emit('startGameHost', playerNumb);
};

HTMLButton.onclick = function () {
  var textArea = document.createElement("textarea");
  textArea.value = inputField.textContent;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("Copy");
  textArea.remove();
  HTMLButton.innerText = "Code Copied";
}
