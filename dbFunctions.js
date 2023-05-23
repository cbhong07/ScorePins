const bgen = require("./BowlingGen.js");
const MongoClient = require('mongodb').MongoClient;

async function createUser(usernameInput, passwordInput, collection) {

  const user = await collection.findOne({ "username": usernameInput })

  if (user) {
    alert("That username is already taken try a different one");
    return false;
  }
  else {
    let myObj = {
      username: usernameInput,
      password: passwordInput,
      average: NaN,
      avgStrikes: NaN,
      avgSpares: NaN,
      avgFirstBall: NaN,
      incomingFriends: [],
      outgoingFriends: [],
      friends: [],
      brackets: []
    }
    await collection.insertOne(myObj);
    return true;
  }
}

async function changePassword(username, password, userCollection) {
  await userCollection.updateOne({ username: username }, { $set: { password: password } });
  return "password was changed"
}

async function insertGame(game, username, client) {
  var myDB = client.db("Bowling");
  let myObj = {
    date: new Date(),
    score: bgen.getScore(game),
    strikes: bgen.getStrikes(game),
    spares: bgen.getSpares(game),
    firstBall: bgen.getFirstBall(game),
    frame1: game[0],
    username: username,
    frame10: game[9],
    frame2: game[1],
    frame3: game[2],
    frame4: game[3],
    frame5: game[4],
    frame6: game[5],
    frame7: game[6],
    frame8: game[7],
    frame9: game[8]
  }
  myDB.collection("games").insertOne(myObj, function (err, res) {
    if (err) throw err;
  });

  await recalcAverages(username, client);
}

async function getScores(usernameInput, gameCollection) {
  const query = { username: usernameInput };
  return new Promise(function (resolve, reject) {
    gameCollection.find(query).toArray(function (err, games) {
      if (err) {
        return reject(err);
      }
      return resolve(games);
    });
  });
}

async function getScoreboard(gameCollection) {
  const results = await gameCollection.find().sort({ score: -1 }).limit(10).toArray();
  return results;
}

function createScoreTable(games) { //adjust so scoreboard displays games player
  let tableBody = '<tr>';

  // Loop through the games array and add each game to the table
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    tableBody += `<td>${game.date.toDateString()}</td>`
    for (let j = 1; j <= 10; j++) {
      const frame = game[`frame${j}`];
      let roll1 = frame.roll1;
      let roll2 = frame.roll2;
      let roll3 = '';

      if (roll1 === 10) {
        roll1 = 'X';
        roll2 = '';
      }
      else if (roll1 + roll2 === 10) {
        roll2 = '/';
      }
      else if (roll1 === 0) {
        roll1 = '-';
      }
      else if (roll2 === 0) {
        roll2 = '-';
      }

      if (j == 10) {
        roll3 = frame.roll3;
        if (roll3 === 10) {
          roll3 = 'X';
        }
        else if (roll2 + roll3 === 10) {
          roll3 = '/';
        }
        else if (roll3 === 0) {
          roll3 = '-'
        }
        else if (isNaN(roll3)) {
          roll3 = '';
        }
      }
      tableBody += `<td>${roll1}</td><td>${roll2}</td>`;
      if (j === 10) {
        tableBody += `<td>${roll3}</td>`;
      }
    }
    tableBody += `<td>${game.score}</td>`;
    tableBody += '</tr>';
  }
  return tableBody
}

function createGameTable(game) { //adjust so scoreboard displays games player
  let tableBody = '<table><thead><tr><th colspan="2">Frame 1</th><th colspan="2">Frame 2</th><th colspan="2">Frame 3</th><th colspan="2">Frame 4</th><th colspan="2">Frame 5</th><th colspan="2">Frame 6</th><th colspan="2">Frame 7</th><th colspan="2">Frame 8</th><th colspan="2">Frame 9</th><th colspan="3">Frame 10</th><th>Score</th></tr></thead><tbody><tr>';

  // Loop through the games array and add each game to the table
  for (let j = 0; j < 10; j++) {
    const frame = game[j];
    let roll1 = frame.roll1;
    let roll2 = frame.roll2;
    let roll3 = '';

    if (roll1 === 10 && j === 9) {
      roll1 = 'X'
    }
    else if (roll2 === 10) {
      roll2 = 'X'
    }
    else if (roll1 === 10) {
      roll1 = 'X';
      roll2 = '';
    }
    else if (roll1 + roll2 === 10) {
      roll2 = '/';
    }
    else if (roll1 === 0) {
      roll1 = '-';
    }
    if (roll2 === 0) {
      roll2 = '-';
    }

    if (j == 9) {
      roll3 = frame.roll3;
      if (roll3 === 10) {
        roll3 = 'X';
      }
      else if (roll2 + roll3 === 10) {
        roll3 = '/';
      }
      else if (roll3 === 0) {
        roll3 = '-'
      }
      else if (isNaN(roll3)) {
        roll3 = '';
      }
    }
    tableBody += `<td>${roll1}</td><td>${roll2}</td>`;
    if (j === 9) {
      tableBody += `<td>${roll3}</td>`;
    }
  }
  let score = bgen.getScore(game);
  tableBody += '<td>' + score + '</td>';
  tableBody += '</tr></tbody></table>';

  return tableBody
}

