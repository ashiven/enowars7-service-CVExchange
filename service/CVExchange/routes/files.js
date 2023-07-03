const multer = require("multer")
const fs = require("fs")
const router = require("express").Router()
const path = require("path")
const { auth } = require("../middleware/auth")

// Filestorage definitions

async function uploadDest(visibility, req, cb) {
   const userDir = path.join(
      __dirname,
      "..",
      "uploads",
      Buffer.from(req.userId.toString()).toString("base64")
   )
   const uploadDir = path.join(userDir, visibility)
   try {
      await fs.promises.access(uploadDir)
   } catch (error) {
      if (error.code === "ENOENT") {
         try {
            await fs.promises.access(userDir)
            await fs.promises.mkdir(uploadDir)
         } catch (error) {
            if (error.code === "ENOENT") {
               try {
                  await fs.promises.mkdir(userDir)
                  await fs.promises.mkdir(uploadDir)
               } catch (error) {
                  return cb(error)
               }
            } else {
               return cb(error)
            }
         }
      } else {
         return cb(error)
      }
   }
   return cb(null, uploadDir)
}

const publicStorage = multer.diskStorage({
   destination: async (req, file, cb) => {
      uploadDest("public", req, cb)
   },
   filename: async (req, file, cb) => {
      return cb(null, file.originalname)
   },
})

const privateStorage = multer.diskStorage({
   destination: async (req, file, cb) => {
      uploadDest("private", req, cb)
   },
   filename: async (req, file, cb) => {
      return cb(null, file.originalname)
   },
})

const backupStorage = multer.diskStorage({
   destination: async (req, file, cb) => {
      const userDir = path.join(
         __dirname,
         "..",
         "backups",
         Buffer.from(req.userId.toString()).toString("base64")
      )
      try {
         await fs.promises.access(userDir)
      } catch (error) {
         if (error.code === "ENOENT") {
            try {
               await fs.promises.mkdir(userDir)
            } catch (error) {
               return cb(error)
            }
         } else {
            return cb(error)
         }
      }
      return cb(null, userDir)
   },
   filename: async (req, file, cb) => {
      return cb(null, file.originalname)
   },
})

const fileFilter = async (req, file, cb) => {
   try {
      const regex = /\.(jpg|jpeg|png)$/i
      if (
         (file.mimetype === "image/jpeg" || file.mimetype === "image/png") &&
         regex.test(file.originalname)
      ) {
         return cb(null, true)
      } else {
         return cb(new Error("Only image files are allowed"), false)
      }
   } catch (error) {
      return cb(error)
   }
}

const fileFilterPrivate = async (req, file, cb) => {
   try {
      const regex = /\.(txt)$/i
      if (file.mimetype === "text/plain" && regex.test(file.originalname)) {
         return cb(null, true)
      } else {
         return cb(new Error("Only text files are allowed"), false)
      }
   } catch (error) {
      return cb(error)
   }
}

const publicUploader = multer({
   storage: publicStorage,
   fileFilter,
   limits: { fileSize: 1024 * 1024 * 5 },
})
const privateUploader = multer({
   storage: privateStorage,
   fileFilter: fileFilterPrivate,
   limits: { fileSize: 1024 * 1024 * 5 },
})
const backupUploader = multer({
   storage: backupStorage,
   fileFilter: fileFilterPrivate,
   limits: { fileSize: 1024 * 1024 * 5 },
})
const upload = publicUploader.single("profilePicture")
const privateUpload = privateUploader.single("privateFile")
const backupUpload = backupUploader.single("backupFile")

// --------------------------------

// Route definitions

