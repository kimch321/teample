const CMariadb = require('./CMariaDB');
const {Builder, Browser, until, By} = require("selenium-webdriver");
let chrome = require("selenium-webdriver/chrome");
const cheerio = require("cheerio");

// 연결, SQL 실행, 종료
// 세부분으로 나누어져 있다.
// 절차
// 연결
// => 모든 테이블 생성
// => 첫번째 크롤링, 전처리 * => 데이터 입력, 커밋*
// TEMPLE테이블에서 아이디를 가져온다 => 아이디를 URL로 바꾼다.* => URL을 반복하면서 두번째 크롤링, 전처리 => 아이디를 조건으로 압려 => 데이터 입력, 커밋
// => 세번째 크롤링, 전처리 => 데이터 입력, 커밋
// => 연결 해제

// 시간 지연에 사용하는 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve,ms));

async function createConn() {
    let conn = await CMariadb.makeConn();
    console.log('마리아db연결 성공')

    return conn
}

async function closeConn(conn) {
    await CMariadb.closeConn(conn)
    console.log('마리아db연결 해제 성공!')
}

async function createTable(conn) {

    const TableSql = {
        Temple : ` CREATE TABLE TEMPLE (T_NAME VARCHAR(255), TID VARCHAR(255), ADDR VARCHAR(255), T_COPY VARCHAR(255), T_DES TEXT, T_PHONE VARCHAR(255) ) `,
        Templepic : ` CREATE TABLE TEMPLEPIC (T_NAME VARCHAR(255), TID VARCHAR(255), T_PICTURE VARCHAR(255)) `,
        ProramLink : `CREATE TABLE PROGRAMLINK (PID VARCHAR(255), P_NAME VARCHAR(255), P_LINK VARCHAR(255) ,T_NAME VARCHAR(255), TID VARCHAR(255)) `,
        Program : ` CREATE TABLE PROGRAM (PID VARCHAR(255), P_NAME VARCHAR(255), T_NAME VARCHAR(255), P_CAUTION VARCHAR(255), P_CLASS VARCHAR(255),P_STRDATE DATE, P_ENDDATE DATE, P_INTRO TEXT)`,
        ProgramPic : ` CREATE TABLE PROGRAMPIC (PID VARCHAR(255), T_NAME VARCHAR(255), P_NAME VARCHAR(255), P_PICLINK VARCHAR(255)) `,
        ProgramPrice : ` CREATE TABLE PROGRAMPRICE (PR_NO INT AUTO_INCREMENT PRIMARY KEY, P_NAME VARCHAR(255), PID VARCHAR(255), DIVISION VARCHAR(255),PR_CLASS VARCHAR(255), PRICE INT)`,
        ProgramSchedule : ` CREATE TABLE PROGRAMSCHEDULE (PS_NO INT AUTO_INCREMENT PRIMARY KEY, P_NAME VARCHAR(255), PID VARCHAR(255), P_DAY VARCHAR(255), P_TIME VARCHAR(255),P_CONTENT TEXT) `,
        ProgramDes : ` CREATE TABLE PROGRAMDES (PD_NO INT AUTO_INCREMENT PRIMARY KEY, P_NAME VARCHAR(255),PID VARCHAR(255), P_DES VARCHAR(255), P_DETAIL TEXT) `
    }

    for (let key in TableSql) {
        await conn.query(TableSql[key])
    }
    return conn
}

async function crwalingOne (conn) {
    const URL = 'https://www.templestay.com/temple_search.aspx';

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options().headless()).build();

    let T_NAMEs = [];
    let ADDRs = [];
    let TIDs = [];

    try {
        await driver.get(URL);
        await sleep(1000)
        for(let j=1; j<=8; j++){
            console.log(`${j}페이지!`)
            let i = 1;
            while (true) {
                console.log(`${j*i}번째 절!`)

                const html = await driver.getPageSource();
                let $ = await cheerio.load(html);

                let preT_NAME = await $(`#et-listings > ul > li:nth-child(${i}) > div.listing-text > h4`)
                    .text().trim();
                let T_NAME = preT_NAME.substring(1, preT_NAME.indexOf(']')).trim();
                T_NAMEs.push(T_NAME);

                let preADDR = await $(`#et-listings > ul > li:nth-child(${i}) > div.listing-text > ul > li:nth-child(1)`)
                    .text()
                let ADDR = preADDR.substring(preADDR.indexOf(',') + 1,).trim();
                ADDRs.push(ADDR)


                let preTID = await $(`#et-listings > ul > li:nth-child(${i}) > a:nth-child(3)`).attr('href')
                let TID = preTID.substring(preTID.indexOf('=') + 1,);
                TIDs.push(TID);

                i++
                //ckTitle의 값이 빈값이라면 반복문 종료
                let ckTitle = await $(`#et-listings > ul > li:nth-child(${i}) > div.listing-text > h4`).text().trim();
                if (ckTitle === '') break;
            }
            let nextpagebtn = await driver.findElement(By.css('.nextpostslink'));
            await driver.actions().move({origin: nextpagebtn}).click().perform();
            await sleep(1000);
        }
    } catch(e) {
        console.log(e);
    } finally {
        await driver.quit();
    }

    let cOneParams = {T_NAMEs, ADDRs,TIDs}

    console.log(T_NAMEs,T_NAMEs.length,ADDRs,ADDRs.length,TIDs,TIDs.length)

    return {cOneParams,conn}

}