async function createVersusTable(username, userCollection, gameCollection) {
  let tableBody = "";
  let user = await userCollection.findOne({ username: username });
  let friends = user.friends;
  for (let i = 0; i < friends.length; i++) {
    if (await gameCollection.findOne({ username: friends[i] })) {
      tableBody += `<tr><td>${friends[i]}</td><td> <form action="/versus" method="POST"><button id="genGameButton" class="sim-button" type="submit">Play</button><input type="hidden" name="friend" value="${friends[i]}"></form></td></tr>`
    }
  }
  return tableBody;
}

function createScoreboardTable(games) { //adjust so scoreboard displays games player
  let tableBody = '<tr>';

  // Loop through the games array and add each game to the table
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    tableBody += `<td>${game.date.toDateString()}</td>`
    tableBody += `<td>${game.username}</td>`
    for (let j = 1; j <= 10; j++) {
      const frame = game[`frame${j}`];
      let roll1 = frame.roll1;
      let roll2 = frame.roll2;
      let roll3 = '';

      if (roll1 === 10) {
        roll1 = 'X';
        roll2 = '';
      }
      else if (roll1 + roll2 === 10) {
        roll2 = '/';
      }
      else if (roll1 === 0) {
        roll1 = '-';
      }
      else if (roll2 === 0) {
        roll2 = '-';
      }

      if (j == 10) {
        roll3 = frame.roll3;
        if (roll3 === 10) {
          roll3 = 'X';
        }
        else if (roll2 + roll3 === 10) {
          roll3 = '/';
        }
        else if (roll3 === 0) {
          roll3 = '-'
        }
        else if (isNaN(roll3)) {
          roll3 = '';
        }
      }
      tableBody += `<td>${roll1}</td><td>${roll2}</td>`;
      if (j === 10) {
        tableBody += `<td>${roll3}</td>`;
      }
    }
    tableBody += `<td>${game.score}</td>`;
    tableBody += '</tr>';
  }
  return tableBody
}

async function createAverageTable(userCollection, gameCollection) { //adjust table shows username average and best game with date
  const results = await userCollection.find().sort({ average: -1 }).limit(10).toArray();

  let tableBody = "";
  for (let i = 0; i < results.length; i++) {
    const bestGame = await gameCollection.findOne(
      { username: results[i].username },
      { sort: { score: -1 } });
    let userGames = await gameCollection.find({ username: results[i].username }).toArray();
    let numGames = userGames.length;
    if (numGames > 0) {
      tableBody += '<tr>';
      tableBody += `<td>${results[i].username}</td>`;
      tableBody += `<td>${results[i].average.toFixed(2)}</td>`;
      tableBody += `<td>${bestGame.date.toDateString()}</td>`;
      tableBody += `<td>${bestGame.score}</td>`;
      tableBody += '</tr>';
    }
  }
  return tableBody;
}

async function recalcAverages(username, client) {
  var myDB = client.db("Bowling");
  var gameCollection = myDB.collection("games");
  var userCollection = myDB.collection("users");
  let games = await gameCollection.find({ username: username }).sort().toArray();
  let scoreSum = 0;
  let strikeSum = 0;
  let spareSum = 0;
  let firstBallSum = 0;
  for (let i = 0; i < games.length; i++) {
    scoreSum += games[i].score;
    strikeSum += games[i].strikes;
    spareSum += games[i].spares;
    firstBallSum += games[i].firstBall;
  }

  let avgScore = scoreSum / games.length;
  let avgStrikes = strikeSum / games.length;
  let avgSpares = spareSum / games.length;
  let avgFirstBall = firstBallSum / games.length;

  await userCollection.updateOne({ username: username }, { $set: { average: avgScore } });
  await userCollection.updateOne({ username: username }, { $set: { avgStrikes: avgStrikes } });
  await userCollection.updateOne({ username: username }, { $set: { avgSpares: avgSpares } });
  await userCollection.updateOne({ username: username }, { $set: { avgFirstBall: avgFirstBall } });
}

