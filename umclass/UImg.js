const Mariadb = require("./MariaDB");
const {Builder} = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const cheerio = require("cheerio");


const sleep = (ms) => new Promise(resolve => setTimeout(resolve,ms));

async function createConn() {
    let conn = await Mariadb.makeConn();
    console.log('마리아db연결 성공')

    return conn
}

async function closeConn(conn) {
    await Mariadb.closeConn(conn)
    console.log('마리아db연결 해제 성공!')
}

async function searchLINK(conn) {
    const readLINK = `SELECT LINK FROM MAIN`


    // 드라이버 선언
    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().headless().addArguments("–allow-running-insecure-content", "–disable-logging"))
        .build();

    try{
        // URL 리스트 제작.
        let res =  await conn.query(readLINK)
        const preURL = `https://www.umclass.com/classInfo/`
        let URLList = res.map(obj => preURL + obj.LINK)

        // 값을 저장할 배열 선언
        let CPARAM = [];

        // 데이터 크롤링 시작.
        for(let i = 0; i < URLList.length; i++) { //
            CPARAM = [];
            console.log(`${i + 1} / ${URLList.length} 클래스`)
            const URL = URLList[i];

            await driver.get(URL);
            await sleep(1000);
            const html = await driver.getPageSource();
            let $ = await cheerio.load(html);

            // 기본키 역할을 하는 링크.
            const LINK = res[i].LINK;

            // img 배열 생성
            const imgParent = $('.voucher-completed-img');
            const imgChild = [];
            imgParent.children().each((index, el) => {
                const style = $(el).attr("style");
                const regex = /url\((.*?)\)/;
                const match = style.match(regex);
                let img = "";
                if (match) {
                    img = match[1];
                }

                imgChild.push(img);
            });



            if(imgChild.length !== 0) {
                CPARAM = imgChild.map((img) => {
                    return {LINK, img}
                })
            } else {
                CPARAM = [{LINK, img:""}]
            }

            // 데이터 db 저장
            const inserSQL = `insert into CLASSIMG (LINK, CIMG) value (?, ?);
`
            for(let j = 0; j < CPARAM.length; j++) {
                let param = [CPARAM[j].LINK, CPARAM[j].img]

                await conn.query(inserSQL, param)
            }

        }   // URLList 반복문 종료



    } catch (e){
        console.log(e)
    } finally {
        console.log("마리아DB 연결종료")
        await closeConn(conn)
        console.log("드라이버 연결 종료")
        await driver.quit();
    }


}



createConn().then(searchLINK);