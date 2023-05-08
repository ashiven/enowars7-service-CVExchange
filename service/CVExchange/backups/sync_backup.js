// app.js

const mysql = require('mysql2')

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

app.get('/', (req, res) => {
    const pagelimit = 10
    const query = `SELECT * FROM posts ORDER BY rating DESC LIMIT ${pagelimit}`

    req.database.query(query, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        console.log(results)
        res.render('frontpage', { req, posts: results, title: 'CVExchange - Fly into nothingness', layout: './layouts/sidebar' })
    })
})


// posts.js

router.get('/new', auth, async (req, res) => {
    return res.render('newpost', {title: 'New Post'})
})

router.post('/new', auth, getusername,  (req, res) => {
    const title = req.body.title
    const text = req.body.text
    const creatorId = req.userId
    const creatorName = req.username

    const query = `INSERT INTO posts (title, text, rating, creator_id, creator_name, datetime) VALUES (?, ?, 0, ?, ?, NOW() )`
    const params = [title, text, creatorId, creatorName]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        return res.redirect('/')
    })
})

router.get('/:id',auth, (req, res) => {
    const postId = req.params.id
    
    const post_query = `SELECT * FROM posts WHERE id = ?`
    const post_params = [postId]
    req.database.query(post_query, post_params, (error, post_results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        
        if(post_results.length === 0) {
            return res.status(404).send('Post not found')
        }
        const post = post_results[0]

        const comment_query = `SELECT * FROM comments WHERE post_id = ? ORDER BY rating DESC`
        const comment_params = [postId]
        req.database.query(comment_query, comment_params, (error, comment_results) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }

            return res.render('post', {req, post, comments: comment_results, title: `${post.title}`})
        })
    })
})

router.post('/delete/:id', auth,  (req, res) => {
    const postId = req.params.id
    const userId = req.userId

    const find_query = `SELECT * FROM posts WHERE id = ? AND creator_id = ?`
    const find_params = [postId, userId]
    req.database.query(find_query, find_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            const delete_query = `DELETE FROM posts WHERE id = ?`
            const delete_params = [postId]
            req.database.query(delete_query, delete_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }

                return res.redirect('/user/myposts')
            })
        }
        else {
            return res.status(401).send('You are not authorized to delete this post or the post doesnt exist')
        }
    })
})

router.get('/edit/:id', auth,  (req, res) => {
    const postId = req.params.id
    const userId = req.userId
    
    const query = `SELECT * FROM posts WHERE id = ? AND creator_id = ?`
    const params = [postId, userId]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            return res.render('editpost', { post: results[0], postId, title: 'Edit Post' })
        }
        else {
            return res.status(404).send('Post not found')
        }
    })
})

router.post('/edit/:id', auth,  (req, res) => {
    const title = req.body.title
    const text = req.body.text
    const postId = req.params.id
    const userId = req.userId

    const query = `UPDATE posts SET title = ?, text = ? WHERE id = ? AND creator_id = ?`
    const params = [title, text, postId, userId]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        
        return res.redirect('/user/myposts')
    })
})


// users.js

router.get('/login', (req, res) => {
    res.render('login', {title: 'Login'})
})

router.post('/login', (req, res) => {
    const email = req.body.email
    const password = req.body.password

    if(!email || !password) {
        return res.status(400).send('Please provide all required fields')
    }

    const query = `SELECT * FROM users WHERE email = ? AND password = ?`
    const params = [email, password]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            const userId = results[0].id
            const token = jwt.sign({userId}, jwtSecret)
            res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'none' })
            return res.redirect('/')
        }
        else {
            return res.status(401).send('Invalid email or password')
        }
    })
})

router.post('/logout', (req, res) => {
    res.clearCookie('jwtToken')
    return res.redirect('/')
})

router.get('/register', (req, res) => {
    return res.render('register', {title: 'Register'})
})