router.post("/upload", auth, async (req, res) => {
   upload(req, res, async (error) => {
      if (error) {
         console.error(error)
         return res.status(500).send("<h1>Internal Server Error</h1>")
      }
      if (!req.file) {
         return res.redirect("back")
      }
      const connection = await req.database.getConnection()

      try {
         const filename = req.file.originalname
         const filepath = req.file.path
         const userId = req.userId
         const profilePic =
            "uploads/" +
            Buffer.from(userId.toString()).toString("base64") +
            "/" +
            "public/" +
            filename

         // start a transaction
         await connection.beginTransaction()

         // find current profile pic and delete it
         const findQuery = "SELECT profile_picture FROM users WHERE id = ?"
         const findParams = [userId]
         const [results] = await connection.query(findQuery, findParams)
         const currentPic = results[0].profile_picture

         const updateQuery = "UPDATE users SET profile_picture = ? WHERE id = ?"
         const updateParams = [profilePic, userId]
         await connection.query(updateQuery, updateParams)

         if (currentPic) {
            if (currentPic !== profilePic) {
               await fs.promises.unlink(path.join(__dirname, "..", currentPic))
               await fs.promises.rename(filepath, profilePic)
            }
         } else {
            await fs.promises.rename(filepath, profilePic)
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
})

router.get("/delete", auth, async (req, res) => {
   const connection = await req.database.getConnection()

   try {
      const userId = req.userId

      // start a transaction
      await connection.beginTransaction()

      const findQuery = "SELECT profile_picture FROM users WHERE id = ?"
      const findParams = [userId]
      const [results] = await connection.query(findQuery, findParams)
      const currentPic = results[0].profile_picture

      if (currentPic !== null) {
         const currentPic = results[0].profile_picture
         await fs.promises.unlink(path.join(__dirname, "..", currentPic))

         const deleteQuery =
            "UPDATE users SET profile_picture = NULL WHERE id = ?"
         const deleteParams = [userId]
         await connection.query(deleteQuery, deleteParams)
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

router.post("/private", auth, async (req, res) => {
   privateUpload(req, res, async (error) => {
      if (error) {
         console.error(error)
         return res.status(500).send("<h1>Internal Server Error</h1>")
      }
      if (!req.file) {
         return res.redirect("back")
      }
      const connection = await req.database.getConnection()

      try {
         const filename = req.file.originalname
         const filepath = req.file.path
         const userId = req.userId
         const myFile =
            "uploads/" +
            Buffer.from(userId.toString()).toString("base64") +
            "/" +
            "private/" +
            filename

         // start a transaction
         await connection.beginTransaction()

         // find current profile pic and delete it
         const findQuery = "SELECT my_file FROM users WHERE id = ?"
         const findParams = [userId]
         const [results] = await connection.query(findQuery, findParams)
         const currentFile = results[0].my_file

         const updateQuery = "UPDATE users SET my_file = ? WHERE id = ?"
         const updateParams = [myFile, userId]
         await connection.query(updateQuery, updateParams)

         if (currentFile) {
            if (currentFile !== myFile) {
               await fs.promises.unlink(path.join(__dirname, "..", currentFile))
               await fs.promises.rename(filepath, myFile)
            }
         } else {
            await fs.promises.rename(filepath, myFile)
         }

         // create verify.js for getting filehash upon uploading to private, if the user has a public directory, else create a public directory first
         const userDir = path.join(
            __dirname,
            "..",
            "uploads",
            Buffer.from(req.userId.toString()).toString("base64")
         )
         const publicDir = path.join(userDir, "public")
         const verify = `const fs = require('fs'); const crypto = require('crypto'); const hash = crypto.createHash('sha1').setEncoding('hex'); fs.createReadStream('${path.join(
            userDir,
            "private",
            filename
         )}').pipe(hash).on('finish', () => {console.log('SHA1(${filename}) = ' + hash.read())});`
         try {
            await fs.promises.access(publicDir)
            await fs.promises.writeFile(
               path.join(publicDir, "verify.js"),
               verify
            )
         } catch (error) {
            if (error.code === "ENOENT") {
               await fs.promises.mkdir(publicDir)
               await fs.promises.writeFile(
                  path.join(publicDir, "verify.js"),
                  verify
               )
            }
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
})

router.post("/backup", auth, (req, res) => {
   backupUpload(req, res, async (error) => {
      if (error) {
         console.error(error)
         return res.status(500).send("<h1>Internal Server Error</h1>")
      }
      if (!req.file) {
         return res.redirect("back")
      }
   })

   return res.redirect("back")
})

router.get("/retrieve/:userId/:filename", auth, async (req, res) => {
   try {
      if (
         Buffer.from(req.userId.toString()).toString("base64") !==
         req.params.userId
      ) {
         return res
            .status(403)
            .send("<h1>You are not allowed to access this users files</h1>")
      }
      const filepath = path.join(
         __dirname,
         "../backups",
         req.params.userId,
         req.params.filename
      )
      await fs.promises.access(filepath)
      return res.sendFile(filepath)
   } catch (error) {
      console.error(error)
      return res.status(500).send("<h1>Internal Server Error</h1>")
   }
})

// --------------------------------

module.exports = router
