const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const mysql = require('mysql2/promise')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const auth_middleware = require('./middleware/auth')
const auth = auth_middleware.auth
const fileAuth = auth_middleware.fileAuth
const path = require('path')
const fs = require('fs')
const middleware = require('./middleware/other')
const errorHandler = middleware.errorHandler

//connect to the MySQL Database 
const database = mysql.createPool({
    host: 'localhost',
    user: 'ashiven',
    password: 'Password1',
    database: 'basedbase'
});
//--------------------------------

//initialize the app and routers
const app = express();
app.set('view engine', 'ejs')
app.set('layout', './layouts/standard')

app.use(expressLayouts)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(errorHandler)

app.use((req, res, next) => { 
    req.database = database //make DB accessible through req
    next()
})

//Route definitions

app.get('/', async (req, res) => {
    try {
        const pagelimit = 10
        var query = `SELECT * FROM posts ORDER BY rating DESC`
        const params = [pagelimit]

        if(req.query.sort) {
            const sort = req.query.sort
            if(sort === 'new' ) {
                query = `SELECT * FROM posts ORDER BY datetime ASC`
            }
            else if(sort === 'hot') {
                query = `SELECT p.*, COUNT(r.id) as ratecount 
                        FROM posts p 
                        LEFT JOIN ratings r ON p.id = r.post_id
                        WHERE r.datetime >= NOW() - INTERVAL 1 HOUR AND r.rating = 1
                        GROUP BY p.id
                        ORDER BY ratecount DESC`
            }
        }

        query = query + ` LIMIT ?`
        const [results] = await req.database.query(query, params)
        return res.render('frontpage', { req, posts: results, title: 'CVExchange - Fly into nothingness', layout: './layouts/sidebar' })
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

app.get('/uploads/:userId/:filename', auth, fileAuth, async (req, res) => {
    try {
        const filepath = path.join(__dirname, 'uploads', req.params.userId, req.params.filename)
        await fs.promises.access(filepath)
        return res.sendFile(filepath)
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

app.use(express.static('./public'))
app.use('/css', express.static('./public/css'))
app.use('/js', express.static('./public/js'))

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


//start the server
app.listen(1337, function() {
    console.log('Server listening on port 1337');
});
//--------------------------------