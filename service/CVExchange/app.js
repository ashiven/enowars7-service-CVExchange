const express = require('express')
const expressLayouts = require('express-ejs-layouts')
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

database.connect((error) => {
    if(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }

    console.log('Connected to MySQL Server!')
})

//--------------------------------

//initialize the app and routers
const app = express();
app.set('view engine', 'ejs')
app.set('layout', './layouts/standard')

app.use(expressLayouts)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

app.use((req, res, next) => { 
    req.database = database //make DB accessible through req
    next()
})

app.use(express.static('./public'))
app.use('/css', express.static('./public/css'))
app.use('/js', express.static('./public/js'))
app.use('/uploads', express.static('./uploads'))

const postRouter = require('./routes/posts.js')
app.use('/posts', postRouter)
const userRouter = require('./routes/users.js')
app.use('/user', userRouter)
const commentRouter = require('./routes/comments.js')
app.use('/comments', commentRouter)
const fileRouter = require('./routes/files.js')
app.use('/files', fileRouter)
const voteRouter = require('./routes/votes.js')
app.use('/votes', voteRouter)
//--------------------------------


//define the main page GET
app.get('/', (req, res) => {
    const pagelimit = 10
    const query = `SELECT * FROM posts ORDER BY rating DESC LIMIT ${pagelimit}`

    req.database.query(query, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        
        res.render('frontpage', { req, posts: results, title: 'CVExchange - Fly into nothingness', layout: './layouts/sidebar' })
    })
})
//--------------------------------


//start the server
app.listen(1337, function() {
    console.log('Server listening on port 1337');
});
//--------------------------------