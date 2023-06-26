## The Service 

- CVExchange is a simple Reddit clone that does not have a surrogate for link posts and private messaging.
- The backend of the application was built with Express.js, EJS, and a MySQL database. 


## The Vulnerabilities 

- There are three vulnerabilities hidden inside of the source code.
- I will be listing them here, along with an intended fix for each of them. 


### First Vulnerability

- The first vulnerability can be found inside of **app.js**. 
- The webserver is serving the **/uploads** directory statically due to the line `app.use('/uploads', express.static('./uploads'))`.
- This is not secure, because while there is an authentication mechanism in place that forbids unauthorized users from accessing the URI: **/uploads/:userId/private/:filename**,
users are still able to access that directory via the URI: **/uploads/:userId/public/../private/:filename**.
- This vulnerability can be mitigated by deleting the line: `app.use('/uploads', express.static('./uploads'))`.


### Second Vulnerability

- The second vulnerability is quite similar to the first one, as there is a broken authentication mechanism in place.
- The issue lies in the faulty conditional statement `if(parseInt(req.userId) === parseInt(req.params.id) || parseInt(req.userId) === parseInt(req.query.userId))`, used by the view engine to decide whether to display a users personal note.
- The first part of that statement is fine, because `req.userId` is a parameter that is set by the authentication middleware and gets derived from decoding the users session cookie.
- The problem is in the second part, which checks for the query parameter **userId**, which anyone can easily supply.
- Therefore, it is possible to access a users private note through the following URI: **/user/profile/{victimId}?userId={victimId}**.
- This can be fixed by rewriting the conditional statement as follows: `if(parseInt(req.userId) === parseInt(req.params.id))`.


### Third Vulnerability

- Upon uploading a profile picture, the server checks whether the uploaded file is an image file.
- The vulnerability lies in the conditions the server checks to determine whether a file upload is valid.
- The first condition is, that the filename matches the regular expression `/\.(jpg|jpeg|png)/i`, which would also match a filename like **malicious.jpg.js**.
- The second condition a file has to fulfill is that its MIME-Type should be either `image/jpeg` or `image/png`, which is achieved via the conditonal check `file.mimetype === 'image/jpeg || file.mimetype === image/png`.
- If an attacker were to look through the source code of the `multer` module, which the server uses for file uploads, they would find out that `file.mimetype` is derived from the `Content-Type` field of the HTTP-Requests body.
- Lastly, if an attacker were to upload malicious javascript code to their public upload directory and navigate to it, the server would execute that code and display the results to the attacker.
- This is due to the line `if (/\.(js)$/i.test(filepath)) { magic(filepath, req, res) }` inside of **app.js**, where `magic` is a function that can be found in **middleware.js**, that is responsible for file integrity checks and achieves this with child-processes.
