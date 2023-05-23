// Function to handle the login process
async function handleLogin(usernameInput, passwordInput) {
    const MongoClient = require('mongodb').MongoClient;
    const uri =
        'mongodb+srv://cbhong:ronnoc07@cluster0.ydw1zgb.mongodb.net/test';
    //'mongodb+srv://' + user + ':<' + pass + '>@cluster0.ydw1zgb.mongodb.net/test';
    const client = new MongoClient(uri, { useNewUrlParser: true });

    try {
        await client.connect();
        // Get the values of the username and password inputs
        const collection = client.db('Bowling').collection('users');

        const user = await collection.findOne({ "username": usernameInput })
        if (!user) {
            return false;
        }
        else {
            if (user.password === passwordInput) { // Check if the entered username and password match a user in the database
                return true;
            } else {
                // If the credentials are incorrect, show an error message
                return false;
            }
        }
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await client.close();
    }
}


module.exports.handleLogin = handleLogin;