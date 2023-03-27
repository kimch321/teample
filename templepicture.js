const {Builder, By, Key, until} = require('selenium-webdriver');
const cheerio = require('cheerio');
const oracledb = require('oracledb');
const dbconfig = require('./dbconfigDBeaver.js');

// 테이블 이름 templepic,
// 컬럼 t_name varchar2(255),
// 컬럼 t_picture varchar2(255)

// 문제점. 각 사찰당 중복값이 2개 존재한다. 제거절차가 필요하다.
// 제거 절차는 sql문으로 하였다.
// DELETE FROM templepic
// WHERE t_picture IN (
// SELECT t_picture
//     FROM templepic
//     GROUP BY t_picture
//     HAVING COUNT(*) > 1
// );

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

async function getTempleData(url) {
    let templeData = {templeName: null};
    let driver = await new Builder().forBrowser('chrome').build();
    try {
        await driver.get(url);
        let html = await driver.getPageSource();
        let $ = cheerio.load(html);
        await driver.wait(until.elementLocated(By.css('.fancybox')), 5000);
        templeData.templeName = $('div#content-top-area div.container.clearfix h1.temple-title').text().trim();
        let imgUrls = $('html body div#content-area.fullwidth.templeinfo div.container.clearfix div#main-area.clearfix div.page-content.clearfix div#tab1.page-tabcontent div.profileslider div.slide div.bx-wrapper div.bx-viewport ul.bxslider li a').map((i, el) => $(el).attr('href')).get();
        for (let i = 0; i < imgUrls.length; i++) {
            templeData[`temple_img${i+1}`] = imgUrls[i];
        }
    } catch (e) {
        console.error(`Error retrieving data from ${url}: ${e}`);
    } finally {
        await driver.quit();
    }
    return templeData;
}

//현재 하나만 가져온다.
async function getTempleDataList(templeList) {
    let templeDataList = [];
    for (let i = 0; i < templeList.length; i++) {
        let url = `https://www.templestay.com/temple_info.asp?t_id=${templeList[i]}`;
        let templeData = await getTempleData(url);
        templeDataList.push(templeData);
    }
    return templeDataList;
}

// 오라클에 연결한 뒤,insert 하는 함수
// 오라클에 연결
// insert 작업 반복
// 1. templeDataList 배열을, [templeName, temple_img${i}]형태로 바꾼뒤
// 2. insert를 실행한다.
// 3. 1.2.를 이미지 끝날때 까지 반복한 뒤
// 4. commit하고, 연결을 종료한다.
// 오라클 종료

async function insert (templeDataList) {
    let conn;
    let params;
    const insertSql = `INSERT INTO templepic (t_name,t_picture) VALUES (:1,:2)`;
    try{
        conn = await Oracle.makeConn();
        for(let obj of templeDataList) { // a는 배열 , obj는 객체. for of 구문은 iterable한 속성을 지닌 자료구조에서 값을 하나씩 가져오는 것.
            for (let key in obj) {
                if(obj.templeName !== obj[key]) {
                    params = [obj.templeName,obj[key]]
                    await conn.execute(insertSql,params);
                    await conn.commit();
                }
            }
        }
    }catch(e){
        console.log(e)
    }finally {
        await Oracle.clossConn(conn)
    }
}

// Call function to scrape data for each temple in the list
getTempleDataList(templeList)
    .then((templeDataList) => {
        insert(templeDataList)
    })
    .catch((e) => {
        console.error(`Error retrieving temple data: ${e}`);
    });
