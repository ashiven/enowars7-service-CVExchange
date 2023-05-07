const multer = require('multer')
const upload = multer({ dest: 'uploads/'})
const fs = require('fs')
const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const path = require('path')


// Route definitions


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

//--------------------------------


// Function definitions

function randomName(string) {
    console.log(string)
}

//--------------------------------


module.exports = router 