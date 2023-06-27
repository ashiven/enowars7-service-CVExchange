export {}
const router = require("express").Router()
const sanitizer = require("sanitizer")
const { auth } = require("../middleware/auth")
const {
   getusername,
   getuserkarma,
   getsubids,
   getsubs,
   gettopsubs,
} = require("../middleware/other")

// Types
import { Response } from "express"
import * as types from "../types/types"
interface CommentsV2 extends types.Comments {
   children: types.Comments[]
}
interface map {
   [key: number]: CommentsV2
}

// Route definitions

router.get(
   "/new",
   auth,
   getusername,
   getuserkarma,
   getsubids,
   getsubs,
   gettopsubs,
   async (req: types.RequestV2, res: Response) => {
      try {
         return res.render("newpost", {
            req,
            subbed: req.subs,
            title: "New Post",
            layout: "./layouts/standard",
            status: "",
         })
      } catch (error) {
         console.error(error)
         return res.status(500).send("<h1>Internal Server Error</h1>")
      }
   }
)

router.post(
   "/new",
   auth,
   getusername,
   getsubids,
   getsubs,
   async (req: types.RequestV2, res: Response) => {
      const connection = await req.database.getConnection()

      try {
         const title = sanitizer.escape(req.body.title)
         const text = sanitizer.escape(req.body.text)
         if (!title || !text || title === "" || text === "") {
            await connection.release()
            return res.render("newpost", {
               req,
               subbed: req.subs,
               title: "New Post",
               layout: "./layouts/standard",
               status: "You need to include a title and text!",
            })
         }
         if (title.length < 8) {
            await connection.release()
            return res.render("newpost", {
               req,
               subbed: req.subs,
               title: "New Post",
               layout: "./layouts/standard",
               status:
                  "Please provide a title containing at least 8 characters.",
            })
         }
         if (title.length > 400 || text.length > 4000) {
            await connection.release()
            return res.render("newpost", {
               req,
               subbed: req.subs,
               title: "New Post",
               layout: "./layouts/standard",
               status:
                  "Please limit the title to 400 characters and the body to 4000 characters.",
            })
         }
         const subId = req.body.subid
         if (!Number.isInteger(parseInt(subId))) {
            await connection.release()
            return res
               .status(500)
               .send("<h1>Thats not a number in my world.</h1>")
         }
         if (!req.subscribed.includes(parseInt(subId))) {
            await connection.release()
            return res
               .status(500)
               .send("<h1>You are not subscribed to this subexchange.</h1>")
         }

         const nameQuery = "SELECT name FROM subs WHERE id = ?"
         const nameParams = [subId]
         const [result] = await connection.query(nameQuery, nameParams)
         const subNameResult = result as types.Subs[]
         const subName = subNameResult[0].name

         const creatorId = req.userId
         const creatorName = req.username

         // start a transaction
         await connection.beginTransaction()

         const spamQuery =
            "SELECT * FROM posts WHERE creator_id = ? ORDER BY datetime DESC LIMIT 1"
         const spamParams = [creatorId]
         const [resultTwo] = await connection.query(spamQuery, spamParams)
         const spam = resultTwo as types.Posts[]

         if (spam.length > 0) {
            // ensure that users can only create a new post every 10 seconds

            const currentTime = new Date().getTime()
            const spamTime = spam[0].datetime.getTime()
            if (Math.floor(currentTime - spamTime / 1000) < 10) {
               await connection.commit()
               await connection.release()
               return res.render("newpost", {
                  req,
                  subbed: req.subs,
                  title: "New Post",
                  layout: "./layouts/standard",
                  status:
                     "Please wait 10 seconds inbetween creating new posts.",
               })
            }
         }

         const insertQuery =
            "INSERT INTO posts (title, text, sub_id, sub_name, rating, creator_id, creator_name, datetime) VALUES (?, ?, ?, ?, 1, ?, ?, NOW() )"
         const insertParams = [
            title,
            text,
            subId,
            subName,
            creatorId,
            creatorName,
         ]
         await connection.query(insertQuery, insertParams)

         const postIdQuery = "SELECT LAST_INSERT_ID() AS id FROM posts"
         const [results] = await connection.query(postIdQuery)
         const postIdResults = results as types.Posts[]
         const postId = postIdResults[0].id

         const ratingQuery =
            "INSERT INTO ratings (user_id, post_id, rating, datetime) VALUES (?, ?, 1, NOW())"
         const ratingParams = [creatorId, postId]
         await connection.query(ratingQuery, ratingParams)

         // commit the transaction and release the connection
         await connection.commit()
         await connection.release()

         return res.redirect(`/posts/${postId}`)
      } catch (error) {
         // if there was an error, rollback changes and release the connection
         await connection.rollback()
         await connection.release()

         console.error(error)
         return res.status(500).send("<h1>Internal Server Error</h1>")
      }
   }
)

