export {}
const router = require("express").Router()
const { auth } = require("../middleware/auth")

// Types
import { Response } from "express"
import * as types from "../types/types"
import { RowDataPacket } from "mysql2"
interface accum extends RowDataPacket {
   total_rating: number
}

// Route definitions

router.post("/ratepost", auth, async (req: types.RequestV2, res: Response) => {
   const connection = await req.database.getConnection()

   try {
      const userId = req.userId
      const rating = parseInt(req.body.rating)
      if (!(rating === 1 || rating === -1)) {
         await connection.release()
         return res
            .status(400)
            .send("<h1>I see what you were trying to do ;)</h1>")
      }
      const postId = req.body.postId
      if (!Number.isInteger(parseInt(postId))) {
         await connection.release()
         return res.status(500).send("<h1>That won't work.</h1>")
      }

      // start a transaction
      await connection.beginTransaction()

      const searchQuery =
         "SELECT * FROM ratings WHERE user_id = ? AND post_id = ?"
      const searchParams = [userId, postId]
      const [result] = await connection.query(searchQuery, searchParams)
      const searchResults = result as types.Ratings[]

      // if the user already voted on that post, update/delete their rating
      if (searchResults.length > 0) {
         // they are submitting the same rating again
         if (searchResults[0].rating === rating) {
            const deleteQuery =
               "DELETE FROM ratings WHERE user_id = ? AND post_id = ?"
            const deleteParams = [userId, postId]
            await connection.query(deleteQuery, deleteParams)
         } else {
            const updateQuery =
               "UPDATE ratings SET rating = ?, datetime = NOW() WHERE user_id = ? AND post_id = ?"
            const updateParams = [rating, userId, postId]
            await connection.query(updateQuery, updateParams)
         }
      } else {
         const insertQuery =
            "INSERT INTO ratings (user_id, post_id, rating, datetime) VALUES (?, ?, ?, NOW())"
         const insertParams = [userId, postId, rating]
         await connection.query(insertQuery, insertParams)
      }

      // now we accumulate the ratings of a post and update the rating entry for it
      const accQuery =
         "SELECT SUM(rating) AS total_rating FROM ratings WHERE post_id = ?"
      const accParams = [postId]
      const [resultTwo] = await connection.query(accQuery, accParams)
      const accResults = resultTwo as accum[]

      // we need an if/else in case the post has 0 votes, meaning it should receive a rating of 0
      const total = accResults[0].total_rating
      if (total !== null) {
         const postQuery = "UPDATE posts SET rating = ? WHERE id = ?"
         const postParams = [total, postId]
         await connection.query(postQuery, postParams)
      } else {
         const postQuery = "UPDATE posts SET rating = 0 WHERE id = ?"
         const postParams = [postId]
         await connection.query(postQuery, postParams)
      }

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

router.post(
   "/ratecomment",
   auth,
   async (req: types.RequestV2, res: Response) => {
      const connection = await req.database.getConnection()

      try {
         const userId = req.userId
         const rating = parseInt(req.body.rating)
         if (!(rating === 1 || rating === -1)) {
            await connection.release()
            return res
               .status(400)
               .send("<h1>I see what you were trying to do ;)</h1>")
         }
         const commentId = req.body.commentId
         if (!Number.isInteger(parseInt(commentId))) {
            await connection.release()
            return res.status(500).send("<h1>That won't work.</h1>")
         }

         // start a transaction
         await connection.beginTransaction()

         const searchQuery =
            "SELECT * FROM ratings WHERE user_id = ? AND comment_id = ?"
         const searchParams = [userId, commentId]
         const [result] = await connection.query(searchQuery, searchParams)
         const searchResults = result as types.Ratings[]

         // if the user already voted on that comment, update/delete their rating
         if (searchResults.length > 0) {
            // they are submitting the same rating again
            if (searchResults[0].rating === rating) {
               const deleteQuery =
                  "DELETE FROM ratings WHERE user_id = ? AND comment_id = ?"
               const deleteParams = [userId, commentId]
               await connection.query(deleteQuery, deleteParams)
            } else {
               const updateQuery =
                  "UPDATE ratings SET rating = ?, datetime = NOW() WHERE user_id = ? AND comment_id = ?"
               const updateParams = [rating, userId, commentId]
               await connection.query(updateQuery, updateParams)
            }
         } else {
            const insertQuery =
               "INSERT INTO ratings (user_id, comment_id, rating, datetime) VALUES (?, ?, ?, NOW())"
            const insertParams = [userId, commentId, rating]
            await connection.query(insertQuery, insertParams)
         }

         // now we accumulate the ratings of a comment and update the rating entry for it
         const accQuery =
            "SELECT SUM(rating) AS total_rating FROM ratings WHERE comment_id = ?"
         const accParams = [commentId]
         const [resultTwo] = await connection.query(accQuery, accParams)
         const accResults = resultTwo as accum[]

         // we need an if/else in case the comment has 0 votes, meaning it should receive a rating of 0
         const total = accResults[0].total_rating
         if (total !== null) {
            const commentQuery = "UPDATE comments SET rating = ? WHERE id = ?"
            const commentParams = [total, commentId]
            await connection.query(commentQuery, commentParams)
         } else {
            const commentQuery = "UPDATE comments SET rating = 0 WHERE id = ?"
            const commentParams = [commentId]
            await connection.query(commentQuery, commentParams)
         }

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
   }
)

// --------------------------------

module.exports = router
