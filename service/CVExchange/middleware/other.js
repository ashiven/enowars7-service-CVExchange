function logger(req, res, next) {
    console.log(req.originalUrl)
    next()
}

function getusername(req, res, next) {
    const userId = req.userId
    const query = `SELECT * FROM users WHERE id = ${userId}`
    req.database.query(query, (error, results) => {
        if(error) throw error
        req.username = results[0].name
        next()
    })
}

module.exports = {getusername, logger}