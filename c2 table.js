// c2테이블은 크롤링을 위한 테이블이다.
// 속성 : 사원이름, 프로그램 이름, 시작날짜, 종료날짜, 프로그램 링크

// 절차
// 1. 크롤링
// 2. 전처리 *
// 3. 오라클 db 연결
// 4. 오라클 db 인풋
// 5. 오라클 db 종료

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
Oracle.initConn()

const templeList = ['gapsa','sansa','gunbongsa','kyungguksa','gounsa','d-kumkang','gm5300', 'gwaneumsa', 'alfmr3700', 'guryongsa', 'guinsa', 'seoncenter', 'gwijeongsa', 'sejon', 'Geumdangsa', 'kumyongsa', 'geumsansa', 'geumsunsa', 'kirimsa', 'kilsangsa', 'naksansa', 'naesosa', 'naewonjungsa', 'neunggasa', 'dasolsa', 'daegwangsa2', 'biriya', 'daeseungsa', 'kathyy', 'daewonsab', 'admin', 'botongzen', 'dogapsa', 'dorisa', 'dorimsa1', 'donghwasa', 'magoksa', 'mangkyung', 'gopanhwa', 'myogaksa2008', 'mjts2008', 'mugaksa', 'muryangsa2', 'muwisa', 'munsuam5820', 'mrdaeheungsa', 'dalmaom', 'bys4199', 'baekdamsa', 'baekryunsa', 'ildams', 'baekyangsa', '100je4', 'beomeosa', 'gusdka874', 'beopjusa', 'bogyeong', 'bohyunsa', 'bongnyeongsa', 'lotus0415', 'bongeunsa', 'bonginsa', 'bongjeongsa', 'busuksa', 'bulgapsa11', 'bgs9913', 'sanasa', 'saseongam', 'samwoon', '534-7661', 'seogwangsa', 'seokbulsa', 'seonmaster', 'seonbonsa', 'sunamsa', 'seonamsa', 'sg9893', 'sinhungsa', 'seongjusa', 'songgwangsa', 'songkwangsa', 'suguksa', 'sudeoksa', 'suwonsa', 'sujinsa', 'ttbag', 'silsangsa', 'simwonsa', 'palman56', 'ssanggyesa', 'ssangbongsa', 'yeongoksa', 'lotus', 'duswndka3', 'ygs0001', 'younglangsa', 'ypsa', 'okcheonsa100', 'yongmunsanam', 'yongmunsa', 'yougmoonsa', 'yongyeounsa', 'yonghwasa', 'tsyong', 'unjusa0660', 'wonhyosa', 'woljeongsa', 'yukjijangsa', 'eunhaesa', 'jabisunsa', 'jangyuksa', 'jds5450', 'jungtosa', 'jeonghyesa', 'jogyesa', 'jhs3554488', 'jeungsimsa', 'jijang', 'jikjisa', 'jks1080', 'choneunsa', 'cheonchuksa', 'cheongpyeongsa', 'chookseosa', 'temple089', 'TemplestayCenter', 'pyochunsa','odzen',   'sabaha83',    'haeinsa',    'hd569',    'hongbubsa',    'hwagyesa',    'hwaamsa',    'hwaeomsa',    'hws3280',    'hoeamsa',
    'heungguksa',    'hgs6856433',    'anguksa',    'yakchunsa'];

async function getTempleDataList(templeList) {
    let templeUrlList = [];
    for (let i = 0; i < templeList.length; i++) {
        let url = `https://www.templestay.com/temple_info.asp?t_id=${templeList[i]}`;
        templeUrlList.push(url);
    }
    return templeUrlList;
}

async function getTempleData(templeUrlList) {

    let driver = await new Builder().forBrowser('chrome').build();
    let templeDataList = []
    try {
        for (let i = 0; i < templeUrlList.length; i++) {
            await driver.get(templeUrlList[i]);
            let html = await driver.getPageSource();
            let $ = cheerio.load(html);
            await driver.wait(until.elementLocated(By.css('.fancybox')), 3000);

            let templeNamePath = 'div#content-top-area div.container.clearfix h1.temple-title';
            let templeName = $(templeNamePath).text().trim();

            let templeData = {};
            let j =1
            while(true) {
                templeData = {};

                let programNamePath = `#et-listings > ul > li:nth-child(${j}) > div.listing-text > h3`;
                let datesPath = `#et-listings > ul > li:nth-child(${j}) > div.listing-text > p.meta-info`;
                let programLinkPath = `#et-listings > ul > li:nth-child(${j}) > a`
                let programClassPath = `#et-listings > ul > li:nth-child(${j}) > div.listing-image > div`

                // 전처리를 위한 변수 선언
                let preProName = $(programNamePath).text()
                if(preProName === '') break
                let preDates =  $(datesPath).text();
                let preProClass = $(programClassPath).text().trim();

                // 전처리 1
                let proName = preProName
                let dates = preDates.slice(preDates.indexOf(',')+1,).trim().split('~')

                // 객체 생성
                templeData.templeName = templeName
                templeData.programName = proName
                templeData.strDate = dates[0]
                templeData.endDate = dates[1]
                templeData.link = $(programLinkPath).attr('href');
                templeData.proClass = preProClass;

                // 생성된 객체를 배열에 입력
                templeDataList.push(templeData)

                j++
            }
        }
    } catch (e) {
        // console.error(`Error retrieving data from ${templeUrlList[i]}: ${e}`);
    } finally {
        await driver.quit();
    }
    return templeDataList;
}

async function insert (templeDataList) {
    let conn;
    let params;
    const insertSql = `INSERT INTO c2(T_NAME, P_NAME,P_CLASS, P_STRDATE, P_ENDDATE, P_LINK) VALUES (:1, :2,:3, TO_DATE(:4, 'YYYY-MM-DD'), TO_DATE(:5, 'YYYY-MM-DD'), :6)`;
    try{
        conn = await Oracle.makeConn();
        for(let obj of templeDataList) { // a는 배열 , obj는 객체. for of 구문은 iterable한 속성을 지닌 자료구조에서 값을 하나씩 가져오는 것.
            params = [obj.templeName, obj.programName,obj.proClass, obj.strDate, obj.endDate, obj.link]
            console.log(params)
            await conn.execute(insertSql,params);
            await conn.commit();
        }
    }catch(e){
        console.log(e)
    }finally {
        await Oracle.clossConn(conn)
    }
}



getTempleDataList(templeList).then(getTempleData).then(insert)