async function insertCrawlOne (conn,cOneParams) {
    let insertTemple = ` INSERT INTO TEMPLE (T_NAME,TID,ADDR) VALUES (?,?,?) `

    let {T_NAMEs, ADDRs,TIDs} = cOneParams

    for(let i = 0; i < T_NAMEs.length; i++) {
        let param = [T_NAMEs[i], TIDs[i], ADDRs[i]]

        await conn.query(insertTemple,param)

    }
    return conn
}

async function makeTempleURL (conn) {
    const selectTID = `select TID from TEMPLE`

    let res = await conn.query(selectTID);


    let preURL = `https://www.templestay.com/temple_info.asp?t_id=`

    let URLList = res.map (obj => preURL + obj.TID )

    return {conn, URLList}
}

async function crwalingTwo (conn, URLList) { //사찰페이지의 정보 수집을 의미한다.

    for (let i = 0; i < 2; i++) { // URL을 반복하며 크롤링한다. 샘플로 일단 2개만
        console.log(`${i+1}번째 절입니다!`)
        const driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options().headless()).build();
        try{

            const url = URLList[i];
            const searchParams = new URLSearchParams(url.split('?')[1]);
            let TID = searchParams.get('t_id');

            await driver.get(URLList[i]);
            await sleep(3000) // 페이지 로드 후 3초 기다림

            const html = await driver.getPageSource();
            let $ = await cheerio.load(html);

            // 지금부터 수집 시작.

            // 1. TEMPLE 테이블 UPDATE 정보
            let preT_COPY = await $(`#tab1 > div:nth-child(1) > h1`).text();
            let T_COPY = preT_COPY.trim();

            let preT_PHONE = await $(`#main-area > div > div.pagebutton.clearfix > div.left > ul > li:nth-child(2)`).text()
            let T_PHONE = preT_PHONE.slice(preT_PHONE.lastIndexOf(': ')+1).trim()

            let preT_DEC = await $(`#tab1 > p`).text()
            let T_DEC = preT_DEC.trim()

            // TEMPLE테이블 업데이트 *
            let updateTemple = ` UPDATE TEMPLE SET T_COPY = ?, T_DES = ?, T_PHONE = ? WHERE TID = ? `
            let templeParam = [T_COPY,T_DEC,T_PHONE,TID]

            await conn.query(updateTemple,templeParam)

            // TEMPLEPIC 테이블 요소 수집
            let preT_NAME = await $(`#content-top-area > div > h1`).text()
            let T_NAME = preT_NAME.trim()

            let j = 1
            let preT_PICTUREList =[];
            while(true) {
                let preT_PICTURE = await $(`#bx-pager > a:nth-child(${j}) > img`).attr(`src`)
                let T_PICTURE = preT_PICTURE
                if (T_PICTURE === undefined) break;
                preT_PICTUREList.push(T_PICTURE)
                j++
            }
            let set = new Set(preT_PICTUREList);
            preT_PICTUREList = [...set];
            let T_PICTUREList = preT_PICTUREList.map(link => link.replace('http','https'))


            // TEMPLEPIC 테이블 삽입
            let insertTEMPLEPIC = ` INSERT INTO TEMPLEPIC (T_NAME,TID,T_PICTURE) VALUES (?,?,?) `
            for(let k = 0; k < T_PICTUREList.length; k++) {
                let templepicParam = [T_NAME,TID,T_PICTUREList[k]]
                //await conn.query(insertTEMPLEPIC,templepicParam) // TEMPLEPIC 테이블 입력 정지!
            }

            // PROGRAMLINK 테이블 정보 수집, 입력
            const insertP_LINK = ` insert into PROGRAMLINK (P_NAME, P_LINK, PID, T_NAME, TID) VALUES (?,?,?,?,?) `
            let l = 1;
            while(true) {
                // PROGRAMLINK 테이블 정보 수집
                let preP_NAME = await $(`#et-listings > ul > li:nth-child(${l}) > div.listing-text > h3`).text()
                let P_NAME = preP_NAME.trim()
                let preP_LINK = await $(`#et-listings > ul > li:nth-child(${l}) > a`).attr(`href`)
                let P_LINK = preP_LINK

                if(P_LINK === undefined) break;

                const searchParams = new URLSearchParams(P_LINK.split('?')[1]);
                let PID = searchParams.get('ProgramId');

                // 입력
                let PLINKParam =[P_NAME, P_LINK, PID, T_NAME, TID]
                await conn.query(insertP_LINK,PLINKParam)

                l++
            }


        } catch (e) {
            console.log(e)
        } finally {
            await driver.quit();
        }
    }
    console.log(`반복문 종료!`)

}



// createConn()
//     .then(conn => createTable(conn))
//     .then(crwalingOne).then(({conn, cOneParams}) =>insertCrawlOne(conn, cOneParams))
//     .catch(e => console.log(e)).finally(conn => closeConn(conn))

createConn()
    .then(conn => makeTempleURL(conn)).then(({conn, URLList}) => crwalingTwo(conn, URLList))
;