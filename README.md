## The Service 

It is a very primitive reddit clone that currently does not have a surrogate for link posts and private messaging.

The backend of the application was built with Express.js, EJS and a MySQL database. 


## The Vulnerabilities 

There are three vulnerabilities hidden somewhere in the source code.

I will be listing them here for your convenience. 


### First Vulnerability

If you have a look in **middleware/auth.js** you will find the first vulnerability. 

What it boils down to is that we are serving everything inside of the **/uploads** directory with the line `app.use('/uploads', express.static('./uploads'))` in **app.js** .

This is not good, because while we do have an authentication mechanism in place that forbids unauthorized users access to the path **/uploads/:userId/private/:filename** ,
the previously mentioned line of code allows them to access that directory via path traversal as follows **/uploads/:userId/public/../private/:filename** .

This can be fixed quite easily by deleting the line: `app.use('/uploads', express.static('./uploads'))` inside of **app.js** .


### Second Vulnerability

This one is quite similar to the first vulnerability, there is a broken authentication mechanism in place. 

"So what is going wrong this time around?" you may ask.
The issue here lies in a faulty conditional statement used by the view engine to decide whether to display a users personal profile information.

The first part of that statement is fine because `req.userId` is a parameter that is set by the authentication middleware and gets derived from decoding the users session-cookie.

The problematic part is in the second part of the statement which checks for a query parameter **userId**, which anyone can easily supply.
Therefore it is possible to access a users private profile information as follows **/user/profile/{victimId}?userId={victimId}** .

This can be fixed by rewriting the conditional statement as follows `if(parseInt(req.userId) === parseInt(req.params.id))` .


### Third Vulnerability

Okay this one is a bit more complicated so bear with me. 

What if users could upload malicious code instead of a profile picture and have it evaluated on top of that?
On CVExchange they can... But! There are some hurdles to overcome first. 

Obviously the creator of CVExchange tried to do his best to avoid this menacing situation but he may not have been dilligent enough.
He has integrated client-side filters using javascript; But guess what? Client-side filters are not very efficient. 

What does one do to get past the more obstinate server-side filters? 

Well, there is a regular expression checking whether the name of the uploaded file contains **.jpg** so we will name our file **shell.jpg.js** .
But what about the files mimetype? This will just be the value of the **Content-Type** Header in the HTTP request. We will intercept the request and change the value to **image/jpeg**.

Since the servers backend was built with Node.js the creator of CVExchange thought *"Wouldn't it be funny if the server executed arbitrary javascript files uploaded by the user?"*.
You can probably imagine how funny that turned out to be in the end.
