// programpic 테이블에 데이터를 입력하는 스크립트이다.
// 프로그램명, 사진 링크 주소.
// 이전 작업에서 사진 링크가 중복되는 문제가 있었다.
// 이전에는 dbms 내에서 중복된 사진 링크를 제거하는 방법을 사용하였다.
// 이전 방법을 사용해도 되지만, 노드 환경 안에서 전처리를 통해 중복을 제거할 수도 있을 것이다.

// 주의점
// c2테이블은 이후 PROGRAM 테이블로 이름이 변경되었다.

// 절차
// 1. 테이블 생성 *
// 2. 오라클 연결 => 프로그램명과 링크를 가져온다. => 오라클 연결을 종료 => JSON형식으로 데이터를 반환한다. *
// 3. 데이터를 받아서 링크 주소로 이루어진 배열을 생성한다. *724개의 링크가 생성된 것을 확인하였다.
// 3.1 생성된 배열의 내용을 바탕으로 크롤링을 진행한다. * 반복문 종료 조건에서 조금 애먹었다. undefiened로 반환되는 것을 확인했다.
// 4. 반환해야 하는 데이터는 JSON 형식이며, 객체는 {프로그램 이름,링크} 순으로 작성되어야 한다.
//  * [{
//        programName: '[갑사] 주중 완전 자율, 휴식형',
//       programPic: 'http://noms.templestay.com/images//RsImage/L_15078.png?timestamp=0'
//    }]
//  확인하였다.
// 5. 반환된 객체를 인수로 삼은 뒤, 오라클 연결 => 파라미터 변환 =? 데이터 입력 => 오라클 연결 종료. *
// 6. 깨달은 점과, 문제점, 개선할 방향을 정리한 뒤 마친다.

// 테이블 생성 SQL
// CREATE TABLE PROGRAMPIC (
// 	P_NAME VARCHAR2(255),
// 	P_PICLINK VARCHAR2(255)
// )

// 중복 데이터를 제거해야 한다.

const {Builder, By, Key, until} = require('selenium-webdriver');
const cheerio = require('cheerio');
const oracledb = require('oracledb');
const dbconfig = require('./dbconfigDBeaver.js');

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
const sleep = (ms) => new Promise(resolve => setTimeout(resolve,ms));

Oracle.initConn()

async function C2Data () {
    let conn;
    let c2Data;
    const selectSql = 'SELECT P_NAME, P_LINK FROM C2 order by t_name';
    try{
        conn = await Oracle.makeConn();
        let data = await conn.execute(selectSql,[],Oracle.options);
        let rs = await data.resultSet;
        while(row = await rs.getRows()) {
            if(row[0] == null) break;
            c2Data = row
        }

    }catch(e){
        console.log(e)
    }finally {
        await Oracle.clossConn(conn)
    }
    return c2Data;
}

async function getTempleUrlList(c2Data) {
    let programUrlList = [];
    for(let i = 0; i < c2Data.length; i++) {
        let url =  c2Data[i].P_LINK;
        programUrlList.push(url)
    }
    return programUrlList;
}

async function getProPicLinkData(programUrlList) {
    let driver = await new Builder().forBrowser('chrome').build();
    let programPicList = []
    let i;
    try {
        for (i = 0; i < programUrlList.length; i++) { // 테스트를 위해 반복은 2번만 실행한다. * programUrlList.length
            await driver.get(programUrlList[i]);
            let html = await driver.getPageSource();
            let $ = await cheerio.load(html);
            await sleep(4000) // 이미지가 로드 될때까지 4초를 기다린다.

            // 경로 선언부
            const programNamePath = "#main-area > div.page-name > h1";
            // li:nth-child(1) > img" 에서 '(1)'의 번호를 바꾸면서 크롤링 해야 한다. 즉 반복문을 사용해야 한다.


            // 전처리 부.
            let programName = $(programNamePath).text().trim();

            let j=1;
            let programPicData = {};
            while(true){
                const programPicPath = `#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-left > div > div > div.bx-viewport > ul > li:nth-child(${j}) > img`
                let programPicLink = $(programPicPath).attr('src')
                if(programPicLink === undefined) break;
                programPicData = {}
                programPicData.programName = programName;
                programPicData.programPicLink = programPicLink;

                programPicList.push(programPicData)
                j++
            }
        }
    } catch (e) {
        console.error(`Error retrieving data from ${programUrlList[i]}, ${e}`);
    } finally {
        await driver.quit();
    }
    return  programPicList;
}

async function insertProPic (programPicList) {
    let conn;
    const insertProPicSql = `insert into PROGRAMPIC (P_NAME , P_PICLINK) values (:1, :2)`;

    try{
        conn = await Oracle.makeConn();

        for(let obj of programPicList) {
            let params = [obj.programName, obj.programPicLink]
            await conn.execute(insertProPicSql,params);
        }
        await conn.commit();
    }catch(e){
        console.log(e)
    }finally {
        await Oracle.clossConn(conn)
    }

}


C2Data().then(getTempleUrlList).then(getProPicLinkData).then(insertProPic)
