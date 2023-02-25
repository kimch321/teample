// 목표 temple1 테이블의 T_NAME, T_LINK,T_thumbnail에 값 입력.

const cheerio = require('cheerio');
const {Builder, Browser, By, key, until} = require('selenium-webdriver');
const oracledb = require('oracledb');
const dbconfig = require('./dbconfig');

const Oracle = {
    options : {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
    },
    initConn: () => {
        oracledb.initOracleClient({libDir: 'C:/Java/instantclient_21_9'});
    },
    makeConn: async () => {
        return await oracledb.getConnection(dbconfig);
    },
    clossConn: async (conn) => {
        if (conn) {
            try {
                await conn.close();
                console.log('오라클 db 접속 해제 성공')
            } catch (err) {
                console.log(err)
            }
        }
    }
}
Oracle.initConn()
const sleep = (ms) => new Promise(resolve => setTimeout(resolve,ms));

let thumbnail = [] // 이미지 주소를 가져와야 한다.
let youtubeLink = []
let title = []
let addr = []
let phone1 = []
let phone2 = []
let id = []

async function main () {

    const URL = 'https://www.templestay.com/temple_search.aspx';


    const chrome = await new Builder().forBrowser(Browser.CHROME).setChromeOptions().build();

    try {
        await chrome.get(URL);

       for(let j=1; j<=8; j++){
            let i = 1;
                while (true) {
                    await chrome.wait(until.elementLocated(By.css('.listing-image')),3000)
                    const html = await chrome.getPageSource();
                    const dom = cheerio.load(html);

                    let thumbnails = dom(`#et-listings > ul > li:nth-child(${i}) > div.listing-image > img`)
                        .attr('src');
                  thumbnail.push(thumbnails)

                    let youtubes = dom(`#et-listings > ul > li:nth-child(${i}) > div.listing-text > h4 > a`)
                        .attr('href');
                    if (youtubes === undefined)
                        youtubes = null;
                    youtubeLink.push(youtubes)

                    let titles = dom(`#et-listings > ul > li:nth-child(${i}) > div.listing-text > h4`)
                        .text().trim();
                    titles = titles.substring(1, titles.indexOf(']')).trim();
                    title.push(titles);

                    let addrs = dom(`#et-listings > ul > li:nth-child(${i}) > div.listing-text > ul > li:nth-child(1)`)
                        .text()
                    addrs = addrs.substring(addrs.indexOf(',') + 1,).trim();
                    addr.push(addrs)

                    let phones = dom(`#et-listings > ul > li:nth-child(${i}) > div.listing-text > ul > li:nth-child(2)`)
                        .text();
                    phones = phones.split(", ",2)
                    phone1.push(phones[0]);
                    phone2.push(phones[1]);

                    let ids = dom(`#et-listings > ul > li:nth-child(${i}) > a:nth-child(3)`).attr('href')
                    //console.log(ids);
                    ids = ids.substring(ids.indexOf('=') + 1,);
                    id.push(ids);

                    i++
                    //ckTitle의 값이 빈값이라면 반복문 종료
                    let ckTitle = dom(`#et-listings > ul > li:nth-child(${i}) > div.listing-text > h4`).text().trim();
                    if (ckTitle === '') break;
                }
            let nextpagebtn = await chrome.findElement(By.css('.nextpostslink'));
            await chrome.actions().move({origin: nextpagebtn}).click().perform();
            await sleep(1000);
        }
    } catch(e) {
        console.log(e);
    } finally {
        await chrome.quit();
    }

}

async function run() {
    await main();

    for(let i = 0; i < title.length; i++) {
        let params = []
        params.push(title[i], id[i], thumbnail[i])
        await insert(params)
    }
}
run();


async function insert (params) {
    let conn;
    insetSql = 'insert into temple1(T_NAME, T_LINK,T_thumbnail) VALUES(:1,:2,:3)'
    try{
        conn = await Oracle.makeConn();

        await conn.execute(insetSql,params)
        await conn.commit()

    } catch(e){
        console.log(e);

    } finally{
        await Oracle.clossConn(conn);
    }


}
