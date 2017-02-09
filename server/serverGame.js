


function Game(){
    this.gameWords = [];
    this.currentWord = "";
    this.round = 0;
    this.drawer = null;
    this.gamerunning = false;
    this.startCount = 60;
    this.count = 0;
    this.t = 0;
    this.timerOn = 0;
    this.users = [];
}

Game.prototype.calculateHighest = function(){
    var highest = this.users[0].score;
    for(var i = 0; i < this.users.length; i++){
        if (this.users[i].score > highest) {
            highest = this.users[i].score;
        }
    }
    var winners = [];
    for(i = 0; i < this.users.length; i++) {
        if (this.users[i].score == highest) {
            winners.push(this.users[i]);
        }
    }
    return winners;
};

Game.prototype.resetScores = function(){
    for(var i = 0; i < this.users.length; i++){
        this.users[i].score = 0;
    }
};

Game.prototype.newRound = function(socket){
    this.drawer = socket;
    this.round++;
    this.currentWord = this.gameWords[Math.floor(Math.random()*this.gameWords.length)];
};


module.exports= Game;
