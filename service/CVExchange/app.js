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
const dotenv = require('dotenv')
const middleware = require('./middleware/other')
const getuserid = middleware.getuserid
const getusername = middleware.getusername
const getuserkarma = middleware.getuserkarma

dotenv.config();

//connect to the MySQL Database 
const database = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
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

app.get('/', getuserid, getusername, getuserkarma, async (req, res) => {
    try {
        const pagelimit = 15
        let page = 1
        let sort = 'hot'
        if(req.query.page) {
            page = parseInt(req.query.page)
        }
        const offset = (page - 1) * pagelimit
        let comments = []

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

        if(req.query.sort) {
            sort = req.query.sort
            if(sort === 'new' ) {
                query = `SELECT * FROM posts ORDER BY datetime DESC`
            }
            else if(sort === 'top') {
                query = `SELECT * FROM posts ORDER BY rating DESC`
            }
        }

        query = query + ` LIMIT ? OFFSET ?`
        const params = [pagelimit, offset]
        const [posts] = await req.database.query(query, params)
        const postIds = posts.map(post => post.id)


        const comment_query = `SELECT * FROM comments WHERE post_id IN (?)`
        const comment_params = [postIds]        
        if(postIds.length > 0) {
            [comments] = await req.database.query(comment_query, comment_params)
        }

        // if a logged in user views the frontpage we render their upvotes/downvotes
        const ratings_query = `SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?`
        const ratings_params = [postIds, req.userId]        
        if(req.userId && postIds.length > 0) {
            const [ratings] = await req.database.query(ratings_query, ratings_params)
            return res.render('frontpage', { req, pagelimit, page, sort, posts, comments, ratings, title: 'CVExchange - Fly into nothingness', layout: './layouts/frontpage' })
        }
        // otherwise we just render the frontpage as is
        else {
            return res.render('frontpage', { req, pagelimit, page, sort, posts, comments, title: 'CVExchange - Fly into nothingness', layout: './layouts/frontpage' })
        }
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})


app.get('/uploads/:userId/private/:filename', auth, fileAuth, async (req, res) => {
    try {
        const filepath = path.join(__dirname, 'uploads', req.params.userId, 'private', req.params.filename)
        await fs.promises.access(filepath)
        return res.sendFile(filepath)
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

app.use('/uploads', express.static('./uploads'))
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
