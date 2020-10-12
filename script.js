var input, scoringLog, game;
var rows = 5;
var cols = 5;
var startGame = document.getElementById("startgame");
var displayZone = document.getElementById("displayzone");
var inputZone = document.getElementById("inputzone");
var joinGame = document.getElementById('joingame');
var messageZone = document.getElementById('messagezone');
var header = document.getElementById('header');
var validWords = {};

//Create User per session
let user = sessionStorage.getItem("user");
if (!user) {
    sessionStorage.setItem("user","default");
    sessionStorage.setItem("userID",Math.floor(10000000*Math.random()));
    sessionStorage.setItem("currentGame",0);
    sessionStorage.setItem("score",0);
} else {
    user = sessionStorage.getItem("user");
}

//FIREBASE CODE AND FUNCTIONS
function createGame() {
    var gameCode;
    
    gameCode = new Array(5).fill().map(() => getNewLetter()).join().replace(/,/gi,"");
 
    firebase.database().ref('games/' + gameCode).set({
        board: createBoard(),
        currentUsers: null,
        messages: null,
        id: Math.floor(Math.random() * 100000000)
    });
        
    return gameCode;
}


function getNewLetter() {
  var letter = "";
  //likelihood of a consonant is represented by number of times in string
  //frequency derived from: http://pi.math.cornell.edu/~mec/2003-2004/cryptography/subs/frequencies.html
  let consonants = "BBCCCDDDDFFGGHHHHHHJKKLLLLMMMNNNNNNNPPQRRRRRRSSSSSSTTTTTTTTTVWWXYYZ";
  let vowels = "AEIOU";
  if (Math.random() < 0.40) {
    letter = vowels.charAt(Math.floor((Math.random() * vowels.length)));
  } else {
    letter = consonants.charAt(Math.floor((Math.random() * consonants.length)));
  } 
  
  return letter;
}

//boggle board
function createBoard(game) {    
  let board = Array(rows).fill().map(() => Array(cols).fill(0));
  
  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      board[i][j] = getNewLetter();
    }
  }
  return board;
}

function createDisplayBoard(board) {
  //create html board
  displayZone.innerHTML = "";

  var displayBoard = document.createElement("table");
  var body = document.createElement("tbody");

  for (var i = 0; i < rows; i++) {
    var row = document.createElement("tr");
    
    for (var j = 0; j < cols; j++) {
      var cell = document.createElement("td");
      cell.id = "cell" + (i*rows + j);
      cell.innerHTML = board[i][j]; 
      
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
  
  displayBoard.appendChild(body);
  displayZone.appendChild(displayBoard);
}

function createScoringLog(messagesRef) {
    document.getElementById("c1").innerHTML = "";
    var listTitle = document.createElement("h2");
    listTitle.innerHTML = "Words Found";
    document.getElementById("c1").appendChild(listTitle);
    
    scoringLog = document.createElement("ul");
    scoringLog.id = "scoringlog";
    
    var counter = 0;
    if (messagesRef) {
        messagesRef.forEach(function(childSnapshot) {
                scoringLog.appendChild(createScoringMessageElement(childSnapshot.val()["msg"]));
                counter++;
        });
    } else {
        var newGameMessage = document.createElement("li");
        newGameMessage.innerHTML = "NEW BOGGLE GAME STARTED! 60 SECONDS REMAIN!";
        scoringLog.appendChild(newGameMessage);
    }

    document.getElementById("c1").classList.remove("hidden");
    document.getElementById("c1").appendChild(scoringLog);
}

function createScoringMessageElement(msg) {
    var newMsg = document.createElement("li");
    newMsg.innerHTML = msg;
    return newMsg;
}

function loadGame(gameCode) {
    //if mouseEvent is passed through, then startGame was chosen so create new one
    if (gameCode instanceof MouseEvent) { 
        gameCode = createGame();
    }

    sessionStorage.setItem("currentGame", gameCode);

    //retrieve game snapshot from db and perform actions
    var gamesRef = firebase.database().ref("games/" + gameCode);
    gamesRef.once("value").then(function(snapshot) {
         //LOAD EVERYTHING!!!
        createDisplayBoard(snapshot.child("board").val());
        createScoringLog(snapshot.child("messages") || null);
        loadLeaderBoard(snapshot.child("users"));
    }); 
    displayGameCode(gameCode);

    //add update handler
    firebase.database().ref("games/" + sessionStorage.getItem("currentGame") + "/board/{row}/{col}").on("child_changed",(snapshot) => {
        createDisplayBoard(snapshot.child("board").val());
    });

    //save user as game player
    gamesRef.child("users").child(sessionStorage.getItem("user")).set({
        id: sessionStorage.getItem("uuid"),
        score: 0,
    });
    //hide start button and create input field
    joinGame.style.display = "none";
    startGame.style.display = "none";
    
    //create input listener for user guesses
    input = document.createElement("input");
    input.id = "input";
    input.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
            var word = this.value.toUpperCase();
            word = word.replace(/\s+/g, '');
            this.value = "";
            var gameRef = firebase.database().ref("games/" + sessionStorage.getItem("currentGame"));
            gameRef.once("value").then(function(snapshot) {
                var path = checkWordExists(word, snapshot.child("board").val());
                if (isValidWord(word) && path.length != 0) {
                    shuffleCells(path);
                    //increment score for user
                    let score = scoreWord(word);
                    firebase.database().ref("games/" + sessionStorage.getItem("currentGame") + "/users/" + sessionStorage.getItem("user") + "/score").set(firebase.database.ServerValue.increment(score));
                    //add message
                    addFoundWordMessage(word,score);
                    loadLeaderBoard(snapshot.child("users"));
                }
            });

            
        }
    });
    inputZone.appendChild(input);
}


