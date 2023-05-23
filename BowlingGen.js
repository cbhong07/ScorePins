const { get } = require("mongoose");
const dbFunc = require("./dbFunctions.js");

const MongoClient = require('mongodb').MongoClient;
const uri =
    'mongodb+srv://cbhong:ronnoc07@cluster0.ydw1zgb.mongodb.net/test';
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect();
var myDB = client.db("Bowling");

// function to generate a random bowling game
/*
    take either all or the most recent 100 games and calculate a statistical average for each combination of spares and strikes found
    randomly select one of the combinations using the statistical averages
    use the first ball average with a max of 100 and substract 10 for each strike
    use gaussian number generation to find the rest of the values based around the number of remaining non-strike balls
    fill in the game with the strikes randomly as already done and fill in the remaining first rolls with the generated numbers
*/
function generateBowlingGame(numSpares, numStrikes, firstBallAvg) {
    let totalFirstBall = (firstBallAvg * 10) - (numStrikes * 10);
    let mean = totalFirstBall / (10 - numStrikes);
    let firstBall = [];
    for (let i = 0; i < 10 - numStrikes; i++) {
        firstBall.push(Math.round(gaussianRandom(mean)));
    }
    let game = [];
    let spareFrames = [];
    let strikeFrames = [];
    let i = 0;
    while (i < numStrikes) {
        let roll1 = Math.floor(Math.random() * 10);
        if (!strikeFrames.includes(roll1)) {
            strikeFrames.push(roll1);
            i++;
        }
        else if (roll1 == 10) {
            let count = counter(strikeFrames, 10);
            if (count < 3) {
                strikeFrames.push(roll1);
                i++;
            }
        }
    }
    i = 0;
    while (i < numSpares) {
        let roll1 = Math.floor(Math.random() * 10);
        if (!spareFrames.includes(roll1) && !strikeFrames.includes(roll1)) {
            spareFrames.push(roll1);
            i++;
        }
        else if (roll1 == 10) {
            let count = counter(strikeFrames, 10);
            if (count < 1 && !spareFrames.includes(roll1)) {
                spareFrames.push(roll1);
                i++;
            }
        }
    }

    for (let i = 0; i < 10; i++) {
        game[i] = {};
        // check if we need to generate a spare or strike
        if (spareFrames.includes(i)) {
            // generate a spare
            let spare = firstBall.pop();
            game[i] = { roll1: spare, roll2: 10 - spare };
            if(i == 9) {
                game[i].roll3 = Math.floor(Math.random() * 10);
            }
        } else if (strikeFrames.includes(i)) {
            // generate a strike
            game[i] = { roll1: 10 };
            if(i == 9) {
                game[i].roll2 = Math.floor(Math.random() * 10);
                game[i].roll3 = Math.floor(Math.random() * (10 - game[i].roll2));
            }
        } else {
            // generate a random frame
            let roll1 = firstBall.pop();
            let roll2 = Math.floor(Math.random() * (10 - roll1));
            game[i] = { roll1: roll1, roll2: roll2 };
            if(i == 9) {
                game[i].roll3 = undefined;
            }
        }
    }
    
    return game;
}

