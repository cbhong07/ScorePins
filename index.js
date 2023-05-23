const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const bodyparser = require('body-parser');
const session = require('express-session');
const cookieParser = require("cookie-parser");

require('dotenv').config()
const dbFunc = require("./dbFunctions.js");
const userLogin = require("./UserLogin.js");
const bgen = require("./BowlingGen.js");
const { table } = require('console');
const { addUsername } = require('./middleware.js')

var app = express();

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.set('view engine', 'ejs');

const MongoClient = require('mongodb').MongoClient;
const uri = process.env.CONNECTIONURI;
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect();
var myDB = client.db("Bowling");

const oneDay = 1000 * 60 * 60 * 24;
const secret = process.env.SECRET;
app.use(session({
    secret: secret,
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false
}));

app.use(addUsername);

app.get('/', function (req, res) {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.redirect('/homepage')
    }
    else {
        res.render('login.ejs')
    }
});

app.post('/', function (req, res) {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.redirect('/homepage')
    }
    else {
        res.render('login.ejs')
    }
});

app.get('/userLogin', (req, res) => {
    client.connect();
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.redirect('/homepage')
    }
    else {
        res.redirect('/')
    }
});

app.post('/userLogin', async (req, res) => {
    client.connect();
    res.locals.message = undefined;
    if (await userLogin.handleLogin(req.body.username, req.body.password)) {
        let session = req.session;
        session.userid = req.body.username;
        res.redirect('/homepage');
    }
    else {
        res.locals.message = 'Login failed. Please check your username and password and try again.';
        res.render('login.ejs');
    }
});

app.get('/userCreation', (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.redirect('/homepage');
    }
    else {
        res.render('userCreation.ejs');
    }
});

app.post('/userCreation', (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.redirect('/homepage');
    }
    else {
        res.render('userCreation.ejs');
    }
});

app.post('/createUser', async (req, res) => {
    res.locals.message = undefined;
    const collection = client.db('Bowling').collection('users');
    if (await dbFunc.createUser(req.body.username, req.body.password, collection)) {
        res.redirect('/userLogin')
    }
    else {
        res.locals.message = 'Error creating user. Try again';
        res.render('userCreation.ejs');
    }
});