function loadLeaderBoard(usersRef) {
    document.getElementById("c2").innerHTML = "";
    var listTitle = document.createElement("h2");
    listTitle.innerHTML = "Leaderboard";
    document.getElementById("c2").appendChild(listTitle);

    var query = firebase.database().ref("games/" + sessionStorage.getItem("currentGame") + "/users").orderByKey();
    var leaderboard = document.createElement("ul");
    query.once("value").then(function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            var username = childSnapshot.key;
            var score = childSnapshot.val()["score"];

            var newMsg = document.createElement("li");
            newMsg.innerHTML = `${username}: ${score || 0} pts`;
            leaderboard.appendChild(newMsg);
        });
    });

    document.getElementById("c2").classList.remove("hidden");
    document.getElementById("c2").appendChild(leaderboard);
}

function displayGameCode(gameCode) {
  var gameCodeLabel = document.createElement("h2");
  gameCodeLabel.innerHTML = `Game Code: ${gameCode}`;
  header.appendChild(gameCodeLabel);  
}

function scoreWord(word) {
  let scorer = {
    "A":1, "B":3, "C":3, "D":2, "E":1,
    "F":4, "G":2, "H":4, "I":1, "J":8,
    "K":5, "L":1, "M":3, "N":1, "O":1,
    "P":3, "Q":10, "R":1, "S":1, "T":1,
    "U":1, "V":4, "W":4, "X": 8, "Y": 4, "Z":10
  };
  
  let score = 0;
  
  //score based on letter
  for (var i = 0; i < word.length; i++) {
    score += scorer[word[i]];
  }
  
  //score based on length
  if (word.length < 6) {
    score += word.length;
  } else {
    score += word.length * 2;
  }

  return score;
}

function isValidWord(word) {
  return true;
}

function addFoundWordMessage(word, score) {
    var messagesRef = firebase.database().ref("games/" + sessionStorage.getItem("currentGame") + "/messages");

    var newMsgRef = messagesRef.push();
    var newmsg = `${sessionStorage.getItem("user")} found ${word} for ${score} points`
    newMsgRef.set({
        "msg": newmsg
    });

    document.getElementById("scoringlog").appendChild(createScoringMessageElement(newmsg));
    
} 

function checkWordExists(word, board) {
    //check if word is in boggleboard
    //if so, track the cells it is in an return them in "path"
    var cellMap = {};
    

    //remove duplicates from word or else cellMap gets populated per instance in board
    var uniqueLetters = new Set();
    for (let letter of word) {
        uniqueLetters.add(letter);
    }
    uniqueLetters = [...uniqueLetters].join('');
    
    //populate cellMap with all occurences of letters 
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            for (let letter of uniqueLetters) {
                if (board[i][j] === letter) {
                    if (!cellMap[letter]) {
                        cellMap[letter] = [[i,j]];
                } else {
                    cellMap[letter].push([i,j]);
                }
            } 
        }
        }
    }

        
    
    var path = new Array();
    for (let letter of word) { //if one of the letters is not in board, return no path
        if (!cellMap[letter]) {
            return path
        }
    }
    
    var r,c;
    for (var i = 0; i < cellMap[word[0]].length; i++) {
        [r,c] = cellMap[word[0]][i];
        path.push(new Array(r,c));
        path = checkWordExists_helper(word, cellMap, path, 1);
        if (path.length != word.length ) {
            path.pop();
        } else {
            break;
        }
    }
    return path;  
}

