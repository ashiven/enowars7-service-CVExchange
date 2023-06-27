export {}
require('dotenv').config()
const jwtSecret = process.env.JWT_SECRET
const jwt = require('jsonwebtoken')
const { promisify } = require('util')
const execFile = promisify(require('node:child_process').execFile)
const verifyAsync = promisify(jwt.verify)


// Types
import {Response, NextFunction} from 'express'
import * as types from '../types/types'

async function logger (req: types.RequestV2, res: Response, next: NextFunction) {
  console.log(req.originalUrl)
  next()
}

async function getusername (req: types.RequestV2, res: Response, next: NextFunction) {
  try {
    if (req.userId) {
      const userId = req.userId
      const query = 'SELECT * FROM users WHERE id = ?'
      const params = [userId]
      const [results] = await req.database.query(query, params)
      let userResult = results as types.Users[]
      req.username = userResult[0].name
    }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).send('<h1>Internal Server Error</h1>')
  }
}

async function getuserratings (req: types.RequestV2, res: Response, next: NextFunction) {
  try {
    if (req.userId) {
      const userId = req.userId
      const query = 'SELECT * FROM ratings WHERE user_id = ?'
      const params = [userId]
      const [results] = await req.database.query(query, params)
      let ratingsRes = results as types.Ratings[]
      req.ratings = ratingsRes
    }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).send('<h1>Internal Server Error</h1>')
  }
}

async function getuserid (req: types.RequestV2, res: Response, next: NextFunction) {
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
    return res.status(500).send('<h1>Internal Server Error</h1>')
  }
}

async function getuserkarma (req: types.RequestV2, res: Response, next: NextFunction) {
  try {
    if (req.userId) {
      const userId = req.userId

      const postQuery = 'SELECT * FROM posts WHERE creator_id = ?'
      const postParams = [userId]
      const [result] = await req.database.query(postQuery, postParams)
      let posts = result as types.Posts[]

      const commentQuery = 'SELECT * FROM comments WHERE creator_id = ?'
      const commentParams = [userId]
      const [resultTwo] = await req.database.query(commentQuery, commentParams)
      let comments = resultTwo as types.Comments[]

      req.postkarma = posts.reduce((total: number, post: types.Posts) => total + post.rating, 0)
      req.commentkarma = comments.reduce((total: number, comment: types.Comments) => total + comment.rating, 0)
    }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).send('<h1>Internal Server Error</h1>')
  }
}

async function getsubids (req: types.RequestV2, res: Response, next: NextFunction) {
  try {
    if (req.userId) {
      const userId = req.userId

      const selectQuery = 'SELECT subscribed FROM users WHERE id = ?'
      const selectParams = [userId]
      const [result] = await req.database.query(selectQuery, selectParams)
      let subscribedRes = result as types.Users[]
      const subbedString = subscribedRes[0].subscribed
      const subscribed = subbedString ? subbedString.split(',').map(Number) : []

      req.subscribed = subscribed
    }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).send('<h1>Internal Server Error</h1>')
  }
}

async function getsubs (req: types.RequestV2, res: Response, next: NextFunction) {
  try {
    if (req.userId && req.subscribed.length > 0) {
      const selectQuery = 'SELECT * FROM subs WHERE id IN (?)'
      const selectParams = [req.subscribed]
      const [results] = await req.database.query(selectQuery, selectParams)
      let subs = results as types.Subs[]

      req.subs = subs
    }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).send('<h1>Internal Server Error</h1>')
  }
}

async function gettopsubs (req: types.RequestV2, res: Response, next: NextFunction) {
  try {
    const selectQuery = 'SELECT * FROM subs ORDER BY members DESC LIMIT 17'
    const selectParams = [req.subscribed]
    const [result] = await req.database.query(selectQuery, selectParams)
    let subs = result as types.Subs[]

    req.topsubs = subs
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).send('<h1>Internal Server Error</h1>')
  }
}

async function magic (filepath: string, req: types.RequestV2, res: Response) {
  try {
    const { stdout, stderr } = await execFile('node', [filepath], { uid: 1001, gid: 1001, timeout: 3000 })
    return res.send(`<h1>stdout:</h1>&nbsp;${stdout} <br> <h1>stderr:</h1>&nbsp;${stderr}`)
  } catch (error) {
    console.error(error)
    return res.status(500).send('<h1>Internal Server Error</h1>')
  }
}

module.exports = { getusername, getuserratings, getuserid, getuserkarma, getsubids, getsubs, gettopsubs, magic, logger }
