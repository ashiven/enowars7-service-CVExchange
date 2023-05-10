async function logger(req, res, next) {
    console.log(req.originalUrl)
    next()
}

async function errorHandler(error, req, res, next) {
    if(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
    next()
}

async function getusername(req, res, next) {
    try {
        const userId = req.userId
        const query = `SELECT * FROM users WHERE id = ?`
        const params = [userId]
        const [results] = await req.database.query(query, params)
        req.username = results[0].name
        next()
    } 
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function getuserratings(req, res, next) {
    try {
        const userId = req.userId
        const query = `SELECT * FROM ratings WHERE user_id = ?`
        const params = [userId]
        const [results] = await req.database.query(query, params)
        req.ratings = results
        next()
    } 
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

module.exports = {getusername, getuserratings, logger, errorHandler}