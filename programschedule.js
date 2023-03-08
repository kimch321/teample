// programschedule 테이블
// 테이블의 컬럼명
// p_name,p_day,time,p_content

// 1. 프로그램의 링크를 가져온다.
// 2. 링크를 순환하며 데이터를 크롤링한다.
// 3. 데이터를 json형식으로 만든다.
// 4. 데이터를 input한다.

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
const log = (msg) => console.log(msg)

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

async function getProschedulekData(programUrlList) {
    let driver = await new Builder().forBrowser('chrome').build();
    let programscheduleDataList = []
    let i;
    try {
        for (i = 0; i < programUrlList.length; i++) { // 테스트를 위해 반복은 2번만 실행한다. * programUrlList.length
            console.log('길이?',i+1,programUrlList.length)
            console.log('현재url?',programUrlList[i])
            await driver.get(programUrlList[i]); // 검사를 위해 url 직접 입력 가능
            let html = await driver.getPageSource();
            let $ = await cheerio.load(html);

            await sleep(2000) // 이미지가 로드 될때까지 4초를 기다린다.


            // 일정은 없거나, 하나 있거나, 하나 이상 있는 것으로 추정된다.
            // p_name,p_day,time,p_content

            // 공통 요소
            let programScheduleData = {};
            const programNamePath = "#main-area > div.page-name > h1";

            // 공통요소 전처리
            let programName = $(programNamePath).text().trim();

            // 일정의 존재 여부를 어떻게 판단해야 할까?
            // date의 값이 없는 것으로 추정한다.
            // 일정이 없는 프로그램을 찾으면 검사할 수 있을 것이다.

            let datePath = `#main-area > div.page-content.clearfix > div.temple-description.clearfix > h4`;
            // eq메소드를 통해 값을 구할 수 있을 것 같다. 같이 없는 경우는 빈값으로 출력된다.
            let date = $(datePath).eq(0).text().trim();

            if(date === '') {
                programScheduleData.p_name = programName;
                programScheduleData.p_day = null;
                programScheduleData.time = null;
                programScheduleData.p_content = null;

                programscheduleDataList.push(programScheduleData);
            } else {
                // 일정이 하나 있는 경우
                // 일정이 하나 있는 경우와 하나 이상 있는 경우를 어떻게 구분할 것인가?
                // eq메소드를 통해 값을 구할 수 있을 것 같다. 같이 없는 경우는 빈값으로 출력된다. 따라서 값이 빈값이 아니라면 1일차, 2일차... 빈값이 나올때까지 반복하면 될것이다.

                let time;
                let content;
                let timePath;
                let contentPath;
                let j =0;
                let k =2;
                let l = 2;
                    while(true) {
                        datePath = `#main-area > div.page-content.clearfix > div.temple-description.clearfix > h4`;
                        date = $(datePath).eq(j).text().trim();
                        if (date === '') break;
                        l = 2;
                        timePath = `#main-area > div.page-content.clearfix > div.temple-description.clearfix > table:nth-child(${k}) > tbody > tr:nth-child(${l}) > td.work-title`
                        time = $(timePath).text().trim()
                        if(time === '') break;
                        while(true) {

                            // 이 안에선 eq()쓸 수 없다. eq()는 해당 path를 수집한 객체를 순서대로 반환한다. 현재 path로는 일차를 구분할 수 없다.

                            timePath = `#main-area > div.page-content.clearfix > div.temple-description.clearfix > table:nth-child(${k}) > tbody > tr:nth-child(${l}) > td.work-title`
                            contentPath = `#main-area > div.page-content.clearfix > div.temple-description.clearfix > table:nth-child(${k}) > tbody > tr:nth-child(${l}) > td:nth-child(2)`
                            time = $(timePath).text().trim()
                            content = $(contentPath).text().trim()

                            if(time === '') break;

                            programScheduleData = {}
                            programScheduleData.p_name = programName;
                            programScheduleData.p_day = date;
                            programScheduleData.time = time;
                            programScheduleData.p_content = content;

                            programscheduleDataList.push(programScheduleData);

                            l++
                        }
                        k = k+2;
                        j++
                }
            }

        }
    } catch (e) {
        console.error(`Error retrieving data from ${programUrlList[i]}, ${e}`);
    } finally {
        await driver.quit();
    }
    return programscheduleDataList;
}

// p_name,p_day,time,p_content
async function insertProSchedule (programscheduleDataList) {
    let conn;
    const insertProScheduleSql = `insert into programschedule (p_name , p_day, TIME,P_CONTENT) values (:1, :2, :3, :4)`;

    try{
        conn = await Oracle.makeConn();

        for(let obj of programscheduleDataList) {

            let params = [obj.p_name, obj.p_day, obj.time, obj.p_content]
            console.log(params)
            await conn.execute(insertProScheduleSql,params);
        }
        await conn.commit();
    }catch(e){
        console.log(e)
    }finally {
        await Oracle.clossConn(conn)
    }

}



C2Data().then(getTempleUrlList).then(getProschedulekData).then(insertProSchedule)



























