// programprice 테이블에 데이터를 입력하는 스크립트이다.
// programprice는 프로그램의 가격정보를 취합하는 테이블이다.

// 절차
// 1. 테이블 생성 *
// 2. 오라클 연결 => 프로그램명과 링크를 가져온다. => 오라클 연결을 종료 => JSON형식으로 데이터를 반환한다. *
// 3. 데이터를 받아서 링크 주소로 이루어진 배열을 생성한다. *724개의 링크가 생성된 것을 확인하였다.
// 3.1 생성된 배열의 내용을 바탕으로 크롤링을 진행한다. * 반복문 종료 조건에서 조금 애먹었다. undefiened로 반환되는 것을 확인했다.
// 4. 반환해야 하는 데이터는 JSON 형식이며, 객체는 {프로그램 이름,링크} 순으로 작성되어야 한다.
// 5. 반환된 객체를 인수로 삼은 뒤, 오라클 연결 => 파라미터 변환 =? 데이터 입력 => 오라클 연결 종료. *
// 6. 깨달은 점과, 문제점, 개선할 방향을 정리한 뒤 마친다.

// 주의. 가격은 전처리를 통해 숫자로 만들어야 한다.

// 테이블 생성 sql
// CREATE TABLE programprice (
// 	p_name varchar2(255),
// 	division varchar2(255),
// 	priceclass varchar2(255),
// 	price number
// )

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
    let programPriceDataList = []
    let i;
    try {
        for (i = 0; i < programUrlList.length; i++) { // 테스트를 위해 반복은 2번만 실행한다. * programUrlList.length
            await driver.get(programUrlList[i]);
            let html = await driver.getPageSource();
            let $ = await cheerio.load(html);
            await sleep(1000) // 이미지가 로드 될때까지 4초를 기다린다.


            // 경로 선언부
            const programNamePath = "#main-area > div.page-name > h1";
            const divisionPath = "#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-right > div.templeslides-price.mobileonly.clearfix > table > tbody > tr:nth-child(2) > td.work-title";


            // 전처리 부.
            let programName = $(programNamePath).text().trim();
            let division = $(divisionPath).text().trim();

            let j=2;
            let programPriceData = {};
            while (true){
                // 반복! th:nth-child(2) 2부터 끝까지.
                const priceclassPath = `#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-right > div.templeslides-price.mobileonly.clearfix > table > tbody > tr:nth-child(1) > th:nth-child(${j})`;
                // 반복 ! td:nth-child(2) 2부터 끝까지.
                const pricePath = `#main-area > div.page-content.clearfix > div.templeslides.clearfix > div.templeslides-right > div.templeslides-price.mobileonly.clearfix > table > tbody > tr:nth-child(2) > td:nth-child(${j})`;

                let priceClass = $(priceclassPath).text().trim();
                let price = $(pricePath).text().trim().replace('\,','').replace('원','')
                if(priceClass === '') break;
                programPriceData = {};
                programPriceData.p_name = programName
                programPriceData.division = division
                programPriceData.priceclass = priceClass
                programPriceData.price = Number(price)

                programPriceDataList.push(programPriceData)

                j++
            }
        }
    } catch (e) {
        console.error(`Error retrieving data from ${programUrlList[i]}, ${e}`);
    } finally {
        await driver.quit();
    }
    return  programPriceDataList;
}

async function insertProPrice (programPriceDataList) {
    let conn;
    const insertProPriceSql = `insert into programprice (p_name , division,priceclass,price) values (:1, :2, :3, :4)`;

    try{
        conn = await Oracle.makeConn();

        for(let obj of programPriceDataList) {
            if(isNaN(obj.price)) {
                console.log(obj.p_name)
                obj.price = 0;
            }
            let params = [obj.p_name, obj.division, obj.priceclass, obj.price]
            await conn.execute(insertProPriceSql,params);
        }
        await conn.commit();
    }catch(e){
        console.log(e)
    }finally {
        await Oracle.clossConn(conn)
    }

}


C2Data().then(getTempleUrlList).then(getProPicLinkData).then(insertProPrice)
