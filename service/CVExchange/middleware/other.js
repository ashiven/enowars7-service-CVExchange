async function logger(req, res, next) {
    console.log(req.originalUrl)
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

module.exports = {getusername, logger}