const width = 1400;
const height = 800;

class Game{
constructor(code){
  this.started = false;
  this.code = code;
  this.guestCount = 0;
  this.colorPalet = ["#8a2be2", "#98f5ff", "#1874cd", "#7fffd4", "#ff4040", "#ff7f24", "#32cd32", "#008b00", "#ff69b4", "#ffff00", "#fafad2"];
  this.roundRunning = false;
  this.currentRound = 0;
  this.roundCount = 13;
  this.playersReady = [];
  this.gameTimeOut = null;
  this.shopTimeOut = null;
  this.shopCountDown = 40;
  this.abilityTimeOut = {};
  this.oldCoords = [];
  this.abilitiesOrder = {};
  this.activeAbilities = {};
  this.holeList = [];
  this.hole = {};
  this.makeHoles = false;
  this.players = [];
  this.playersLeft = [];
  this.deadPlayers = [];
  this.playersAlive = 0;
}

//place a player at a random point on the screen
newRandomPlayerPos(){
  for (var i = 0; i < this.players.length; i++){
    //const color = `hsl(${Math.random() * 360}, 50%, 50%)`
    var y = Math.random()*height;
    var x = Math.random()*width;
    this.players.forEach((enemy, index) =>{
      if (enemy.coords != null) {
        const dist = Math.hypot(x - enemy.coords.x, y - enemy.coords.y);
        if (dist - enemy.radius - enemy.radius < 30) {
          this.newRandomPlayerPos();
          return;
        }
      }
    });
    //border hit
    if(x + this.players[i].radius < 10 ||
       x - this.players[i].radius > width-10 ||
       y + this.players[i].radius < 10 ||
       y - this.players[i].radius > height-10
     ){
       this.newRandomPlayerPos();
       return;
    }
    var angle = Math.atan2(
        Math.random()*height - y,
        Math.random()*width - x);
    this.players[i].coords = {
        x: x,
        y: y,
        angle: angle,
        velocity: {
          x: Math.cos(angle),
          y: Math.sin(angle)
        }
      };
    this.players[i].alive = true;
    }
  }

  abilityTimer(numb){
    this.abilityTimeOut[numb] = setTimeout(() =>{
      this.abilityTimeOut[numb] = null;
    }, 500);
  }
}

class Player{
  constructor(coords, color, name, playerNumb, image){
    this.coords = coords;
    this.score = 0;
    this.balance = 100;
    this.numb = playerNumb;
    this.name = name;
    this.img = image;
    this.radius = 2;
    this.color = color;
    this.alive = false;
    this.place = 0;
    this.multiplier = 1;
    this.lastHole = 80;
    this.lastPos = [];
    this.makeHole = [];
    this.currentHole = null;
    this.turnAngle = 0.025;
  }

  //update a players angle when a button is pressed
  leftBtnPressed(){
    var angle = this.coords.angle - this.turnAngle;
    this.coords.angle = angle;
    this.coords.velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
  }

  //update a players angle when a button is pressed
  rightBtnPressed(){
    var angle = this.coords.angle + this.turnAngle;
    this.coords.angle = angle;
    this.coords.velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
  }

  //w button is pressed: use ability and change some specs
  useSlowness(game){
    this.multiplier = 0.75;

    setTimeout(() =>{
      this.multiplier = 1;
    }, 5000);
  }

  useSpeed(game){
    this.multiplier = 1.25;

    setTimeout(() => {
      this.multiplier = 1;
    }, 5000);
  }

  useTeleport(game){
    if (game == null) {
      return;
    }
    const player = this.pickRandomPlayer(game, false);

    if (player == null) {
      return;
    }

    var tempCoords = player.coords;
    player.coords = this.coords;
    this.coords = tempCoords;
  }

  useCubic(){
    this.turnAngle = 0.15;

    setTimeout(() => {
      this.turnAngle = 0.025;
    }, 5000);
  }

  useClear(game, io, roomName){
    game.oldCoords = [];
    game.holeList = [];
    game.hole = {};
    io.to(roomName).emit('clearBoard');
  }

  useCurve(){
    this.turnAngle = 0.05;

    setTimeout(() => {
      this.turnAngle = 0.025;
    }, 5000);
  }

  useRandomDeath(game, io, roomName){
    const player = this.pickRandomPlayer(game, true);
    if (player == null) {
      return;
    }
    player.killplayer(game, io, 0, roomName, false);
  }

  useShootHoles(game){
    var coordsY = this.coords.y;
    var coordsX = this.coords.x;
    for (var i = 0; i < 50; i++) {
      coordsX = coordsX + (this.coords.velocity.x * 2);
      coordsY =  coordsY + (this.coords.velocity.y * 2);

      game.oldCoords.forEach((coords, index) =>{
        const dist = Math.hypot(coordsX - coords.x, coordsY - coords.y);

        if (dist < 5) {
           game.players.forEach((player, i) => {
             if (player.numb ==  game.oldCoords[i].playerNumb) {
               player.makeHole.push({x: coordsX, y: coordsY});
               game.makeHoles = true;
             }
           });

           game.oldCoords.splice(index, 1);
           return;
         }
       });
    }
  }