router.post('/register', (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password

    if(!name || !email || !password) {
        return res.status(400).send('Please provide all required fields')
    }

    const search_query = `SELECT * FROM users WHERE email = ?`
    const search_params = [email]
    req.database.query(search_query, search_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            return res.status(409).send('User already exists')
        }

        const insert_query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`
        const insert_params = [name, email, password]
        req.database.query(insert_query, insert_params, (error, results) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }
            
            const login_query = `SELECT * FROM users WHERE email = ? AND password = ?`
            const login_params = [email, password]
            req.database.query(login_query, login_params,  (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
        
                if(results.length > 0) {
                    const userId = results[0].id
                    const token = jwt.sign({userId}, jwtSecret)
                    res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'none' })
                    return res.redirect('/')
                }
            })
        })
    })
})

router.get('/profile', auth, (req, res) => {
    const userId = req.userId

    const query = `SELECT * FROM users WHERE id = ?`
    const params = [userId]
    req.database.query(query, params,  (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            return res.render('profile', { user: results[0], title: 'My Profile' })
        }
    })
})

router.get('/myposts', auth, (req, res) => {
    const pagelimit = 10
    const userId = req.userId

    const query = `SELECT * FROM posts WHERE creator_id = ? ORDER BY datetime DESC LIMIT ?`
    const params = [userId, pagelimit]

    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        
        if(results.length > 0) {
            return res.render('myposts', { req, posts: results, title: 'My Posts' })
        }
        else {
            return res.send('You havent posted anything yet.')
        }
    })
})


// comments.js

router.post('/new' , auth, getusername, (req, res) => {
    const comment = req.body.comment
    const postId = req.body.postId
    const creatorId = req.userId
    const creatorName = req.username

    const query = `INSERT INTO comments (text, post_id, creator_id, creator_name, rating, datetime) VALUES (?, ?, ?, ?,  0,  NOW() )`
    const params = [comment, postId, creatorId, creatorName]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        return res.redirect(`/posts/${postId}`)
    })
})

router.get('/edit/:id' , auth, (req, res) => {
    const commentId = req.params.id
    const userId = req.userId
    
    const query = `SELECT * FROM comments WHERE id = ? AND creator_id = ?`
    const params = [commentId, userId]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            return res.render('editcomment', { comment: results[0], commentId })
        }
        else {
            return res.status(404).send('Comment not found')
        }
    })
})

router.post('/edit/:id' , auth, (req, res) => {
    const text = req.body.text
    const postId = req.body.postId
    const commentId = req.params.id
    const userId = req.userId

    const query = `UPDATE comments SET text = ? WHERE id = ? AND creator_id = ?`
    const params = [text, commentId, userId]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        return res.redirect(`/posts/${postId}`)
    })
})

router.post('/delete/:id', auth,  (req, res) => {
    const commentId = req.params.id
    const userId = req.userId
    const postId = req.body.postId

    const find_query = `SELECT * FROM comments WHERE id = ? AND creator_id = ?`
    const find_params = [commentId, userId]
    req.database.query(find_query, find_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            const delete_query = `DELETE FROM comments WHERE id = ?`
            const delete_params = [commentId]
            req.database.query(delete_query, delete_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
                
                return res.redirect(`/posts/${postId}`)
            })
        }
        else {
            return res.status(401).send('You are not authorized to delete this comment or it doesnt exist')
        }
    })
})


// votes.js

router.post('/ratepost', auth, (req, res) => {
    const userId = req.userId 
    const rating = parseInt(req.body.rating)
    const postId = req.body.postId
    const page = req.body.page

    if(!(rating === 1 || rating === -1)) {
        return res.status(400).send('Yea.. I see what you were trying to do ;)')
    }

    const search_query = `SELECT * FROM ratings WHERE user_id = ? AND post_id = ?`
    const search_params = [userId, postId]
    req.database.query(search_query, search_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        //if the user already voted on that post, update their rating
        if(results.length > 0) {
            const update_query = `UPDATE ratings SET rating = ? WHERE user_id = ? AND post_id = ?`
            const update_params = [rating, userId, postId]
            req.database.query(update_query, update_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })
        }

        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, post_id, rating) VALUES (?, ?, ?)`
            const insert_params = [userId, postId, rating]
            req.database.query(insert_query, insert_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })
        }

        //now we accumulate the ratings of a post and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE post_id = ?`
        const acc_params = [postId]
        req.database.query(acc_query, acc_params, (error, results) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }

            const total = results[0].total_rating
            const post_query = `UPDATE posts SET rating = ? WHERE id = ?`
            const post_params = [total, postId]
            req.database.query(post_query, post_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }

                return res.redirect(`${page}`)
            })
        })
    })
})