function gaussianRandom(mean, stdev = 1) {
    let u = 1 - Math.random(); // Converting [0,1) to (0,1]
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

function counter(array, object) {
    let appear = 0;
    for (let i = 0; i < array.length; i++) {
        if (array[i] == object) {
            appear++;
        }
    }
    return appear;
}

function getScore(game) {
    let score = 0;
    let strikes = [];
    let spares = [];
    for (let i = 0; i < 9; i++) {
        if (game[i].roll1 === 10) {
            strikes.push(i);
        }
        else if (game[i].roll1 + game[i].roll2 === 10) {
            spares.push(i);
        }
    }
    if (game[9].roll1 === 10) {
        strikes.push(10);
    }
    else if (game[9].roll1 + game[9].roll2 === 10) {
        spares.push(11);
    }
    if (game[9].roll2 === 10) {
        strikes.push(11);
    }
    else if (game[9].roll2 + game[9].roll3 === 10) {
        spares.push(12);
    }
    if (game[9].roll3 === 10) {
        strikes.push(12);
    }

    for (let i = 0; i < 9; i++) {
        if (strikes.includes(i)) {
            score += 10;
            if (strikes.includes(i + 1)) {
                score += 10;
                if (strikes.includes(i + 2)) {
                    score += 10;
                }
                else {
                    if (i + 2 > 10) {
                        score += game[9].roll2;
                    }
                    else {
                        score += game[i + 2].roll1;
                    }
                }
            }
            else {
                score += game[i + 1].roll1 + game[i + 1].roll2;
            }
        }
        else if (spares.includes(i)) {
            score += 10;
            score += game[i + 1].roll1;
        }
        else {
            score += game[i].roll1 + game[i].roll2;
        }
    }
    if (!isNaN(game[9].roll3)) {
        score += game[9].roll1 + game[9].roll2 + game[9].roll3;
    }
    else {
        score += game[9].roll1 + game[9].roll2
    }
    return score;
}

function getStrikes(game) {
    let count = 0;
    for (let i = 0; i < 9; i++) {
        if (game[i].roll1 === 10) {
            count += 1;
        }
    }
    if (game[9].roll1 === 10) {
        count += 1;
    }
    if (game[9].roll2) {
        if (game[9].roll2 === 10) {
            count += 1;
        }
    }
    if (game[9].roll3) {
        if (game[9].roll3 === 10) {
            count += 1;
        }
    }
    return count;
}

function getSpares(game) {
    let count = 0;
    for (let i = 0; i < 9; i++) {
        if (game[i].roll2) {
            if (game[i].roll1 + game[i].roll2 === 10) {
                count += 1;
            }
        }
    }
    if (!game[9].roll1 === 10) {
        if (game[9].roll1 + game[9].roll2 === 10) {
            count += 1;
        }
    }
    else if (game[9].roll1 === 10) {
        if (game[9].roll2) {
            if (!game[9].roll2 === 10) {
                if (game[9].roll2 + game[9].roll3 === 10) {
                    count += 1;
                }
            }
        }
    }
    return count;
}

function getFirstBall(game) {
    let sum = 0.0;
    for (let i = 0; i < 10; i++) {
        sum += game[i].roll1;
    }
    return sum / 10.0
}

async function preprocess(gameCollection, userCollection, username) {
    let user = await userCollection.findOne({ username: username });
    let firstBallAvg = user.avgFirstBall;
    let strikesArray = {};
    let sparesArray = {};
    let strikeSum = 0;
    let spareSum = 0;
    for (let i = 0; i < 10; i++) {
        let strikes = await gameCollection.find({ strikes: i }, { username: username }).toArray()
        let spares = await gameCollection.find({ spares: i }, { username: username }).toArray()
        if(strikes.length > 0) {
            strikesArray[i] = strikes.length;
        }
        if(spares.length > 0) {
            sparesArray[i] = spares.length;
        }
        
        strikeSum += strikes.length
        spareSum += spares.length
    }

    Object.keys(strikesArray).forEach(key => {
        strikesArray[key] = strikesArray[key] / strikeSum
    });
    Object.keys(sparesArray).forEach(key => {
        sparesArray[key] = sparesArray[key] / spareSum
    });

    let index1 = parseInt(getRandomIndex(strikesArray));
    let index2 = parseInt(getRandomIndex(sparesArray));

    while(index1 + index2 > 12) {
        delete sparesArray[index2]
        index2 = getRandomIndex(sparesArray);
    }
    return generateBowlingGame(index2, index1, firstBallAvg)
}

function getRandomIndex(probabilities) {
    let sum = 0;
    const r = Math.random();
    for (const key in probabilities) {
      sum += probabilities[key];
      if (r <= sum) {
        return key;
      }
    }
    return null; // Should not happen
  }


module.exports.preprocess = preprocess;
module.exports.generateBowlingGame = generateBowlingGame;
module.exports.getScore = getScore;
module.exports.getStrikes = getStrikes;
module.exports.getSpares = getSpares;
module.exports.getFirstBall = getFirstBall;