router.get(
   "/:id",
   auth,
   getusername,
   getuserkarma,
   getsubids,
   getsubs,
   gettopsubs,
   async (req: types.RequestV2, res: Response) => {
      try {
         const postId = req.params.id
         if (!Number.isInteger(parseInt(postId))) {
            return res
               .status(500)
               .send("<h1>That's not a valid ID in my world.</h1>")
         }
         let ratings: types.Ratings[] = []
         let sort = "top"

         const postQuery = "SELECT * FROM posts WHERE id = ?"
         const postParams = [postId]
         const [result] = await req.database.query(postQuery, postParams)
         const post = result as types.Posts[]
         if (post.length === 0) {
            return res.status(404).send("<h1>Post not found</h1>")
         }
         const postRatingQuery =
            "SELECT * FROM ratings WHERE post_id = ? AND user_id = ?"
         const postRatingParams = [post[0].id, req.userId]
         const [resultTwo] = await req.database.query(
            postRatingQuery,
            postRatingParams
         )
         const postRating = resultTwo as types.Ratings[]
         ratings = ratings.concat(postRating)

         let commentQuery =
            "SELECT * FROM comments WHERE post_id = ? ORDER BY rating DESC"
         let commentParams = [postId]

         if (req.query.sort) {
            sort = req.query.sort.toString()
            if (sort === "new") {
               commentQuery =
                  "SELECT * FROM comments WHERE post_id = ? ORDER BY datetime ASC"
            } else if (sort === "hot") {
               commentQuery = `SELECT * FROM (
                                    SELECT c.*, COUNT(r.id) as ratecount 
                                    FROM comments c
                                    LEFT JOIN ratings r ON c.id = r.comment_id
                                    WHERE r.datetime >= NOW() - INTERVAL 1 HOUR AND c.post_id = ? AND r.rating = 1
                                    GROUP BY c.id

                                    UNION 

                                    SELECT c1.*, 0 as ratecount
                                    FROM comments c1 
                                    WHERE id NOT IN (
                                        SELECT c2.id 
                                        FROM comments c2 
                                        LEFT JOIN ratings r2 on c2.id = r2.comment_id 
                                        WHERE r2.datetime >= NOW() - INTERVAL 1 HOUR AND c2.post_id = ? AND r2.rating = 1
                                    ) AND c1.post_id = ?
                                ) AS subquery
                                ORDER BY ratecount DESC, rating DESC`
               commentParams = [postId, postId, postId]
            }
         }

         const [resultThree] = await req.database.query(
            commentQuery,
            commentParams
         )
         const comments = resultThree as types.Comments[]
         const commentIds = comments.map(
            (comment: types.Comments) => comment.id
         )

         const commentMap: map = {}
         const rootComments = []

         // comment map with key: commentId  value: comment
         for (const comment of comments as CommentsV2[]) {
            comment.children = []
            commentMap[comment.id] = comment
         }

         // fill children list for each comment and fill root comments
         for (const comment of comments as CommentsV2[]) {
            if (comment.parent_id !== null) {
               const parent = commentMap[comment.parent_id]
               parent.children.push(comment)
            } else {
               rootComments.push(comment)
            }
         }

         // sort children by rating descending
         for (const comment of rootComments) {
            comment.children.sort(
               (a: types.Comments, b: types.Comments) => b.rating - a.rating
            )
         }

         if (commentIds.length > 0) {
            const commentRatingsQuery =
               "SELECT * FROM ratings WHERE comment_id IN (?) AND user_id = ?"
            const commentRatingsParams = [commentIds, req.userId]
            const [resultFour] = await req.database.query(
               commentRatingsQuery,
               commentRatingsParams
            )
            const commentRatings = resultFour as types.Ratings[]
            ratings = ratings.concat(commentRatings)
         }

         const subQuery = "SELECT * FROM subs WHERE id = ?"
         const subParams = [post[0].sub_id]
         const [resultFive] = await req.database.query(subQuery, subParams)
         const sub = resultFive as types.Subs[]

         return res.render("post", {
            req,
            sort,
            sub: sub[0],
            post: post[0],
            ratings,
            comments: rootComments,
            title: `${post[0].title}`,
            layout: "./layouts/post",
         })
      } catch (error) {
         console.error(error)
         return res.status(500).send("<h1>Internal Server Error</h1>")
      }
   }
)

