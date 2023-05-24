const CMariadb = require('./CMariaDB');
const {Builder, Browser, until, By} = require("selenium-webdriver");
let chrome = require("selenium-webdriver/chrome");
const cheerio = require("cheerio");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createConn() {
    let conn = await CMariadb.makeConn();
    console.log('마리아db연결 성공')

    return conn
}

async function createTable(conn) {

    const createTable = ` create table TRANK (
     RK_NO INT AUTO_INCREMENT primary key,
     T_NAME varchar(255),
     TITLE varchar(255)
                          )`

        await conn.query(createTable)

    return conn
}

async function crwalingOne(conn) {
    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().headless().addArguments("–allow-running-insecure-content", "–disable-logging"))
        .build();

    let Titles = [];
    let T_NAMEs = [];
    try {
        for (let j = 1; j <= 4962; j++) { // 4962까지
            const URL = `https://www.templestay.com/board-review.asp?page=${j}&search_sec=&search_word=`;
            await driver.get(URL);
            await sleep(1000)
            console.log(`4962페이지 중 ${j}페이지!`)
            let i = 1;
            while (true) {

                const html = await driver.getPageSource();
                let $ = await cheerio.load(html);

                let preData = await $(`#post-list > ul > div:nth-child(${i}) > h2 > a`)

                let preText = preData.text()
                if(preText === '') break

                const arr = preText.split("|");
                Titles.push(arr[0].trim())
                T_NAMEs.push(arr[1].trim())

                i++
            }
            sleep(2000)
        }
    } catch (e) {
        console.log(e);
        await CMariadb.closeConn(conn)
    } finally {
        await driver.quit();
    }

    return {Titles,T_NAMEs, conn}

}

async function insertCrawlOne(Titles,T_NAMEs, conn) {
    let insertSql = ` INSERT INTO TRANK (TITLE, T_NAME)
                             VALUES (?, ?) `

    for (let i = 0; i < T_NAMEs.length; i++) {
        let param = [Titles[i], T_NAMEs[i]]

        await conn.query(insertSql, param)

    }
    await CMariadb.closeConn(conn)
}

createConn().then(createTable).then(crwalingOne).then(({Titles, T_NAMEs, conn}) => {insertCrawlOne(Titles,T_NAMEs, conn)})
