async function transaction(queries, queryValues, pool) {
    if (queries.length !== queryValues.length) {
        return Promise.reject(
            'Number of provided queries did not match the number of provided query values arrays'
        )
    }
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const queryPromises = []
        queries.forEach((query, index) => {
            queryPromises.push(connection.query(query, queryValues[index]))
        })
        const results = await Promise.all(queryPromises)
        await connection.commit()
        await connection.release()
        return results
    } 
    catch (error) {
        await connection.rollback()
        await connection.release()
        return Promise.reject(error)
    }
}

module.exports = { transaction }