router.post('/ratecomment', auth, (req, res) => {
    const userId = req.userId 
    const rating = parseInt(req.body.rating)
    const commentId = req.body.commentId
    const page = req.body.page

    if(!(rating === 1 || rating === -1)) {
        return res.status(400).send('Yea.. I see what you were trying to do ;)')
    }

    const search_query = `SELECT * FROM ratings WHERE user_id = ? AND comment_id = ?`
    const search_params = [userId, commentId]
    req.database.query(search_query, search_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        //if the user already voted on that comment, update their rating
        if(results.length > 0) {
            const update_query = `UPDATE ratings SET rating = ? WHERE user_id = ? AND comment_id = ?`
            const update_params = [rating, userId, commentId]
            req.database.query(update_query, update_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })
        }

        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, comment_id, rating) VALUES (?, ?, ?)`
            const insert_params = [userId, commentId, rating]
            req.database.query(insert_query, insert_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })
        }

        //now we accumulate the ratings of a comment and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE comment_id = ?`
        const acc_params = [commentId]
        req.database.query(acc_query, acc_params, (error, results) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }

            const total = results[0].total_rating
            const comment_query = `UPDATE comments SET rating = ? WHERE id = ?`
            const comment_params = [total, commentId]
            req.database.query(comment_query, comment_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }

                return res.redirect(`${page}`)
            })
        })
    })
})


// files.js

router.post('/upload', auth, upload.single('profilePicture') , (req, res) => {
    
    if(!req.file) {
        return res.status(400).send('Please choose a file first')
    }
    const filename = req.file.originalname
    const filepath = req.file.path
    const userId = req.userId

    const find_query = `SELECT profile_picture FROM users WHERE id = ?`
    const find_params = [userId]
    req.database.query(find_query, find_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        //find current profile pic and delete it 
        const currentPic = results[0].profile_picture
        if(currentPic) {
            fs.unlink(path.join(__dirname, '..', currentPic), (error) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })
        }

        //rename the file to upload and update profile pic in DB
        fs.rename(filepath, `uploads/${filename}`, (error) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }
    
            const userId = req.userId
            const profilepic = 'uploads/' + filename
            const update_query = `UPDATE users SET profile_picture = ? WHERE id = ?`
            const update_params = [profilepic, userId]
            req.database.query(update_query, update_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
                
                return res.redirect('/user/profile')
            })
        })
    })
})

router.post('/delete', auth, (req, res) => {
    const userId = req.userId

    const find_query = `SELECT profile_picture FROM users WHERE id = ?`
    const find_params = [userId]
    req.database.query(find_query, find_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        const currentPic = results[0].profile_picture
        if(currentPic) {
            fs.unlink(path.join(__dirname, '..', currentPic), (error) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })

            const delete_query = `UPDATE users SET profile_picture = NULL WHERE id = ?`
            const delete_params = [userId]
            req.database.query(delete_query, delete_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
                
                return res.redirect('/user/profile')
            })
        }
    })
})


// middleware

function getusername(req, res, next) {
    const userId = req.userId
    const query = `SELECT * FROM users WHERE id = ${userId}`
    req.database.query(query, (error, results) => {
        if(error) throw error
        req.username = results[0].name
        next()
    })
}