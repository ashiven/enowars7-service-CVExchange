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
const getuserid = middleware.getuserid

//connect to the MySQL Database 
const database = mysql.createPool({
    host: 'localhost',
    user: 'ashiven',
    password: 'Password1',
    database: 'basedbase'
});
//--------------------------------

//initialize the app and routers
const app = express()
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

//Route definitions

app.get('/', getuserid,  async (req, res) => {
    try {
        const pagelimit = 10
        let query = `SELECT * FROM (
                        SELECT p.*, COUNT(r.id) as ratecount 
                        FROM posts p 
                        LEFT JOIN ratings r ON p.id = r.post_id
                        WHERE r.datetime >= NOW() - INTERVAL 1 HOUR AND r.rating = 1
                        GROUP BY p.id

                        UNION

                        SELECT p1.*, 0 as ratecount
                        FROM posts p1 
                        WHERE id NOT IN (
                            SELECT p2.id
                            FROM posts p2
                            LEFT JOIN ratings r2 ON p2.id = r2.post_id
                            WHERE r2.datetime >= NOW() - INTERVAL 1 HOUR AND r2.rating = 1
                        )
                    ) AS subquery 
                    ORDER BY ratecount DESC, rating DESC`
        const params = [pagelimit]

        if(req.query.sort) {
            const sort = req.query.sort
            if(sort === 'new' ) {
                query = `SELECT * FROM posts ORDER BY datetime DESC`
            }
            else if(sort === 'top') {
                query = `SELECT * FROM posts ORDER BY rating DESC`
            }
        }

        query = query + ` LIMIT ?`
        const [posts] = await req.database.query(query, params)
        const postIds = posts.map(post => post.id)

        const comment_query = `SELECT * FROM comments WHERE post_id IN (?)`
        const comment_params = [postIds]
        const [comments] = await req.database.query(comment_query, comment_params)

        // if a logged in user views the frontpage we render their upvotes/downvotes
        if(req.userId) {
            const ratings_query = `SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?`
            const ratings_params = [postIds, req.userId]
            const [ratings] = await req.database.query(ratings_query, ratings_params)

            return res.render('frontpage', { req, sort: req.query.sort, posts, comments, ratings, title: 'CVExchange - Fly into nothingness', layout: './layouts/sidebar' })
        }
        // otherwise we just render the frontpage as is
        else {
            return res.render('frontpage', { req, sort: req.query.sort, posts, comments, title: 'CVExchange - Fly into nothingness', layout: './layouts/sidebar' })
        }
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
app.use('/img', express.static('./public/img'))
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
    console.log('Server listening on port 1337')
})
//--------------------------------