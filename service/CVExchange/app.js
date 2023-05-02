const express = require('express')
const mysql = require('mysql2')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

//connect to the MySQL Database 
const database = mysql.createConnection({
    host: 'localhost',
    user: 'ashiven',
    password: 'Password1',
    database: 'basedbase'
});

database.connect((err) => {
    if(err) throw err;
    console.log('Connected to MySQL Server!')
})

//--------------------------------

//initialize the app and routers
const app = express();
app.set('view engine', 'ejs')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

app.use((req, res, next) => {
    req.database = database
    next()
})

const postRouter = require('./routes/posts.js')
app.use('/posts', postRouter)
const userRouter = require('./routes/users.js')
app.use('/users', userRouter)
//--------------------------------


//define the main page GET
app.get('/', (req, res) => {
    res.send('main page')
});
//--------------------------------


//define middleware
function logger(req, res, next) {
    console.log(req.originalUrl)
    next()
}
//--------------------------------


//start the server
app.listen(1337, function() {
    console.log('Server listening on port 1337');
});
//--------------------------------