function checkWordExists_helper(word, cellMap, path, letterIndex) {
  //writing this made me want to cry
  if (letterIndex == word.length) {
    return path;
  }
  
  var r,c,nr,nc;
  var letter = word[letterIndex]; 
  
  for (var j = 0; j < cellMap[letter].length; j++) {
    [r,c] = path[path.length-1];
    [nr, nc] = cellMap[letter][j];
    
    if (!isArrayInArray([nr,nc],path)) {
      path.push(new Array(nr,nc));      
      if (isNextTo(r,c,nr,nc)) {
        path = checkWordExists_helper(word,cellMap,path,letterIndex + 1);
        if (path.length == word.length) {
          return path;
        }
      }
      path.pop();
    }
  }
  
  return path;
  
}

function printPath(path) {
  console.log("PATH PRINT: [")
  for (var i = 0; i < path.length; i++) {
    console.log(`[${path[i][0]}, ${path[i][1]}]`);
  }
  console.log("]");
}

function isArrayInArray(arrToCheck, arr) { //assume arrToCheck and arr subarrays are same size
  for (var i = 0 ; i < arr.length; i++) {
    var subarr = arr[i];
    var flag = false;
    for (var j = 0; j < subarr.length; j++) {
      if (arrToCheck[j] == subarr[j]) {
        flag = true;
      } else {
        flag = false;
        break;
      }
    }
    
    if (flag) {
      return true;
    }
  }
  return false;
}

function isNextTo(r1,c1,r2,c2) { //uses euclidean distance to determine if (r1,c1) is next to (r2,c2)
  return (Math.pow(r2-r1,2) + Math.pow(c2-c1,2) <= 2); 
}
  
function shuffleCells(path) { //get new letters and make cells temporarily red
  
  firebase.database().ref("games/" + sessionStorage.getItem("currentGame")).child("board").once("value").then(function(snapshot) {
    var r,c;
    var board = snapshot.val();

    for (var i = 0; i < path.length; i++) {
        [r,c] = path[i];
        
        board[r][c] = getNewLetter();
        
        var cellID = "cell" + (r * rows + c);

        var cell = document.getElementById(cellID);
        cell.innerHTML = board[r][c];
        
        cell.classList.add("fadeBlinkRed");
      }
      
      firebase.database().ref("games/" + sessionStorage.getItem("currentGame") + "/board").set(board);

      setTimeout(function() {
        for (var i = 0; i < path.length; i++) {
          [r,c] = path[i];
          var cellID = "cell" + (r * rows + c);
          document.getElementById(cellID).classList.remove("fadeBlinkRed");
        }
      }, 2800);
  });
}

startGame.addEventListener('click', loadGame);
joinGame.addEventListener('click', function(button) {
    //hide start/join buttons
    startGame.classList.add("hidden");
    joinGame.classList.add("hidden");
  
    //create user input button for Game ID
  let joinGameInput = document.createElement("input");
  
  joinGameInput.id = "joinGameInputCode";
  joinGameInput.placeholder = "Enter 5-Letter Game Code";
  joinGameInput.addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
        var inputCode = this.value.toUpperCase();
        var gamesRef = firebase.database().ref("games/");
        gamesRef.once("value").then(function(snapshot) {
            if (snapshot.child(inputCode).exists()) {
                joinGameInput.classList.add("hidden");
                loadGame(inputCode);
            } else {
                joinGameInput.value = "";
                joinGameInput.placeholder = "Game does not exist. Try again!";
            }
        });
    }
  });
  inputZone.appendChild(joinGameInput);
});

document.getElementById("usernameinput").addEventListener('keyup', function(e) {
    if (e.key === "Enter") {
        var username = this.value;
        //check for curse words???
        sessionStorage.setItem("user",username);
        
        //hide stuff and show stuff
        document.getElementById("usernameinput").classList.add("hidden");
        startGame.classList.remove("hidden");
        joinGame.classList.remove("hidden");
    }
});
 
///
const fileURL = 'data/words.txt' // provide file location

fetch(fileURL)
  .then(response => response.text())
  .then(data => {
  	// Do something with your data
  	console.log(data);
  });
/*
//load words from txt file
const reader = new FileReader();

reader.onload = (event) => {
    const file = event.target.result;
    const allLines = file.split(/\r\n|\n/);
    // Reading line by line
    allLines.forEach((word) => {
        if (!validWords[word[0]]) {
            validWords[word[0]] = [];
        } 
        validWords[word[0]] = word;
        console.log(word);
    });
};

reader.onerror = (event) => {
    alert(event.target.error.name);
};

reader.readAsText("data/words.txt");*/
