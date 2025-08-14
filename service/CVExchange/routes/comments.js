const router = require("express").Router()
const sanitizer = require("sanitizer")
const { auth } = require("../middleware/auth")
const { getusername } = require("../middleware/other")

// Route definitions

router.post("/new", auth, getusername, async (req, res) => {
   const connection = await req.database.getConnection()

   try {
      const comment = sanitizer.escape(req.body.comment)
      if (!comment || comment === "") {
         await connection.release()
         return res.status(500).send("<h1>You need to supply a comment!</h1>")
      }
      if (comment.length > 500) {
         await connection.release()
         return res
            .status(500)
            .send("<h1>Please limit your comment to 500 characters.</h1>")
      }

      const postId = req.body.postId
      if (!Number.isInteger(parseInt(postId))) {
         await connection.release()
         return res.status(500).send("<h1>Invalid Post ID.</h1>")
      }
      let parentId
      if (req.body.parentId) {
         parentId = req.body.parentId
         if (!Number.isInteger(parseInt(parentId))) {
            await connection.release()
            return res.status(500).send("<h1>Invalid Parent ID.</h1>")
         }
      }
      const creatorId = req.userId
      const creatorName = req.username

      // start a transaction
      await connection.beginTransaction()

      const spamQuery =
         "SELECT * FROM comments WHERE creator_id = ? ORDER BY datetime DESC LIMIT 1"
      const spamParams = [creatorId]
      const [spam] = await connection.query(spamQuery, spamParams)

      if (spam.length > 0) {
         // ensure that users can only post a new comment every 3 seconds
         if (Math.floor((new Date() - spam[0].datetime) / 1000) < 3) {
            await connection.commit()
            await connection.release()
            return res.redirect(`/posts/${postId}`)
         }
      }

      if (parentId) {
         const insertQuery =
            "INSERT INTO comments (text, post_id, creator_id, creator_name, rating, datetime, parent_id) VALUES (?, ?, ?, ?,  1,  NOW(), ? )"
         const insertParams = [
            comment,
            postId,
            creatorId,
            creatorName,
            parentId,
         ]
         await connection.query(insertQuery, insertParams)
      } else {
         const insertQuery =
            "INSERT INTO comments (text, post_id, creator_id, creator_name, rating, datetime) VALUES (?, ?, ?, ?,  1,  NOW() )"
         const insertParams = [comment, postId, creatorId, creatorName]
         await connection.query(insertQuery, insertParams)
      }

      const commentIdQuery = "SELECT LAST_INSERT_ID() AS id FROM comments"
      const [results] = await connection.query(commentIdQuery)
      const commentId = results[0].id

      const ratingQuery =
         "INSERT INTO ratings (user_id, comment_id, rating, datetime) VALUES (?, ?, 1, NOW())"
      const ratingParams = [creatorId, commentId]
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
})

router.post("/edit/:id", auth, async (req, res) => {
   try {
      const text = sanitizer.escape(req.body.text)
      if (!text || text === "") {
         return res.status(500).send("<h1>You need to supply a comment!</h1>")
      }
      if (text.length > 500) {
         return res
            .status(500)
            .send("<h1>Please limit your comment to 500 characters.</h1>")
      }
      const commentId = req.params.id
      if (!Number.isInteger(parseInt(commentId))) {
         return res.status(500).send("<h1>Invalid Comment ID.</h1>")
      }
      const userId = req.userId

      const query =
         "UPDATE comments SET text = ? WHERE id = ? AND creator_id = ?"
      const params = [text, commentId, userId]
      await req.database.query(query, params)

      return res.redirect("back")
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

router.get("/delete/:id", auth, async (req, res) => {
   const connection = await req.database.getConnection()

   try {
      const commentId = req.params.id
      if (!Number.isInteger(parseInt(commentId))) {
         await connection.release()
         return res
            .status(500)
            .send("<h1>Invalid Comment ID.</h1>")
      }
      const userId = req.userId

      // start a transaction
      await connection.beginTransaction()

      const findQuery = "SELECT * FROM comments WHERE id = ? AND creator_id = ?"
      const findParams = [commentId, userId]
      const [findResults] = await connection.query(findQuery, findParams)

      if (findResults.length > 0) {
         const deletedIds = []
         await deleteChildren(connection, commentId, deletedIds)

         const deleteRatingsQuery =
            "DELETE FROM ratings WHERE comment_id IN (?)"
         const deleteRatingsParams = [deletedIds]
         await connection.query(deleteRatingsQuery, deleteRatingsParams)

         // commit the transaction and release the connection
         await connection.commit()
         await connection.release()

         return res.redirect("back")
      } else {
         // commit the transaction and release the connection
         await connection.commit()
         await connection.release()

         return res
            .status(401)
            .send(
               "<h1>You are not authorized to delete this comment or it doesn't exist</h1>"
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

// --------------------------------

// Function definitions

async function deleteChildren(connection, commentId, deletedIds) {
   const childQuery = "SELECT id FROM comments WHERE parent_id = ?"
   const childParams = [commentId]
   const [children] = await connection.query(childQuery, childParams)

   const deleteQuery = "DELETE FROM comments WHERE id = ?"
   const deleteParams = [commentId]
   await connection.query(deleteQuery, deleteParams)

   deletedIds.push(commentId)

   for (const child of children) {
      await deleteChildren(connection, child.id, deletedIds)
   }
}

// --------------------------------

module.exports = router