async function getAverages(username, client) {
  var myDB = client.db("Bowling");
  var userCollection = myDB.collection("users");
  let user = await userCollection.find({ username: username }).toArray();

  let tableBody = "<tr>";
  if (!isNaN(user[0].average)) {
    tableBody += `<td>${user[0].average.toFixed(2)}</td>`;
  }
  else {
    tableBody += '<td>No Info</td>'
  }

  if (!isNaN(user[0].avgStrikes)) {
    tableBody += `<td>${user[0].avgStrikes.toFixed(2)}</td>`;
  }
  else {
    tableBody += '<td>No Info</td>'
  }

  if (!isNaN(user[0].avgSpares)) {
    tableBody += `<td>${user[0].avgSpares.toFixed(2)}</td>`;
  }
  else {
    tableBody += '<td>No Info</td>'
  }

  if (!isNaN(user[0].avgFirstBall)) {
    tableBody += `<td>${user[0].avgFirstBall.toFixed(2)}</td>`;
  }
  else {
    tableBody += '<td>No Info</td>'
  }
  tableBody += '</tr>';
  return tableBody;
}

async function sendFriendRequest(username, search, client) {
  var myDB = client.db("Bowling");
  let message = '';
  var userCollection = myDB.collection("users");
  let friend = await userCollection.findOne({ username: search });
  let user = await userCollection.findOne({ username: username })
  let outgoingList = friend.outgoingFriends;
  let hasSent = false;
  outgoingList.forEach(element => {
    if (element === username) {
      addFriend(username, search, client);
      hasSent = true;
      message = search + " was Added as a Friend"
    }
  })

  if (hasSent == false) {
    if (await isFriends(username, search, client)) {
      message = "This user is already your friend"
    }
    else if (user.outgoingFriends.includes(search)) {
      message = "You have already sent this user a friend request"
    }
    else {
      userCollection.updateOne(
        { username: username },
        { $push: { outgoingFriends: search } }
      )
      userCollection.updateOne(
        { username: search },
        { $push: { incomingFriends: username } }
      )
      message = "Friend Request Sent"
    }
  }
  return message;
}

async function addFriend(username, search, client) {
  var myDB = client.db("Bowling");
  var userCollection = myDB.collection("users");
  userCollection.updateOne(
    { username: username },
    {
      $push: { friends: search },
      $pull: { outgoingFriends: search, incomingFriends: search }
    }
  );
  userCollection.updateOne(
    { username: search },
    {
      $push: { friends: username },
      $pull: { outgoingFriends: username, incomingFriends: username }
    }
  );
}

async function removeFriend(username, search, client) {
  var myDB = client.db("Bowling");
  var userCollection = myDB.collection("users");
  if (await isFriends(username, search, client)) {
    userCollection.updateOne(
      { username: username },
      {
        $pull: { friends: search }
      }
    );
    userCollection.updateOne(
      { username: search },
      {
        $pull: { friends: username }
      }
    );
    return search + " has been removed from your friends list"
  }
  else {
    return "That user is not your friend"
  }
}

async function isFriends(username, search, client) {
  var myDB = client.db("Bowling");
  var userCollection = myDB.collection("users");
  let user = await userCollection.findOne({ username: username });
  if (user.friends.includes(search)) {
    return true
  }
  else {
    return false;
  }
}

async function isSent(username, search, client) {
  var myDB = client.db("Bowling");
  var userCollection = myDB.collection("users");
  let user = await userCollection.findOne({ username: username });
  if (user.outgoingFriends.includes(search)) {
    return true;
  }
  else {
    return false;
  }
}

async function createFriendTable(username, userCollection) {
  let user = await userCollection.findOne({ username: username });
  let friendList = user.friends;
  let tableBody = "";
  friendList.forEach(element => {
    tableBody += `<tr><td><a href="">${element}</a></td></tr>`
  });
  return tableBody;
}

