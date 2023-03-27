// 오라클 db 연결
// c2테이블에서 select문으로 프로그램 이름, 링크를 가져온다.*
// oreacle 데이터베이스의 연결을 종료한다.*
// 링크를 배열로 만든다.*
// 링크를 순회하며 페이지에 접속한다.*
// 페이지가 로드되는 것을 기다린다.*
// 페이지가 로드되면 수집할 요소의 css 경로를 정리한다.*
// 수집된 데이터를 전처리한다.*
// 수집된 데이터를 파라미터로 만든다.*

// 이하 절차는 수행되기 전에 dbms에서 확인 절차가 필요하다.
//  auto commit을 해제하고 작업한다.
// 데이터를 입력한다.
// 오라클 db 연결을 종료한다.

// 오래걸렸다. oracledb의 파라미터는 반드시 순서대로 적어야 한다.

// 문제점
// 프로그램 유형과 가격을 수집하기 곤란하다. 프로그램마다 정해진 형식이 있는지 부터 확인해야 한다.

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


async function C1Data () {
    let conn;
    let c1Data;
    const selectSql = 'SELECT P_NAME, P_LINK FROM C2 order by t_name';
    try{
        conn = await Oracle.makeConn();
        let data = await conn.execute(selectSql,[],Oracle.options);
        let rs = await data.resultSet;
        while(row = await rs.getRows()) {
            if(row[0] == null) break;
            c1Data = row
        }

    }catch(e){
        console.log(e)
    }finally {
        await Oracle.clossConn(conn)
    }
    return c1Data;
}

async function getTempleUrlList(c1Data) {
    let programUrlList = [];
    for(let i = 0; i < c1Data.length; i++) {
        let url =  c1Data[i].P_LINK;
        programUrlList.push(url)
    }
    return programUrlList;
}

//문제 83개의 사원만 수집되고 나머지는 수집되지 않는다.
async function getProgramData(programUrlList) {
    let driver = await new Builder().forBrowser('chrome').build();
    let programDataList = []
    let i;
    try {
        for (i = 0; i < programUrlList.length; i++) {
            await driver.get(programUrlList[i]);
            let html = await driver.getPageSource();
            let $ = await cheerio.load(html);
            await sleep(2000)

            // 경로 선언부
            const programNamePath = "#main-area > div.page-name > h1";
            const programIntroPath = "#main-area > div.page-content.clearfix > p:nth-child(5)"
            const programCautionPath = "#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-right > h3:nth-child(1) > span:nth-child(2)"

            let programName = $(programNamePath).text().trim();
            let programIntro = $(programIntroPath).text().trim().replaceAll('\'','\"');
            let programCaution = $(programCautionPath).text().trim();

            let programData = {};
            programData.programName = programName;
            if(programIntro) {
                programData.programIntro = programIntro;
            } else {
                programData.programIntro = null;
            }
            if(programCaution) {
                programData.programCaution = programCaution;
            } else {
                programData.programCaution = null;
            }

            programDataList.push(programData)

        }
    } catch (e) {
         console.error(`Error retrieving data from ${programUrlList[i]}, ${e}`);
    } finally {
        await driver.quit();
    }
    return programDataList;
}

// 이제 업데이트 절차를 만들어야 한다.
// where 조건은 P_NAME = programDataList.obj.programName
async function update (programDataList) {
    let conn;
    const updateP_introSql = `UPDATE C2 SET P_INTRO = :1 where P_NAME = :2`;
    const updateP_cautionSql = `UPDATE C2 SET P_CAUTION = :1 where P_NAME = :2`;
    try{
        conn = await Oracle.makeConn();

        for(let obj of programDataList) {
            let introParams = [obj.programIntro, obj.programName]
            let cautionParams = [obj.programCaution, obj.programName]
            await conn.execute(updateP_introSql,introParams);
            await conn.execute(updateP_cautionSql,cautionParams);
        }
        await conn.commit();
    }catch(e){
        console.log(e)
    }finally {
        await Oracle.clossConn(conn)
    }

}

// ?. C1Data의 리턴을 update에서 받을 수 있을까?
// 그렇다
C1Data()
    .then(getTempleUrlList).then(getProgramData).then(update)
    .catch((err) => {
        console.log(err);
    })
