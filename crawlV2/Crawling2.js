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
// TEMPLE테이블에서 아이디를 가져온다 => 아이디를 URL로 바꾼다.* => URL을 반복하면서 두번째 크롤링, 전처리 => 아이디를 조건으로 압려 => 데이터 입력, 커밋*
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
        Temple : ` CREATE TABLE TEMPLE2 (T_NAME VARCHAR(255), TID VARCHAR(255), ADDR VARCHAR(255), T_COPY VARCHAR(255), T_DES TEXT, T_PHONE VARCHAR(255) ) `,
        Templepic : ` CREATE TABLE TEMPLEPIC2 (T_NAME VARCHAR(255), TID VARCHAR(255), T_PICTURE VARCHAR(255)) `,
        ProramLink : `CREATE TABLE PROGRAMLINK2 (PID VARCHAR(255), P_NAME VARCHAR(255), P_LINK VARCHAR(255) ,T_NAME VARCHAR(255), TID VARCHAR(255)) `,
        Program : ` CREATE TABLE PROGRAM2 (PID VARCHAR(255), P_NAME VARCHAR(255), T_NAME VARCHAR(255), P_CAUTION VARCHAR(255), P_CLASS VARCHAR(255),P_STRDATE DATE, P_ENDDATE DATE, P_INTRO TEXT, P_LINK VARCHAR(255))`,
        ProgramPic : ` CREATE TABLE PROGRAMPIC2 (PID VARCHAR(255), T_NAME VARCHAR(255), P_NAME VARCHAR(255), P_PICLINK VARCHAR(255)) `,
        ProgramPrice : ` CREATE TABLE PROGRAMPRICE2 (PR_NO INT AUTO_INCREMENT PRIMARY KEY, P_NAME VARCHAR(255), PID VARCHAR(255), DIVISION VARCHAR(255),PR_CLASS VARCHAR(255), PRICE INT)`,
        PROGRAMSCHEDULE : ` CREATE TABLE PROGRAMSCHEDULE2 (PS_NO INT AUTO_INCREMENT PRIMARY KEY, P_NAME VARCHAR(255), PID VARCHAR(255), P_DAY VARCHAR(255), P_TIME VARCHAR(255),P_CONTENT TEXT) `,
        ProgramDes : ` CREATE TABLE PROGRAMDES2 (PD_NO INT AUTO_INCREMENT PRIMARY KEY, P_NAME VARCHAR(255),PID VARCHAR(255), P_DES VARCHAR(255), P_DETAIL TEXT) `
    }

    for (let key in TableSql) {
        await conn.query(TableSql[key])
    }
    return conn
}

async function crwalingOne (conn) {
    const URL = 'https://www.templestay.com/temple_search.aspx';
    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().headless().addArguments("–allow-running-insecure-content", "–disable-logging"))
        .build();

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

    return {cOneParams,conn}

}

async function insertCrawlOne (conn,cOneParams) {
    let insertTemple = ` INSERT INTO TEMPLE2 (T_NAME,TID,ADDR) VALUES (?,?,?) `

    let {T_NAMEs, ADDRs,TIDs} = cOneParams

    for(let i = 0; i < T_NAMEs.length; i++) {
        let param = [T_NAMEs[i], TIDs[i], ADDRs[i]]

        await conn.query(insertTemple,param)

    }
    return conn
}

async function makeTempleURL (conn) {
    const selectTID = `select TID from TEMPLE2`

    let res = await conn.query(selectTID);

    let preURL = `https://www.templestay.com/temple_info.asp?t_id=`

    let URLList = res.map (obj => preURL + obj.TID )

    return {conn, URLList}
}

