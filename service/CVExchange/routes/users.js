const router = require("express").Router()
const jwt = require("jsonwebtoken")
const { auth, jwtSecret } = require("../middleware/auth")
const {
   getusername,
   getuserkarma,
   getsubids,
   getsubs,
   gettopsubs,
} = require("../middleware/other")

// Route definitions

router.get("/login", async (req, res) => {
   try {
      const status = ""
      if (!req.cookies.jwtToken) {
         return res.render("login", {
            status,
            title: "Login",
            layout: "./layouts/login",
         })
      } else {
         return res.status(400).send("<h1>Please log out first.</h1>")
      }
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

router.post("/login", async (req, res) => {
   try {
      const email = req.body.email
      const password = req.body.password

      if (!email || !password || email === "" || password === "") {
         return res.render("login", {
            title: "Login",
            layout: "./layouts/login",
            status: "Please provide all required fields!",
         })
      }
      const query = "SELECT * FROM users WHERE email = ? AND password = ?"
      const params = [email, password]
      const [results] = await req.database.query(query, params)

      if (results.length > 0) {
         const userId = results[0].id
         const token = jwt.sign({ userId }, jwtSecret)
         res.cookie("jwtToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
         })
         return res.redirect("/")
      } else {
         return res.render("login", {
            title: "Login",
            layout: "./layouts/login",
            status: "Wrong credentials, please try again!",
         })
      }
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

router.post("/logout", async (req, res) => {
   try {
      res.clearCookie("jwtToken")
      return res.redirect("/")
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

router.get("/register", async (req, res) => {
   try {
      const status = ""
      if (!req.cookies.jwtToken) {
         return res.render("register", {
            status,
            title: "Register",
            layout: "./layouts/login",
         })
      } else {
         return res.status(400).send("<h1>Please log out first.</h1>")
      }
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

router.post("/register", async (req, res) => {
   const connection = await req.database.getConnection()

   try {
      const name = req.body.name.replace(/\s/g, "")
      const email = req.body.email.replace(/\s/g, "")
      const password = req.body.password.replace(/\s/g, "")

      if (
         !name ||
         !email ||
         !password ||
         name === "" ||
         email === "" ||
         password === ""
      ) {
         await connection.release()
         return res.render("register", {
            title: "Register",
            layout: "./layouts/login",
            status: "Please provide all required fields!",
         })
      }
      if (!/^[a-zA-Z0-9]+$/.test(name)) {
         await connection.release()
         return res.render("register", {
            title: "Register",
            layout: "./layouts/login",
            status: "Please only use numbers and letters for the username.",
         })
      }
      if (name.length < 5 || password.length < 8 || email.length < 6) {
         await connection.release()
         return res.render("register", {
            title: "Register",
            layout: "./layouts/login",
            status:
               "Password needs to contain at least 8 characters and username at least 5.",
         })
      }
      if (name.length > 45 || password.length > 45 || email.length > 45) {
         await connection.release()
         return res.render("register", {
            title: "Register",
            layout: "./layouts/login",
            status: "Please limit your inputs to 45 characters.",
         })
      }

      // start a transaction
      await connection.beginTransaction()

      const searchQuery = "SELECT * FROM users WHERE email = ? OR name = ?"
      const searchParams = [email, name]
      const [searchResults] = await connection.query(searchQuery, searchParams)

      if (searchResults.length > 0) {
         // commit the transaction and release the connection
         await connection.commit()
         await connection.release()
         return res.render("register", {
            title: "Register",
            layout: "./layouts/login",
            status: "Username or email already taken.",
         })
      }

      const insertQuery =
         "INSERT INTO users (name, email, password, datetime) VALUES ( ?, ?, ?, NOW() )"
      const insertParams = [name, email, password]
      await connection.query(insertQuery, insertParams)

      const loginQuery = "SELECT * FROM users WHERE email = ? AND password = ?"
      const loginParams = [email, password]
      const [loginResults] = await connection.query(loginQuery, loginParams)

      if (loginResults.length > 0) {
         const userId = loginResults[0].id
         const token = jwt.sign({ userId }, jwtSecret)
         res.cookie("jwtToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
         })
         // commit the transaction and release the connection
         await connection.commit()
         await connection.release()
         return res.redirect("/")
      }
   } catch (error) {
      // if there was an error, rollback changes and release the connection
      await connection.rollback()
      await connection.release()
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

router.get(
   "/profile/:id",
   auth,
   getusername,
   getuserkarma,
   getsubids,
   getsubs,
   gettopsubs,
   async (req, res) => {
      try {
         const profileId = req.params.id
         if (!Number.isInteger(parseInt(profileId))) {
            return res
               .status(500)
               .send(
                  `<h1>What does 1 + ${profileId} make? Yea.. I wouldn't know either.</h1>`
               )
         }
         const pagelimit = 15
         const userId = req.userId
         let tab = "overview"
         if (req.query.tab) {
            tab = req.query.tab
         }
         let page = 1
         if (req.query.page) {
            page = parseInt(req.query.page)
            if (!Number.isInteger(page)) {
               return res.status(500).send("<h1>That is not a number.</h1>")
            }
         }
         let ratings = []
         let commentPosts = []
         let saved = []

         const userQuery = "SELECT * FROM users WHERE id = ?"
         const userParams = [profileId]
         const [user] = await req.database.query(userQuery, userParams)

         const postQuery =
            "SELECT * FROM posts WHERE creator_id = ? ORDER BY datetime DESC "
         const postParams = [profileId]
         const [posts] = await req.database.query(postQuery, postParams)
         const postIds = posts.map((post) => post.id)

         const commentQuery =
            "SELECT * FROM comments WHERE creator_id = ? ORDER BY datetime DESC "
         const commentParams = [profileId]
         const [comments] = await req.database.query(
            commentQuery,
            commentParams
         )
         const commentIds = comments.map((comment) => comment.id)
         const commentPostIds = comments.map((comment) => comment.post_id)

         if (postIds.length > 0) {
            const postratingsQuery =
               "SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?"
            const postratingsParams = [postIds, userId]
            const [postRatings] = await req.database.query(
               postratingsQuery,
               postratingsParams
            )
            ratings = ratings.concat(postRatings)
         }

         if (commentIds.length > 0) {
            const commentRatingsQuery =
               "SELECT * FROM ratings WHERE comment_id IN (?) AND user_id = ?"
            const commentRatingsParams = [commentIds, userId]
            const [commentRatings] = await req.database.query(
               commentRatingsQuery,
               commentRatingsParams
            )
            ratings = ratings.concat(commentRatings)
         }

         if (commentPostIds.length > 0) {
            const commentPostsQuery = "SELECT * FROM posts WHERE id IN (?)"
            const commentPostsParams = [commentPostIds]
            const [posts] = await req.database.query(
               commentPostsQuery,
               commentPostsParams
            )
            commentPosts = commentPosts.concat(posts)
         }

         if (tab === "saved") {
            const selectQuery = "SELECT saved FROM users WHERE id = ?"
            const selectParams = [userId]
            const [savedposts] = await req.database.query(
               selectQuery,
               selectParams
            )
            const savedString = savedposts[0].saved
            const savedIds = savedString
               ? savedString.split(",").map(Number)
               : []

            const savedQuery = "SELECT * FROM posts WHERE id IN (?)"
            const savedParams = [savedIds]
            if (savedIds.length > 0) {
               ;[saved] = await req.database.query(savedQuery, savedParams)
               const updatedSaved = savedIds.filter((id) =>
                  saved.some((post) => post.id === id)
               )
               const updateQuery = "UPDATE users SET saved = ? WHERE id = ?"
               const updateParams = [updatedSaved.join(","), userId]
               await req.database.query(updateQuery, updateParams)
            }
         }

         if (user.length > 0) {
            return res.render("profile", {
               tab,
               saved,
               page,
               pagelimit,
               req,
               user: user[0],
               posts,
               comments,
               commentPosts,
               ratings,
               title: `${user[0].name}'s Profile`,
               layout: "./layouts/profile",
            })
         } else {
            return res.status(404).send("<h1>User Not Found</h1>")
         }
      } catch (error) {
         console.error(error)
         return res.status(500).send("<h1>Internal Server Error</h1>")
      }
   }
)

router.post("/editnote", auth, async (req, res) => {
   try {
      const userId = req.userId
      const note = req.body.text

      const updateQuery = "UPDATE users SET note = ? WHERE id = ?"
      const updateParams = [note, userId]
      await req.database.query(updateQuery, updateParams)

      return res.redirect("back")
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

// --------------------------------

module.exports = router
