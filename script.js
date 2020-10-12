var input, scoringLog, game;
var rows = 5;
var cols = 5;
var startGame = document.getElementById("startgame");
var displayZone = document.getElementById("displayzone");
var inputZone = document.getElementById("inputzone");
var joinGame = document.getElementById('joingame');
var messageZone = document.getElementById('messagezone');
var header = document.getElementById('header');
var games = {};

var firebaseConfig = {
    apiKey: "AIzaSyDg8hvVYDq00LKJ6xjBRC7awmH-xIB0SMU",
    authDomain: "battleboggle.firebaseapp.com",
    databaseURL: "https://battleboggle.firebaseio.com",
    projectId: "battleboggle",
    storageBucket: "battleboggle.appspot.com",
    messagingSenderId: "681048682309",
    appId: "1:681048682309:web:c46653f8a90b6ee7b8582c",
    measurementId: "G-9SJ9ETWY86"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

//create a user per session to store their ID and gameID
let user = sessionStorage.getItem("userID");
if (!user) {
  user = {"id":Math.floor(10000000*Math.random()),
          "gameID":null};
  sessionStorage.setItem("user",user);
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

function createDisplayBoard() {
  //create html board
  var displayBoard = document.createElement("table");
  var body = document.createElement("tbody");
    
  var board = game["board"];
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

function createScoringLog() {
  scoringLog = document.createElement("ul");
  scoringLog.id = "scoringlog";
  
  
  if (game["messages"].length) {
    for (let msg in game["messages"]) {
      var newMsg = document.createElement("li");
      newMsg.innerHTML = msg;
      scoringLog.appendChild(document.createElement("li"));
    }
  } else {
    var newGameMessage = document.createElement("li");
    newGameMessage.innerHTML = "NEW BOGGLE GAME STARTED! 60 SECONDS REMAIN!";
    scoringLog.appendChild(newGameMessage);
  }  

  messageZone.appendChild(scoringLog);
}

function loadGame(gameCode) {
  if (gameCode instanceof String) { //if gameCode is passed
    game = games[gameCode]
  } else { //no gamecode is passed
    game = games[gameCode = createNewGame()];    
  }
  
  createDisplayBoard();
  createScoringLog();
  displayGameCode(gameCode);
 
  
  //hide start button and create input field
  joinGame.style.display = "none";
  startGame.style.display = "none";
  input = document.createElement("input");
  input.id = "input";
  input.addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      console.log(this.value);
      var word = this.value.toUpperCase();
      word = word.replace(/\s+/g, '');
      this.value = "";
      var path = checkWordExists(word);
      console.log(path, word);
      if (isValidWord(word) && path.length != 0) {
        shuffleCells(path);
        let score = scoreWord(word);
        addFoundWordMessage(word,score);
        
      }
    }
  });
  inputZone.appendChild(input);
} 

function displayGameCode(gameCode) {
  var gameCodeLabel = document.createElement("h2");
  gameCodeLabel.innerHTML = `Game Code: ${gameCode}`;
  header.appendChild(gameCodeLabel);  
}

//create a new game object
function createNewGame() {
  var gameCode;
  do {
    gameCode = new Array(5).fill().map(() => getNewLetter()).join().replace(/,/gi,"");
  } while (games.gameID);
  
  games[gameCode] = {
    "board": createBoard(),
    "users": new Array(),
    "messages": new Array(),
    "id": Math.floor(Math.random() * 100000000),
    "max lobby": 5
    "players": new Array()
  };  
  
  return gameCode;
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
  var newMsg = document.createElement("li");
  newMsg.innerHTML = `${word} was found for ${score} points`;
  
  scoringLog.appendChild(newMsg);
  var msgs = scoringLog.getElementsByTagName("li");
  if (msgs.length >= 10) {
    msgs = msgs.slice(1,11);
  }

}

function checkWordExists(word) {
  //check if word is in boggleboard
  //if so, track the cells it is in an return them in "path"
  var cellMap = {};
  var board = game["board"];
  
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
  var r,c;
  var board = game["board"];
  
  for (var i = 0; i < path.length; i++) {
    [r,c] = path[i];
    console.log("CELL CHANGING: " + r + " " + c + " " + board[r][c]);
    
    board[r][c] = getNewLetter();
    
    var cellID = "cell" + (r * rows + c);
    console.log(cellID);
    var cell = document.getElementById(cellID);
    cell.innerHTML = board[r][c];
    
    cell.classList.add("fadeBlinkRed");
  }
  
  setTimeout(function() {
    for (var i = 0; i < path.length; i++) {
      [r,c] = path[i];
      var cellID = "cell" + (r * rows + c);
      document.getElementById(cellID).classList.remove("fadeBlinkRed");
    }
  }, 2800);
}

startGame.addEventListener('click', loadGame);
joinGame.addEventListener('click', function(button) {
  startGame.style.display = "none";
  joinGame.style.display = "none";
  /*
  let backButton = document.createElement("button");
  backButton.addEventListener('click', function() {
    location.reload();
  });
  inputZone.appendChild(backButton);*/
  
  let joinGameInput = document.createElement("input");
  
  joinGameInput.id = "joinGameInputCode";
  joinGameInput.placeholder = "Enter 5-Letter Game Code";
  joinGameInput.addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      if (games[this.value.toUpperCase()]) { //if code is valid
        joinGameInput.style.display = "none";
        loadGame(this.value.toUpperCase());
      } else {
        joinGameInput.value = "";
        joinGameInput.placeholder = "Game does not exist. Try again!";
      }
        
    }
  });
  inputZone.appendChild(joinGameInput);
});

alert("IS WORKING")