app.post('/changePass', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.render('changePassword.ejs', { user: session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.get('/changePass', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.render('changePassword.ejs', { user: session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.post('/resetPass', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        if (req.body.password1 === req.body.password2) {
            const userCollection = myDB.collection('users');
            res.locals.message = await dbFunc.changePassword(session.userid, req.body.password1, userCollection);
            res.send(`<script>alert('${res.locals.message}');window.location.href = "/logout";</script>`);
        }
        else {
            res.locals.message = "passwords did not match. try again"
            res.send(`<script>alert('${res.locals.message}');window.location.href = "/changePass";</script>`);
        }
    }
    else {
        res.redirect('/')
    }
})

app.post('/homepage', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    const userCollection = myDB.collection('users');
    if (session.userid) {
        let friendTable = await dbFunc.createFriendTable(session.userid, userCollection);
        let pendingTable = await dbFunc.createPendingTable(session.userid, userCollection);
        res.render('homepage.ejs', { friendTable: friendTable, pendingTable: pendingTable, user: req.session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.get('/homepage', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    const userCollection = myDB.collection('users');
    if (session.userid) {
        let friendTable = await dbFunc.createFriendTable(session.userid, userCollection);
        let pendingTable = await dbFunc.createPendingTable(session.userid, userCollection);
        res.render('homepage.ejs', { friendTable: friendTable, pendingTable: pendingTable, user: req.session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.post('/simulation', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        let userCollection = myDB.collection('users');
        let gameCollection = myDB.collection('games');
        let versusTable = await dbFunc.createVersusTable(session.userid, userCollection, gameCollection);
        res.render('simulation.ejs', { tableBody: "", table2: "", user: req.session.userid, versusTable: versusTable })
    }
    else {
        res.redirect('/')
    }
})

app.get('/simulation', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        let userCollection = myDB.collection('users');
        let gameCollection = myDB.collection('games');
        let versusTable = await dbFunc.createVersusTable(session.userid, userCollection, gameCollection);
        res.render('simulation.ejs', { tableBody: "", table2: "", user: req.session.userid, versusTable: versusTable })
    }
    else {
        res.redirect('/')
    }
})

app.post('/genGame', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        const gameCollection = myDB.collection('games');
        const userCollection = myDB.collection('users');
        let game = await bgen.preprocess(gameCollection, userCollection, session.userid);
        let versusTable = await dbFunc.createVersusTable(session.userid, userCollection, gameCollection);
        let tableBody = dbFunc.createGameTable(game)
        res.render('simulation.ejs', { tableBody: tableBody, table2: "", versusTable: versusTable, user: req.session.userid });
    }
    else {
        res.redirect('/')
    }
})

app.get('/genGame', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        const gameCollection = myDB.collection('games');
        const userCollection = myDB.collection('users');
        let game = bgen.preprocess(gameCollection, userCollection, session.userid);
        let versusTable = await dbFunc.createVersusTable(session.userid, userCollection, gameCollection);
        let tableBody = dbFunc.createGameTable(game)
        res.render('simulation.ejs', { tableBody: tableBody, table2: "", versusTable: versusTable, user: req.session.userid });
    }
    else {
        res.redirect('/')
    }
})


app.post('/versus', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        const gameCollection = myDB.collection('games');
        const userCollection = myDB.collection('users');
        let userGame = await bgen.preprocess(gameCollection, userCollection, session.userid);
        let friendGame = await bgen.preprocess(gameCollection, userCollection, req.body.friend);
        let versusTable = await dbFunc.createVersusTable(session.userid, userCollection, gameCollection);
        let tableBody = dbFunc.createGameTable(userGame);
        let table2 = dbFunc.createGameTable(friendGame);
        tableBody = tableBody.substr(0, tableBody.length - 21);
        tableBody += `<td>${session.userid}</td></tr></tbody></table>`
        table2 = table2.substr(0, table2.length - 21);
        table2 += `<td>${req.body.friend}</td></tr></tbody></table>`
        res.render('simulation.ejs', { tableBody: tableBody, table2: table2, versusTable: versusTable, user: session.userid });
    }
    else {
        res.redirect('/')
    }
})

app.get('/versus', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        const gameCollection = myDB.collection('games');
        const userCollection = myDB.collection('users');
        let userGame = await bgen.preprocess(gameCollection, userCollection, session.userid);
        let friendGame = await bgen.preprocess(gameCollection, userCollection, req.body.friend);
        let versusTable = await dbFunc.createVersusTable(session.userid, userCollection, gameCollection);
        let tableBody = dbFunc.createGameTable(userGame);
        let table2 = dbFunc.createGameTable(friendGame);
        res.render('simulation.ejs', { tableBody: tableBody, table2: table2, versusTable: versusTable, user: req.session.userid });
    }
    else {
        res.redirect('/')
    }
})

app.get('/stats', async (req, res) => { //add overview of averages table
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        const gameCollection = myDB.collection('games');
        const games = await dbFunc.getScores(session.userid, gameCollection);
        let averages = await dbFunc.getAverages(session.userid, client);
        let tableBody = dbFunc.createScoreTable(games);
        res.render('stats.ejs', { tableBody: tableBody, averages: averages, user: req.session.userid });
    }
    else {
        res.redirect('/')
    }
})