async function crwalingTwo (conn, URLList) { //사찰페이지의 정보 수집을 의미한다.

    for (let i = 0; i < URLList.length; i++) { // URL을 반복하며 크롤링한다. 샘플로 일단 2개만
        console.log(`${i+1}번째 절입니다!`)
        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().headless().addArguments("–allow-running-insecure-content", "–disable-logging"))
            .build();

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
            let updateTemple = ` UPDATE TEMPLE2 SET T_COPY = ?, T_DES = ?, T_PHONE = ? WHERE TID = ? `
            let templeParam = [T_COPY,T_DEC,T_PHONE,TID]

            await conn.query(updateTemple,templeParam)

            // TEMPLEPIC 테이블 요소 수집
            let preT_NAME = await $(`#content-top-area > div > h1`).text()
            let T_NAME = preT_NAME.trim()
            let j = 1
            let preT_PICTUREList =[];
            while(true) {
                let preT_PICTURE = await $(`#tab1 > div.profileslider > div.slide > div > div.bx-viewport > ul > li:nth-child(${j}) > a > img`).attr(`src`)
                let T_PICTURE = preT_PICTURE
                if (T_PICTURE === undefined) break;
                if (preT_PICTURE.includes("?")) {
                    T_PICTURE = preT_PICTURE.replace(/\?.*/, "");
                } else {
                    T_PICTURE = preT_PICTURE;
                }

                preT_PICTUREList.push(T_PICTURE)
                j++
            }
            let set = new Set(preT_PICTUREList);
            preT_PICTUREList = [...set];
            let T_PICTUREList = preT_PICTUREList.map(link => link.replace('http','https'))


            // TEMPLEPIC 테이블 삽입
            let insertTEMPLEPIC = ` INSERT INTO TEMPLEPIC2 (T_NAME,TID,T_PICTURE) VALUES (?,?,?) `
            for(let k = 0; k < T_PICTUREList.length; k++) {
                let templepicParam = [T_NAME,TID,T_PICTUREList[k]]
                await conn.query(insertTEMPLEPIC,templepicParam) // TEMPLEPIC 테이블 입력 정지!
            }

            // PROGRAMLINK2,PROGRAM2 테이블 정보 수집, 입력
            const insertP_LINK = ` insert into PROGRAMLINK2 (P_NAME, P_LINK, PID, T_NAME, TID) VALUES (?,?,?,?,?) `
            const insertPROGRAM = ` INSERT INTO PROGRAM2 (P_NAME, T_NAME,P_CLASS,P_STRDATE,P_ENDDATE,PID,P_LINK) VALUES (?,?,?,?,?,?,?)`
            let l = 1;
            while(true) {
                // PROGRAMLINK2 테이블 정보 수집
                let preP_NAME = await $(`#et-listings > ul > li:nth-child(${l}) > div.listing-text > h3`).text()
                let P_NAME = preP_NAME.trim()
                let preP_LINK = await $(`#et-listings > ul > li:nth-child(${l}) > a`).attr(`href`)
                let P_LINK = preP_LINK

                if(P_LINK === undefined) break;

                const searchParams = new URLSearchParams(P_LINK.split('?')[1]);
                let PID = searchParams.get('ProgramId');
                // PROGRAMLINK2 테이블 입력 완
                let PLINKParam =[P_NAME, P_LINK, PID, T_NAME, TID]
                await conn.query(insertP_LINK,PLINKParam)

                // PROGRAM2 테이블 정보 수집.
                let P_CLASS = await $(`#et-listings > ul > li:nth-child(${l}) > div.listing-image > div`).text().trim()
                let preP_DATE = await $(`#et-listings > ul > li:nth-child(${l}) > div.listing-text > p.meta-info`).text().trim()
                let P_DATEList = preP_DATE.slice(preP_DATE.indexOf(',')+1,).trim().split('~')
                let P_STRDATE = P_DATEList[0];
                let P_ENDDATE = P_DATEList[1];

                let POGRAMPARAM = [P_NAME, T_NAME,P_CLASS,P_STRDATE,P_ENDDATE,PID,P_LINK]
                await conn.query(insertPROGRAM,POGRAMPARAM)

                l++
            }

        } catch (e) {
            console.log(e)
        } finally {
            await driver.quit();
        }
    }

    console.log(`반복문 종료!`)
    return conn;

}

async function makeProgramURL (conn) {
    const selectP_LINK = `select P_LINK from PROGRAM2`

    let res = await conn.query(selectP_LINK);

    let ProgramURL = res.map (obj => obj.P_LINK )

    return {conn, ProgramURL}
}

