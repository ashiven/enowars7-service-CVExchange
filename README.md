# The Service 

It is basically a primitive reddit clone, which allows for post creation, commenting and user profiles, but does not currently have a surrogate for subreddits, comment threads and a search function.


# The Vulnerabilities 

There are three vulnerabilities hidden, but also well documented, inside of the source code (good luck finding them).

Jokes aside, I will also list them here for your convenience.


## Vulnerability 1)

If you have a look in **middleware/auth.js** you will see the first vulnerability and its documentation. 

What it boils down to is that we are telling the webserver to serve everything inside of the /uploads directory with the line: `app.use('/uploads', express.static('./uploads'))` in **app.js** .

This is not good, because whilst we do have an authentication mechanism in place that disallows strangers to access the path **/uploads/:userId/private/:filename** ,
the previously mentioned line allows us to still access that filepath via path traversal by just accessing the filepath like so: **/uploads/:userId/public/../private/:filename** .

This can be fixed quite easily by simply deleting the line: `app.use('/uploads', express.static('./uploads'))` in **app.js** .


## Vulnerability 2)

Well this one is quite similar to the first one, yet again we have a broken authentication mechanism in place. 
Take a look in **layouts/profile.ejs** for the inline documentation. 

"So what is actually going wrong this time around?" you may ask.
The problem here is that we use a faulty conditional statement with our view engine to decide whether to render a users personal profile information or to just display their public information.

The first part of that statement is just fine because `req.userId` is a parameter that is set by our authentication middleware and gets derived from decoding the session cookie a user has received after logging in.

The problem clearly lies in the second part of the statement which checks whether the user has supplied a query paramater with the name **userId**, which anyone can supply quite easily.
Therefore we are able to access a users private profile information like so: **/user/profile/{whateverTheirIdIs}?userId={whateverTheirIdIs}** .

This can be fixed by rewriting the conditional statement as follows: `if(parseInt(req.userId) === parseInt(req.params.id))` .


## Vulnerability 3)

Okay this one is a bit more complicated so bear with me. 

So what if someone could upload malicious code instead of a profile picture and even have the code evaluated on top of that?
Well, on CVExchange they can... BUT! There are a couple of hurdles to overcome first. 

Obviously the creator of CVExchange tried to do his best to avoid this unfavourable situation but he was not dilligent enough.
He has added client side filefilters using javascript, but guess what? You can disable javascript in browsers or intercept HTTP responses and send the evil filters flying. 

But what do you do to get past the mores stubborn filters on the server side? 

Well, we are using a regex that only checks whether the filename contains **.jpg** so just name your file: **shell.jpg.js** and you're good.
Then again we also check for the file's mimetype which is just the **Content-Type** Header in your file upload's HTTP request, so intercept that and change it to **image/jpeg**.


Voila, you have uploaded something that you shouldn't have. Since the servers backend uses NodeJS, the creator of CVExchange thought: *"Wouldn't it be funny if the server just executed arbitrary javascript files uploaded by the user?"*.
It wasn't funny. 

To recap: we can upload something like **shell.jpg.js** and have it connect back to us, which allows us to do almost anything we want on the server (Yes, we can also delete the entire filesystem, but that is subject to change.) .