async function createPendingTable(username, userCollection) {
  let user = await userCollection.findOne({ username: username });
  let pendingList = user.incomingFriends.concat(user.outgoingFriends);
  let tableBody = "";
  pendingList.forEach(element => {
    if (user.incomingFriends.includes(element)) {
      tableBody += `<tr><td><a href="/foundUser">${element}</a></td><td><form method="POST" action="/addFriend">
      <input type="hidden" name="username" value=${username}>
      <input type="hidden" name="search" value=${element}>
      <button type="submit" class="table-button">Add Friend</button>
    </form></td></tr>`
    }
    else {
      tableBody += `<tr><td><a href="/foundUser">${element}</a></td><td>Sent</td></tr>`
    }
  })
  return tableBody;
}

async function getBracketList(username, userCollection) {
  let user = await userCollection.findOne({ username: username });
  let bracketList = user.brackets;
  let tableBody = "";
  bracketList.forEach(element => {
    tableBody += `<tr><td>${element}</td><td><form method="POST" action="/goToBracket">
    <input type="hidden" name="bracketName" value="${element}">
    <button type="submit" class="insert-button">Go</button>
    </form></td><td><form id="deleteForm" method="POST" action="/deleteBracket">
    <input type="hidden" name="bracketName2" value="${element}">
    <button type="submit" class="insert-button">Delete</button>
    </form></td></tr>`
  });
  return tableBody;
}

async function createBracket(bracketName, users) {
  let userArray = [];
  for (let i = 0; i < users.length; i++) {
    userArray.push(users[i]);
  }
  let bracketState = await buildBracket(bracketName, userArray);
  return bracketState;
}

async function buildBracket(bracketName, userArray) {
  let bracket = `<h1>${bracketName}</h1><article id=\"container\"><section>`;
  for (let i = 0; i < userArray.length; i++) {
    bracket += `<div>${userArray[i]}</div>`;
  }
  bracket += "</section>"
  bracket += "<div class=\"connecter\"><div></div><div></div><div></div><div></div></div>"
  bracket += "<div class=\"line\"><div></div><div></div><div></div><div></div></div>"
  bracket += "<section id=\"quarterFinals\"><div><input type=\"text\" placeholder=\"Winner of 1-2\"></div><div><input type=\"text\" placeholder=\"Winner of 3-4\"></div><div><input type=\"text\" placeholder=\"Winner of 5-6\"></div><div><input type=\"text\" placeholder=\"Winner of 7-8\"></div></section>"
  bracket += "<div class=\"connecter\" id=\"conn2\"><div></div><div></div></div>"
  bracket += "<div class=\"line\" id=\"line2\"><div></div><div></div></div>"
  bracket += "<section id=\"semiFinals\"><div><input type=\"text\" placeholder=\"Winner of 1-2\"></div><div><input type=\"text\" placeholder=\"Winner of 3-4\"></div></section>"
  bracket += "<div class=\"connecter\" id=\"conn3\"><div></div></div>"
  bracket += "<div class=\"line\" id=\"line3\"><div></div></div>"
  bracket += "<section id=\"final\"><div><input type=\"text\" placeholder=\"Champion\"></div></section></article>"
  return bracket;
}

async function getBracket(bracketName, bracketCollection, userid) {
  let bracket = await bracketCollection.findOne({ "bracketName": bracketName, "users": { $regex: userid } });
  let bracketString = "";
  if (bracket != null) {
    bracketString = bracket.bracketState;
  }
  else {
    console.log("bracket is null");
  }
  return bracketString;
}

module.exports.insertGame = insertGame;
module.exports.createUser = createUser;
module.exports.changePassword = changePassword;
module.exports.getScores = getScores;
module.exports.getScoreboard = getScoreboard;
module.exports.createScoreTable = createScoreTable;
module.exports.createGameTable = createGameTable;
module.exports.createVersusTable = createVersusTable;
module.exports.createScoreboardTable = createScoreboardTable;
module.exports.createAverageTable = createAverageTable;
module.exports.getAverages = getAverages;
module.exports.sendFriendRequest = sendFriendRequest;
module.exports.addFriend = addFriend;
module.exports.removeFriend = removeFriend;
module.exports.isFriends = isFriends;
module.exports.isSent = isSent;
module.exports.createFriendTable = createFriendTable;
module.exports.createPendingTable = createPendingTable;
module.exports.getBracketList = getBracketList;
module.exports.createBracket = createBracket;
module.exports.buildBracket = buildBracket;
module.exports.getBracket = getBracket;