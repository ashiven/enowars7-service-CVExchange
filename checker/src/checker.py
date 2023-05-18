import secrets #secure random number generation 
from typing import Optional #type checking / optional parameters i.e. a function may or may not return for example a str. used for code clarity
from httpx import AsyncClient #client for http requests
from enochecker3 import (
    ChainDB,
    Enochecker,
    GetflagCheckerTaskMessage,
    MumbleException,
    PutflagCheckerTaskMessage,
)
from enochecker3.utils import FlagSearcher, assert_equals, assert_in
from bs4 import BeautifulSoup
import random
import string


checker = Enochecker("CVExchange", 1337)


@checker.putflag(0)
async def putflag_test(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:

    # register so client has a cookie 
    name, password = ''.join(random.choices(string.ascii_letters + string.digits, k=10)), ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '@' + ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    registerResp = await client.post("/user/register", json={"name": name, "email": email, "password": password})
    
    # deposit the flag as the users personal note
    uploadResp = await client.post("/user/editnote", json={"text": task.flag})
    assert_equals(uploadResp.status_code, 200, "couldn't store flag under /user/editnote")
    await db.set("userinfo", (email, password) )


@checker.putflag(1)
async def putflag_test(task: PutflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:
   
    # register so client has a cookie 
    name, password = ''.join(random.choices(string.ascii_letters + string.digits, k=10)), ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    email = ''.join(random.choices(string.ascii_letters + string.digits, k=5)) + '@' + ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    registerResp = await client.post("/user/register", json={"name": name, "email": email, "password": password})

    # create a .txt file containing the flag and upload it to /files/private
    with open('flag.txt', 'w') as flagFile:
        flagFile.write(task.flag)

    uploadResp = await client.post('/files/private', json={"file": open('flag.txt', 'rb')})
    assert_equals(uploadResp.status_code, 302, "couln't store flag under /files/private")
    await db.set("userinfo", (email, password))


@checker.getflag(0)
async def getflag_test(task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:

    # login with registration data from putflag(0)
    try:
        email, password = await db.get("userinfo")
    except KeyError:
        raise MumbleException("couldn't retrieve userinfo from DB")
    
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
    assert_in(task.flag, flagResp.text, "flag not on profile page")

#TODO:
@checker.getflag(1)
async def getflag_test(task: GetflagCheckerTaskMessage, client: AsyncClient, db: ChainDB) -> None:
    
    try:
        token = await db.get("token")
    except KeyError:
        raise MumbleException("Missing database entry from putflag")
    response = await client.get(f"/note/{token}")
    assert_equals(response.status_code, 200, "getting note with flag failed")
    assert_in(task.flag, response.text, "flag missing from note")

#TODO:
@checker.exploit(0)
async def exploit_test(searcher: FlagSearcher, client: AsyncClient) -> Optional[str]:
    
    response = await client.get("/note/*")
    assert not response.is_error
    if flag := searcher.search_flag(response.text):
        return flag