router.get("/delete/:id", auth, async (req: types.RequestV2, res: Response) => {
   const connection = await req.database.getConnection()

   try {
      const postId = req.params.id
      if (!Number.isInteger(parseInt(postId))) {
         await connection.release()
         return res.status(500).send("<h1>Can't delete imaginary posts.</h1>")
      }
      const userId = req.userId

      // start a transaction
      await connection.beginTransaction()

      const findQuery = "SELECT * FROM posts WHERE id = ? AND creator_id = ?"
      const findParams = [postId, userId]
      const [results] = await connection.query(findQuery, findParams)
      const posts = results as types.Posts[]

      if (posts.length > 0) {
         // first delete the post
         const deletePostQuery = "DELETE FROM posts WHERE id = ?"
         const deletePostParams = [postId]
         await connection.query(deletePostQuery, deletePostParams)

         // find all comments for the post
         const searchCommentsQuery = "SELECT * FROM comments WHERE post_id = ?"
         const searchCommentsParams = [postId]
         const [results] = await connection.query(
            searchCommentsQuery,
            searchCommentsParams
         )
         const comments = results as types.Comments[]

         // delete the ratings for every comment
         for (const comment of comments) {
            const deleteRatingsQuery =
               "DELETE FROM ratings WHERE comment_id = ?"
            const deleteRatingsParams = [comment.id]
            await connection.query(deleteRatingsQuery, deleteRatingsParams)
         }

         // delete the comments for the post
         const deleteCommentsQuery = "DELETE FROM comments WHERE post_id = ?"
         const deleteCommentsParams = [postId]
         await connection.query(deleteCommentsQuery, deleteCommentsParams)

         // delete the ratings for the post
         const deleteRatingsQuery = "DELETE FROM ratings WHERE post_id = ?"
         const deleteRatingsParams = [postId]
         await connection.query(deleteRatingsQuery, deleteRatingsParams)

         if (req.originalUrl === `/posts/delete/${postId}`) {
            // commit the transaction and release the connection
            await connection.commit()
            await connection.release()

            return res.redirect("/")
         } else {
            // commit the transaction and release the connection
            await connection.commit()
            await connection.release()

            return res.redirect("back")
         }
      } else {
         // commit the transaction and release the connection
         await connection.commit()
         await connection.release()

         return res
            .status(401)
            .send(
               "<h1>You are not authorized to delete this post or the post doesn't exist.</h1>"
            )
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
   "/edit/:id",
   auth,
   getusername,
   getuserkarma,
   getsubids,
   getsubs,
   gettopsubs,
   async (req: types.RequestV2, res: Response) => {
      try {
         const postId = req.params.id
         if (!Number.isInteger(parseInt(postId))) {
            return res
               .status(500)
               .send("<h1>What are you even trying to edit?</h1>")
         }
         const userId = req.userId

         const query = "SELECT * FROM posts WHERE id = ? AND creator_id = ?"
         const params = [postId, userId]
         const [results] = await req.database.query(query, params)
         const posts = results as types.Posts[]

         if (posts.length > 0) {
            return res.render("editpost", {
               req,
               post: posts[0],
               postId,
               title: "Edit Post",
               layout: "./layouts/standard",
               status: "",
            })
         } else {
            return res.status(404).send("<h1>Post not found</h1>")
         }
      } catch (error) {
         console.error(error)
         return res.status(500).send("<h1>Internal Server Error</h1>")
      }
   }
)

router.post("/edit/:id", auth, async (req: types.RequestV2, res: Response) => {
   try {
      const postId = req.params.id
      if (!Number.isInteger(parseInt(postId))) {
         return res
            .status(500)
            .send(`<h1>Since when is "${postId}" a number huh?</h1>`)
      }
      const userId = req.userId

      const postQuery = "SELECT * FROM posts WHERE id = ? AND creator_id = ?"
      const postParams = [postId, userId]
      const [results] = await req.database.query(postQuery, postParams)
      const posts = results as types.Posts[]

      if (posts.length <= 0) {
         return res.status(404).send("<h1>Post not found</h1>")
      }

      const title = sanitizer.escape(req.body.title)
      const text = sanitizer.escape(req.body.text)
      if (!title || !text || title === "" || text === "") {
         return res.render("editpost", {
            req,
            post: posts[0],
            postId,
            title: "Edit Post",
            layout: "./layouts/standard",
            status: "You need to include a title and text!",
         })
      }
      if (title.length < 8) {
         return res.render("editpost", {
            req,
            post: posts[0],
            postId,
            title: "Edit Post",
            layout: "./layouts/standard",
            status: "Please provide a title containing at least 8 characters.",
         })
      }
      if (title.length > 400 || text.length > 4000) {
         return res.render("editpost", {
            req,
            post: posts[0],
            postId,
            title: "Edit Post",
            layout: "./layouts/standard",
            status:
               "Please limit the title to 400 characters and the body to 4000 characters.",
         })
      }

      const query =
         "UPDATE posts SET title = ?, text = ? WHERE id = ? AND creator_id = ?"
      const params = [title, text, postId, userId]
      await req.database.query(query, params)

      return res.redirect(`/posts/${postId}`)
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

router.get("/save/:id", auth, async (req: types.RequestV2, res: Response) => {
   const connection = await req.database.getConnection()

   try {
      const userId = req.userId
      const postId = req.params.id
      if (!Number.isInteger(parseInt(postId))) {
         await connection.release()
         return res.status(500).send("<h1>Stop it. Get some help.</h1>")
      }
      let updatedSaved

      // start a transaction
      await connection.beginTransaction()

      const selectQuery = "SELECT saved FROM users WHERE id = ?"
      const selectParams = [userId]
      const [results] = await connection.query(selectQuery, selectParams)
      const savedposts = results as types.Users[]
      const savedString = savedposts[0].saved
      const saved = savedString ? savedString.split(",") : []

      if (saved.includes(postId)) {
         updatedSaved = saved.filter((savedId: string) => savedId !== postId)
      } else {
         updatedSaved = [...saved, postId]
      }

      const updateQuery = "UPDATE users SET saved = ? WHERE id = ?"
      const updateParams = [updatedSaved.join(","), userId]
      await connection.query(updateQuery, updateParams)

      // commit the transaction and release the connection
      await connection.commit()
      await connection.release()

      return res.redirect("back")
   } catch (error) {
      // if there was an error, rollback changes and release the connection
      await connection.rollback()
      await connection.release()

      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

// this is just an endpoint used by the checker to know how exactly the text gets sanitized
router.post("/sanitize", auth, async (req: types.RequestV2, res: Response) => {
   try {
      const text = req.body.text
      return res.send(
         sanitizer
            .escape(text)
            .replace(/(\r\n){3,}/g, "\r\n\r\n")
            .replace(/\r\n/g, "<br>")
      )
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

// --------------------------------

module.exports = router