app.post('/stats', async (req, res) => { //add overview of averages table
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        const gameCollection = myDB.collection('games')
        const games = await dbFunc.getScores(session.userid, gameCollection);
        let averages = await dbFunc.getAverages(session.userid, client);
        let tableBody = dbFunc.createScoreTable(games);
        res.render('stats.ejs', { tableBody: tableBody, averages: averages, user: req.session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.get('/insertGame', (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.render('insertGame.ejs', { userId: session.userid, user: req.session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.post('/insertGame', (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.render('insertGame.ejs', { userId: session.userid, user: req.session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.post('/submitGame', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    const frames = [];
    const alertMessages = [];

    for (let i = 0; i < 9; i++) {
        let roll1 = null;
        let roll2 = null;
        if (req.body[`frame${i}_roll1`] === "x" || req.body[`frame${i}_roll1`] === "X") {
            roll1 = 10;
        }
        else if (req.body[`frame${i}_roll2`] === "/") {
            roll1 = parseInt(req.body[`frame${i}_roll1`]);
            roll2 = 10 - parseInt(req.body[`frame${i}_roll1`]);
        }
        else {
            roll1 = parseInt(req.body[`frame${i}_roll1`]);
            roll2 = parseInt(req.body[`frame${i}_roll2`]);
        }
        if (isNaN(roll2) && roll1 != 10) {
            // Handle missing input
            alertMessages.push(`Missing input for frame ${i + 1}`);
        } else if (roll1 < 0 || roll1 > 10 || roll2 < 0 || roll2 > 10) {
            // Handle invalid input
            alertMessages.push(`Invalid input for frame ${i + 1}`);
        } else if (roll1 + roll2 > 10) {
            // Handle sum greater than 10
            alertMessages.push(`Sum of rolls in frame ${i + 1} is greater than 10`);
        }

        if (req.body[`frame${i}_roll1`] === 10) {
            frames.push({
                roll1: roll1
            })
        }
        else {
            frames.push({
                roll1: roll1,
                roll2: roll2
            });
        }
    }
    const roll1 = parseInt(req.body[`frame${9}_roll1`]);
    const roll2 = parseInt(req.body[`frame${9}_roll2`]);
    const roll3 = parseInt(req.body[`frame${9}_roll2`]);
    if (isNaN(roll3) && !(roll1 + roll2 < 10)) {
        // Handle missing input
        alertMessages.push('Missing input for frame 10');
    }
    else if (roll1 < 0 || roll1 > 10 || roll2 < 0 || roll2 > 10 || roll3 < 0 || roll3 > 10) {
        // Handle invalid input
        alertMessages.push('Invalid input for frame 10');
    }
    else if (roll1 + roll2 < 10 && !isNaN(roll3)) {
        alertMessages.push('Expected no input for frame 10 roll3')
    }
    else if (roll1 + roll2 > 10) {
        alertMessages.push('Sum of rolls 1 and 2 in frame 10 is greater than 10')
    }

    if (req.body[`frame${9}_roll3`] === NaN) {
        frames.push({
            roll1: roll1,
            roll2: roll2
        })
    }
    else {
        frames.push({
            roll1: roll1,
            roll2: roll2,
            roll3: roll3
        });
    }

    if (alertMessages.length > 0) {
        // send all alert messages at once
        const message = alertMessages.join("\\n");
        res.send(`<script>alert('${message}');window.history.back();</script>`);
    } else {
        await dbFunc.insertGame(frames, session.userid, client);
        res.redirect('/stats');
    }
});

app.get('/scoreboard', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        const userCollection = myDB.collection('users');
        const gameCollection = myDB.collection('games');
        const games = await dbFunc.getScoreboard(gameCollection);
        let topAverages = await dbFunc.createAverageTable(userCollection, gameCollection); //average table here
        let topGames = dbFunc.createScoreboardTable(games);
        res.render('scoreboard.ejs', { topGames: topGames, topAverages: topAverages, user: req.session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.post('/scoreboard', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        const userCollection = myDB.collection('users');
        const gameCollection = myDB.collection('games');
        const games = await dbFunc.getScoreboard(gameCollection);
        let topAverages = await dbFunc.createAverageTable(userCollection, gameCollection); //average table here
        let topGames = dbFunc.createScoreboardTable(games);
        res.render('scoreboard.ejs', { topGames: topGames, topAverages: topAverages, user: req.session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.post('/brackets', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        let userCollection = myDB.collection('users');
        let bracketList = await dbFunc.getBracketList(session.userid, userCollection);
        res.render('brackets.ejs', { user: session.userid, bracketList: bracketList });
    }
    else {
        res.redirect('/');
    }
})

app.get('/brackets', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        let userCollection = myDB.collection('users');
        let bracketList = await dbFunc.getBracketList(session.userid, userCollection);
        res.render('brackets.ejs', { user: session.userid, bracketList: bracketList });
    }
    else {
        res.redirect('/');
    }
})

app.post('/createBracket', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        let bracketName = req.body.bracketName;
        let users = req.body.bracketUsers.split(",");
        let bracketCollection = myDB.collection('brackets');
        let userCollection = myDB.collection('users');
        if (!(await bracketCollection.findOne({ "bracketName": bracketName, "users": { $regex: session.userid } }))) {
            let bracketState = await dbFunc.createBracket(bracketName, users, bracketCollection);
            var bracketObj = {
                bracketName: bracketName,
                users: req.body.bracketUsers,
                bracketState: bracketState
            }
            await bracketCollection.insertOne(bracketObj);
            for (let i = 0; i < users.length; i++) {
                await userCollection.updateOne({ username: users[i] }, { $push: { brackets: bracketName } });
            }
            res.redirect("/brackets");
        }
        else {
            res.locals.message = "You are already in a bracket with that name choose an unused name";
            res.send(`<script>alert('${res.locals.message}');window.location.href = "/brackets"</script>`);
        }
    }
    else {
        res.redirect('/');
    }
})

app.post('/goToBracket', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        let bracketName = req.body.bracketName || req.query.bracketName;
        let bracketCollection = myDB.collection('brackets');
        let bracket = await dbFunc.getBracket(bracketName, bracketCollection, session.userid);
        res.render('bracketDisplay.ejs', { user: session.userid, bracket: bracket });
    }
    else {
        res.redirect('/');
    }
})

app.get('/goToBracket', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        let bracketName = req.body.bracketName || req.query.bracketName;
        let bracketCollection = myDB.collection('brackets');
        let bracket = await dbFunc.getBracket(bracketName, bracketCollection, session.userid);
        res.render('bracketDisplay.ejs', { user: session.userid, bracket: bracket });
    }
    else {
        res.redirect('/');
    }
})

app.post('/updateBracket', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        let bracketCollection = myDB.collection('brackets');
        let bracketState = req.body.html;
        bracketState = decodeURIComponent(bracketState);
        const start = "<h1>";
        const end = "</h1>";
        const startIndex = bracketState.indexOf(start) + start.length;
        const endIndex = bracketState.indexOf(end);
        var bracketName = bracketState.substring(startIndex, endIndex)
        await bracketCollection.updateOne({"bracketName" : bracketName, "users": { $regex: session.userid } }, {$set:{bracketState : bracketState}});
        res.redirect(`/goToBracket?bracketName=${bracketName}`);
    }
    else {
        res.redirect('/');
    }
})

app.post('/deleteBracket', async (req, res) => {
    let session = req.session;
    if (session.userid) {
        let bracketCollection = myDB.collection('brackets');
        let userCollection = myDB.collection('users');
        let bracketName = req.body.bracketName;
        const start = "<h1>";
        const end = "</h1>";
        const startIndex = bracketName.indexOf(start) + start.length;
        const endIndex = bracketName.indexOf(end);
        bracketName = bracketName.substring(startIndex, endIndex)
        await bracketCollection.deleteOne({"bracketName" : bracketName, "users": { $regex: session.userid }});
        await userCollection.updateOne({ "username": session.userid }, {"$pull": {"brackets": { "$in": [bracketName]}}});
        res.redirect("/brackets");
    }
    else {
        res.redirect("/");
    }
})

app.post('/userSearch', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.render('userSearch.ejs', { user: req.session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.get('/userSearch', async (req, res) => {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        res.render('userSearch.ejs', { user: req.session.userid })
    }
    else {
        res.redirect('/')
    }
})

app.get('/search', function (req, res) {
    const query = req.query.q;

    const collection = myDB.collection('users');
    collection.find({ username: { $regex: `.*${query}.*`, $options: 'i' } }).limit(10).toArray(function (err, docs) {
        if (err) throw err;

        const data = docs.map(doc => doc.username);
        res.json(data);
    });
});

app.post('/foundUser', async function (req, res) {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        const userCollection = myDB.collection('users');
        let user = await userCollection.findOne({ username: req.body.search });
        if (user != undefined) {
            let averages = await dbFunc.getAverages(user.username, client);
            if (await dbFunc.isFriends(session.userid, req.body.search, client)) {
                res.render('foundUser.ejs', { averages: averages, user: session.userid, search: user.username, isFriend: true, isSent: false })
            }
            else if (await dbFunc.isSent(session.userid, req.body.search, client)) {
                res.render('foundUser.ejs', { averages: averages, user: session.userid, search: user.username, isFriend: false, isSent: true })
            }
            else {
                res.render('foundUser.ejs', { averages: averages, user: session.userid, search: user.username, isFriend: false, isSent: false })
            }
        }
        else {
            res.locals.message = 'User does not exist.';
            res.send(`<script>alert('${res.locals.message}');window.history.back();</script>`);
        }
    }
    else {
        res.redirect('/')
    }
})

app.get('/foundUser', async function (req, res) {
    res.locals.message = undefined;
    let session = req.session;
    if (session.userid) {
        const userCollection = myDB.collection('users');
        let user = await userCollection.findOne({ username: req.session.search });
        let averages = await dbFunc.getAverages(user.username, client);
        if (await dbFunc.isFriends(session.userid, req.session.search, client)) {
            res.render('foundUser.ejs', { averages: averages, user: session.userid, search: user.username, isFriend: true, isSent: false })
        }
        else if (await dbFunc.isSent(session.userid, req.session.search, client)) {
            res.render('foundUser.ejs', { averages: averages, user: session.userid, search: user.username, isFriend: false, isSent: true })
        }
        else {
            res.render('foundUser.ejs', { averages: averages, user: session.userid, search: user.username, isFriend: false, isSent: false })
        }
    }
    else {
        res.redirect('/')
    }
})

app.post('/addFriend', async (req, res) => {
    const userCollection = myDB.collection('users');
    let user = await userCollection.findOne({ username: req.body.search });
    if (user != undefined && user != null) {
        req.session.username = req.body.username;
        req.session.search = req.body.search;
        res.locals.message = await dbFunc.sendFriendRequest(req.session.username, req.session.search, client);
        res.send(`<script>alert('${res.locals.message}');window.location.href = "/foundUser";</script>`);
    }
    else {
        res.locals.message = 'User does not exist.';
        res.send(`<script>alert('${res.locals.message}');window.history.back();</script>`);
    }
})

app.get('/addFriend', async (req, res) => {
    const userCollection = myDB.collection('users');
    let user = await userCollection.findOne({ username: req.body.search });
    if (user != undefined && user != null) {
        req.session.username = req.body.username;
        req.session.search = req.body.search;
        res.locals.message = await dbFunc.sendFriendRequest(req.session.username, req.session.search, client);
        res.send(`<script>alert('${res.locals.message}');window.location.href = "/foundUser";</script>`);
    }
    else {
        res.locals.message = 'User does not exist.';
        res.send(`<script>alert('${res.locals.message}');window.history.back();</script>`);
    }
})

app.post('/removeFriend', async (req, res) => {
    req.session.username = req.body.username;
    req.session.search = req.body.search;
    res.locals.message = await dbFunc.removeFriend(req.session.username, req.session.search, client);
    res.send(`<script>alert('${res.locals.message}');window.location.href = "/foundUser";</script>`);
})

app.get('/logout', (req, res) => {
    req.session.destroy();
    client.close();
    res.redirect('/')
})

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/')
})

app.listen(3000, () => {
    console.log("server started at port 3000")
});