  //random player picker for some abilities
  pickRandomPlayer(game, useOwn){

    if (game.playersAlive < 2) {
      return null;
    }

    var randomPlayerNumb = Math.floor(Math.random() * game.players.length);
    var player = game.players[randomPlayerNumb];

    if (player.alive == true) {

      if (useOwn) {
        return player;
      }else{

        if (player.numb == this.numb) {
          return this.pickRandomPlayer(game, useOwn);
        }else{
          return player;
        }
      }
    }
  }

  //update a players position to go on with the game
  update(game, io, roomName){
    if (this.alive == true) {
      if (!game.oldCoords.includes(
        {
          x: this.coords.x,
          y: this.coords.y,
          playerNumb: this.numbbalance
        })){

        //loop for updating players Pos
        //saving older pos while creating hole so the animation on the client side runs smoother
        if (this.lastPos.length > 0) {

          if (this.lastHole == 7) {
            this.lastHole = 80;
            game.holeList.push(this.lastPos[3]);
            var temp = this.lastPos;
            this.lastPos = [false];
            for (var i = 0; i < temp.length; i++) {
              this.lastPos.push(temp[i]);
            }
            game.hole[this.lastPos[3]] = this.lastPos;
            this.lastPos = [];
            game.oldCoords.push({x: this.coords.x, y: this.coords.y, playerNumb: this.numb});
          }else if(this.lastHole < 7){
            this.lastHole++;
            var temp = this.lastPos;
            this.lastPos = [{x: this.coords.x, y: this.coords.y}];
            for (var i = 0; i < temp.length; i++) {
              this.lastPos.push(temp[i]);
            }
          }

        }else{

          if (this.lastHole < 1) {
            this.lastPos.push({x: 0, y: 0});
          }

          game.oldCoords.push({x: this.coords.x, y: this.coords.y, playerNumb: this.numb});
          this.lastHole = this.lastHole - Math.floor(Math.random() * 2);
        }
      }

      this.coords.x = this.coords.x + (this.coords.velocity.x * 2 * this.multiplier);
      this.coords.y = this.coords.y + (this.coords.velocity.y * 2 * this.multiplier);

      //check if a player hits another one or the border
      //border hit
      if(this.coords.x + (this.radius*2) < 0 ||
         this.coords.x - (this.radius*2) > width ||
         this.coords.y + (this.radius*2) < 0 ||
         this.coords.y - (this.radius*2) > height
       ){
         if (!game.deadPlayers.includes(this)) {
           this.killplayer(game, io, 0, roomName, true);
           return;
         }
        }

       //enemy hit / own hit
       if(!game.deadPlayers.includes(this)){
           game.oldCoords.forEach((coords) =>{
             const dist = Math.hypot(this.coords.x - coords.x, this.coords.y - coords.y);

             if ((dist < 1.5 && this.multiplier == 1 )|| (dist < 0.80 && this.multiplier == 0.75)|| (dist < 1.20 && this.multiplier == 1.25)) {
                this.killplayer(game, io, coords.playerNumb, roomName, true);
                return;
              }
            });
          }
        }

        this.testForHolePass(game);
   }

   //check for extra points (not working)
   testForHolePass(game){
     game.holeList.forEach((coords, i) => {
       var dist = Math.hypot(this.coords.x - coords.x, this.coords.y - coords.y);

       if (dist < 15) {
         let gavePoints = false;
         var holes = game.hole[coords];

         for (var i = 1; i < holes.length; i++) {
           dist = Math.hypot(this.coords.x - holes[i].x, this.coords.y - holes[i].y);

           if (dist < 2 && !gavePoints) {
             console.log('hit!');
             gavePoints = true;
             if (holes[0] == false) {
               console.log('+5 Points');
               game.hole[coords][0] = true;
               this.balance+=25;
             }
           }
         }
       }
     });
   }


   //kill the current player & give everyone points for survivin
   killplayer(game, io, killerNumb, roomName, givePoints){
     let playersAlive = 0;
     game.players.forEach((player, i) => {
       if (player.alive) {
         playersAlive++;
       }
     });
     this.alive = false;
     this.place = playersAlive;
     game.playersAlive -= 1;
     io.to(roomName).emit('playerDied', this.numb, this.place);
     if (givePoints) {
       game.players.forEach((item, i) => {

         if (item.alive) {
           item.score+=1;
           this.balance+=25;
         }
         if (item.numb == killerNumb && this.numb != killerNumb) {
           this.balance+=50;
         }
       });
     }
   }
}

module.exports = { game: Game,
  player: Player,
  width: width,
  height: height};
