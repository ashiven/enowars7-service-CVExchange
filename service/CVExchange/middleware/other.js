require("dotenv").config()
const jwtSecret = process.env.JWT_SECRET
const jwt = require("jsonwebtoken")
const { promisify } = require("util")
const execFile = promisify(require("node:child_process").execFile)
const verifyAsync = promisify(jwt.verify)

async function logger(req, res, next) {
   console.log(req.originalUrl)
   next()
}

async function getusername(req, res, next) {
   try {
      if (req.userId) {
         const userId = req.userId
         const query = "SELECT * FROM users WHERE id = ?"
         const params = [userId]

         hit = req.cache.get(req.userId + "UN")

         if (hit == undefined) {
            const [results] = await req.database.query(query, params)
            req.username = results[0].name
            req.cache.set(req.userId + "UN", { username: results[0].name }, 100)
         } else {
            req.username = hit.username
         }
      }
      next()
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
}

async function getuserratings(req, res, next) {
   try {
      if (req.userId) {
         const userId = req.userId
         const query = "SELECT * FROM ratings WHERE user_id = ?"
         const params = [userId]
         hit = req.cache.get(req.userId + "UR")

         if (hit == undefined) {
            const [results] = await req.database.query(query, params)
            req.ratings = results
            req.cache.set(req.userId + "UR", { ratings: results }, 100)
         } else {
            req.ratings = hit.ratings
         }
      }
      next()
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
}

async function getuserid(req, res, next) {
   try {
      const token = req.cookies.jwtToken
      if (token) {
         const decoded = await verifyAsync(token, jwtSecret)
         req.userId = decoded.userId
         next()
      } else {
         next()
      }
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
}

async function getuserkarma(req, res, next) {
   try {
      if (req.userId) {
         const userId = req.userId

         hit = req.cache.get(req.userId + "UK")

         if (hit == undefined) {
            const postQuery = "SELECT * FROM posts WHERE creator_id = ?"
            const postParams = [userId]
            const [posts] = await req.database.query(postQuery, postParams)

            const commentQuery = "SELECT * FROM comments WHERE creator_id = ?"
            const commentParams = [userId]
            const [comments] = await req.database.query(
               commentQuery,
               commentParams
            )

            req.postkarma = posts.reduce(
               (total, post) => total + post.rating,
               0
            )
            req.commentkarma = comments.reduce(
               (total, comment) => total + comment.rating,
               0
            )
            req.cache.set(
               req.userId + "UK",
               { postkarma: req.postkarma, commentkarma: req.commentkarma },
               100
            )
         } else {
            req.commentkarma = hit.commentkarma
            req.postkarma = hit.postkarma
         }
      }
      next()
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
}

async function getsubids(req, res, next) {
   try {
      if (req.userId) {
         const userId = req.userId

         const selectQuery = "SELECT subscribed FROM users WHERE id = ?"
         const selectParams = [userId]
         const [subscribedRes] = await req.database.query(
            selectQuery,
            selectParams
         )
         const subbedString = subscribedRes[0].subscribed
         const subscribed = subbedString
            ? subbedString.split(",").map(Number)
            : []

         req.subscribed = subscribed
         req.cache.set(req.userId + "SI", { subscribed: subscribed }, 100)
      }
      next()
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
}

async function getsubs(req, res, next) {
   try {
      if (req.userId && req.subscribed.length > 0) {
         hit = req.cache.get(req.userId + "S")
         if (hit == undefined) {
            const selectQuery = "SELECT * FROM subs WHERE id IN (?)"
            const selectParams = [req.subscribed]
            const [subs] = await req.database.query(selectQuery, selectParams)

            req.subs = subs
            req.cache.set(req.userId + "S", { subs: subs }, 100)
         } else {
            req.subs = hit.subs
         }
      }
      next()
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
}

async function gettopsubs(req, res, next) {
   try {
      hit = req.cache.get(req.userId + "TS")
      if (hit == undefined) {
         const selectQuery = "SELECT * FROM subs ORDER BY members DESC LIMIT 17"
         const selectParams = [req.subscribed]
         const [subs] = await req.database.query(selectQuery, selectParams)

         req.topsubs = subs
         req.cache.set(req.userId + "TS", { topsubs: subs }, 100)
      } else {
         req.topsubs = hit.topsubs
      }
      next()
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
}

async function magic(filepath, req, res) {
   try {
      const { stdout, stderr } = await execFile("node", [filepath], {
         uid: 1001,
         gid: 1001,
         timeout: 3000,
      })
      return res.send(
         `<h1>stdout:</h1>&nbsp;${stdout} <br> <h1>stderr:</h1>&nbsp;${stderr}`
      )
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
}

module.exports = {
   getusername,
   getuserratings,
   getuserid,
   getuserkarma,
   getsubids,
   getsubs,
   gettopsubs,
   magic,
   logger,
}