async function crwalingThree(conn, ProgramURL) {
    for (let i = 0; i < ProgramURL.length; i++) { // 시험을 위해 1번 반복
        console.log(`${i+1}번째 프로그램입니다!`)

        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().headless().addArguments("–allow-running-insecure-content", "–disable-logging"))
            .build();


        try{
            const url = ProgramURL[i];

            const searchParams = new URLSearchParams(url.split('?')[1]);

            await driver.get(url);

            await sleep(3000) // 페이지 로드 후 3초 기다림

            const html = await driver.getPageSource();
            let $ = await cheerio.load(html);

            let PID = searchParams.get('ProgramId');

            // 수집 시작
            // PROGRAM2 테이블 업데이트. 데이터 수집
            let preP_CAUTION = await $(`#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-right > h3:nth-child(1) > span:nth-child(2)`).text()
            let P_CAUTION = preP_CAUTION.trim()

            if(P_CAUTION === undefined) P_CAUTION = null;

            let preP_INTRO = await $(`#main-area > div.page-content.clearfix > p:nth-child(5)`).text();
            let P_INTRO = preP_INTRO.trim()

            // PROGRAM2 테이블 수정
            let updateProgram = ` UPDATE PROGRAM2 SET P_CAUTION = ?, P_INTRO = ? WHERE PID = ? `
            let programUpdateParam = [ P_CAUTION, P_INTRO, PID]

            await conn.query(updateProgram,programUpdateParam);

            // PROGRAMPIC2 데이터 수집
            let preNAME = await $(`#main-area > div.page-name > h1`)
                .text().trim();
            let T_NAME = preNAME.substring(1, preNAME.indexOf(']')).trim();
            let P_NAME = preNAME

            let n = 1;
            let preP_PICTUREList =[];
            while(true) {
                let preP_PICTURE = await $(`#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-left > div > div > div.bx-viewport > ul > li:nth-child(${n}) > img`).attr(`src`)
                if (preP_PICTURE === undefined) {break;}
                let P_PICTURE;
                if (preP_PICTURE.includes("?")) {
                    P_PICTURE = preP_PICTURE.replace(/\?.*/, "");
                } else {
                    P_PICTURE = preP_PICTURE;
                }

                preP_PICTUREList.push(P_PICTURE)
                n++
            }
            let set = new Set(preP_PICTUREList);
            preP_PICTUREList = [...set];
            let P_PICTUREList = preP_PICTUREList.map(link => link.replace('http','https'))

            // PROGRAMPIC2 테이블 삽입
            let insertPROGRAMPIC = ` INSERT INTO PROGRAMPIC2 (PID, T_NAME, P_NAME, P_PICLINK) VALUES (?,?,?,?) `
            for(let o = 0; o < P_PICTUREList.length; o++) {
                let programPicParam = [PID,T_NAME,P_NAME,P_PICTUREList[o]]

                await conn.query(insertPROGRAMPIC,programPicParam) // 일단 정지한다.
            }

            // PROGRAMPRICE2 테이블 정보 수집
            let preDIVISION = await $("#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-right > div.templeslides-price.mobileonly.clearfix > table > tbody > tr:nth-child(2) > td.work-title").text();
            let DIVISION = preDIVISION.trim();

            const insertP_Price = ` INSERT INTO PROGRAMPRICE2 (P_NAME, PID, DIVISION, PR_CLASS, PRICE) VALUES (?,?,?,?,?)`

            let m = 2;
            while (true){
                let PR_CLASS = $(`#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-right > div.templeslides-price.mobileonly.clearfix > table > tbody > tr:nth-child(1) > th:nth-child(${m})`).text().trim();
                let PRICE = $(`#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-right > div.templeslides-price.mobileonly.clearfix > table > tbody > tr:nth-child(2) > td:nth-child(${m})`).text().trim().replaceAll('\,','').replace('원','')
                if(PR_CLASS === '') break;

                // PRICE2 테이블 입력
                let PRICEPARAM = [P_NAME, PID, DIVISION, PR_CLASS, PRICE]
                await conn.query(insertP_Price,PRICEPARAM)
                m++
            }

            // PROGRAMSCHEDULE2 스케쥴 정보 수집
            // eq메소드를 통해 값을 구할 수 있을 것 같다. 같이 없는 경우는 빈값으로 출력된다.
            let date = await $(`#main-area > div.page-content.clearfix > div.temple-description.clearfix > h4`).eq(0).text().trim();

            let insertSql = ` INSERT INTO PROGRAMSCHEDULE2 (P_NAME,PID,P_DAY,P_TIME,P_CONTENT) VALUES (?,?,?,?,?)`

            let P_DAY;
            let P_TIME;
            let P_CONTENT;

            if(date === '') {
                P_DAY = null
                P_TIME = null
                P_CONTENT = null

                let param = [P_NAME,PID,P_DAY,P_TIME,P_CONTENT]
                await conn.query(insertSql,param)

            } else {
                // 일정이 하나 있는 경우
                // 일정이 하나 있는 경우와 하나 이상 있는 경우를 어떻게 구분할 것인가?
                // eq메소드를 통해 값을 구할 수 있을 것 같다. 같이 없는 경우는 빈값으로 출력된다. 따라서 값이 빈값이 아니라면 1일차, 2일차... 빈값이 나올때까지 반복하면 될것이다.

                let p = 0;
                let q = 2;
                let r = 2;
                while (true) {
                    P_DAY = $(`#main-area > div.page-content.clearfix > div.temple-description.clearfix > h4`).eq(p).text().trim();
                    if (P_DAY === '') break;
                    r = 2;
                    P_TIME = await $(`#main-area > div.page-content.clearfix > div.temple-description.clearfix > table:nth-child(${q}) > tbody > tr:nth-child(${r}) > td.work-title`).text().trim()
                    if (P_TIME === '') break;
                    while (true) {

                        // 이 안에선 eq()쓸 수 없다. eq()는 해당 path를 수집한 객체를 순서대로 반환한다. 현재 path로는 일차를 구분할 수 없다.

                        P_TIME = await $(`#main-area > div.page-content.clearfix > div.temple-description.clearfix > table:nth-child(${q}) > tbody > tr:nth-child(${r}) > td.work-title`).text().trim()
                        P_CONTENT = await $(`#main-area > div.page-content.clearfix > div.temple-description.clearfix > table:nth-child(${q}) > tbody > tr:nth-child(${r}) > td:nth-child(2)`).text().trim()

                        if (P_TIME === '') break;

                        let param = [P_NAME,PID,P_DAY,P_TIME,P_CONTENT]
                        await conn.query(insertSql,param)
                        r++
                    }
                    q = q + 2;
                    p++
                }
            }
            // 1 4 7 / 2 5 8
            // PROGRAMDES2 테이블 정보 수집 및 삽입.
            const insertDES2 = ` INSERT INTO PROGRAMDES2 (P_NAME,PID,P_DES,P_DETAIL) VALUES (?,?,?,?)`
            let t = 1
            while(true) {
                let P_DES = await $(`#main-area > div.page-content.clearfix > div.temple-description.clearfix > div > strong:nth-child(${t})`).text().trim()
                let P_DETAIL = await $(`#main-area > div.page-content.clearfix > div.temple-description.clearfix > div > p:nth-child(${t+1})`).text().trim()

                if(!P_DES) break;

                let param = [P_NAME,PID,P_DES,P_DETAIL]
                await conn.query(insertDES2,param)
                t = t+3
            }


        } catch (e) {
            console.log(e)
        } finally {
            await driver.quit();

        }


    }
    await CMariadb.closeConn(conn)
    return conn;

}

createConn()
    .then(conn => createTable(conn))
    .then((conn)=>crwalingOne(conn)).then(({conn, cOneParams}) =>insertCrawlOne(conn, cOneParams))
    .then(conn => makeTempleURL(conn)).then(({conn, URLList}) => crwalingTwo(conn, URLList))
    .then(conn => makeProgramURL(conn)).then(({conn, ProgramURL}) => crwalingThree(conn, ProgramURL))
    .catch(e => console.log(e))


