// 목표. temple2 테이블의 컬럼에 데이터 입력

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

let params = [];

async function selectTLink () {
        let links = []
        let selectTLinkSql = `select T_LINK from TEMPLE1`
        let conn;
        try {
            conn = await Oracle.makeConn();
            let result = await conn.execute(selectTLinkSql,params,Oracle.options)
            let rs = await result.resultSet
            let row;
            while((row = await rs.getRow())){
              links.push(row.T_LINK);
            }
        } catch (e){
            console.log(e)
        } finally {
            await Oracle.clossConn(conn)
        }
        return links;
}
// links는 배열로 안에 id값이 문자열 형태로 저장되어 있습니다.

async function insertTemple02 ( params) {
    let insertSql = `INSERT INTO temple2(t_name,addr,phone,copy) values (:1,:2,:3,:4)`
    // console.log(params);
    for(let i = 0 ; i < params.length ; i++) {
        let conn;
        try {
            conn = await Oracle.makeConn();
            await conn.execute(insertSql, [params[i].t_name, params[i].addr, params[i].phone,params[i].copy])
            await conn.commit();
        } catch (e) {
            console.log(e)
        } finally {
            await Oracle.clossConn(conn)
        }
    }
}


async function main (links) {
    let params = []
    for(let i=0; i < links.length; i++) {
        console.log(`${i}/140`);
        let URL = `https://www.templestay.com/temple_info.asp?t_id=${links[i]}`;

        const chrome = await new Builder().forBrowser(Browser.CHROME).setChromeOptions().build();

        try {
            await chrome.get(URL);
            await sleep(1000);

            const html = await chrome.getPageSource();

            const dom = cheerio.load(html);

            let t_name = dom(`#content-top-area > div > h1`).text()
            let data1 = dom(`#main-area > div > div.pagebutton.clearfix > div.left > ul > li:nth-child(1)`).text()
            let addr = data1.slice(data1.lastIndexOf(': ')+1).trim()
            let data2 = dom(`#main-area > div > div.pagebutton.clearfix > div.left > ul > li:nth-child(2)`).text()
            let phone = data2.slice(data2.lastIndexOf(': ')+1).trim()
            let data3 = dom(`#tab1 > div:nth-child(1) > h1`).text();
            let copy = data3.trim();

            let templeInfo = {t_name: t_name,addr:addr,phone:phone,copy:copy}

            params.push(templeInfo);
        } catch(e) {
            console.log(e);
        } finally {
            await chrome.quit();
        }
    }
    return params;
}

async function makeTemple02 () {

     let links = await selectTLink();

     let params = await main(links);

    await insertTemple02(params);
}

makeTemple02()