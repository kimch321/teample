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



// 0. 데이터를 저장할 테이블을 설계하고 제작한다. **
// 1. 디비에서 클래스 정보를 배열로 받는다. **
// 2. 배열을 돌아가면서 데이터를 크롤링한다.
// 3. 데이터를 각 테이블에 저장한다.

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
        const LINKS = [];
        const CNAMES = [];
        const DETAILS = [];
        const SIDOS = [];
        const GUGUNS = [];
        const ADDRS = [];
        const MATERIALS = [];
        const HASHS = [];
        const DURATIONS = [];
        const STRDATES = [];
        const ENDDATES = [];
        const MANS = [];
        const INTROS = [];
        const RULES = [];
        const NOTICES = [];
        const PRODUCTS = [];
        const TYPES = [];
        const TUTERNAMES = [];
        const TUTERIMGS = [];

        // 데이터 크롤링 시작.
        for(let i = 0; i < URLList.length; i++) {

            console.log(`${i + 1} / ${URLList.length} 클래스`)
            const URL = URLList[i];

            await driver.get(URL);
            await sleep(1000);
            const html = await driver.getPageSource();
            let $ = await cheerio.load(html);

            // 기본키 역할을 하는 링크.
            const LINK = res[i].LINK;

            // 클래스 이름.
            const preCNAME = $(`#um_contents > div.landing-content > div.voucher-contents > div.voucher-main-img-area-1 > div:nth-child(1) > div > span`);
            let CNAME = ""
            if(preCNAME != undefined) CNAME = preCNAME.text().trim();

            // 디테일, 시도, 구군
            const preInfo = $(`#um_contents > div.landing-content > div.voucher-contents > div.voucher-main-img-area-1 > div:nth-child(1) > div > div > span:nth-child(2)`);
            let info = ""
            if(preInfo != undefined) info = preInfo.text().trim();

            const DETAIL = info.split("(")[0];

            const SIDO = info.split("(")[1].replace(")","").split("/")[1];
            const GUGUN = info.split("(")[1].replace(")","").split("/")[0];

            // 주소
            const preADDR = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(14) > div:nth-child(2) > span`);
            let ADDR = "";
            if(preADDR != undefined) ADDR = preADDR.text().trim();
            if(ADDR === "") {
                const preADDR = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(17) > div:nth-child(2) > span`);
                if(preADDR != undefined) ADDR = preADDR.text().trim();
            }
            if(ADDR === "") {
                const preADDR = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(16) > div:nth-child(2) > span`);
                if(preADDR != undefined) ADDR = preADDR.text().trim();
            }
            if(ADDR === "") {
                const preADDR = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(15) > div:nth-child(2) > span`);
                if(preADDR != undefined) ADDR = preADDR.text().trim();
            }
            if(ADDR === "") {
                const preADDR = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(13) > div:nth-child(2) > span`);
                if(preADDR != undefined) ADDR = preADDR.text().trim();
            }
            if(ADDR === "") {
                const preADDR = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(12) > div:nth-child(2) > span`);
                if(preADDR != undefined) ADDR = preADDR.text().trim();
            }
            if(ADDR === "") {
                const preADDR = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(6) > div:nth-child(2) > span`);
                if(preADDR != undefined) ADDR = preADDR.text().trim();
            }

            // 준비물
            const preMATERIAL = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(5) > span`);
            let MATERIAL = "";
            if(preMATERIAL != undefined) MATERIAL = preMATERIAL.text().trim();

            // 해쉬코드
            const hashParent = $(`#um_contents > div.landing-content > div.voucher-contents > div.voucher-main-img-area-1 > div.hash-tag-area > div`);
            const hashChild = [];
            hashParent.children().each((index, el) => {
                const hash = $(el).text().trim();
                hashChild.push(hash);
            });
            const HASH = hashChild.join(',');

            // 소요시간
            const preDURATION = $(`#um_contents > div.landing-content > div.voucher-contents > div.voucher-main-img-area-1 > div.voucher-semi-info-area > div:nth-child(1) > span:nth-child(2)`);
            let DURATION = ""
            if(preDURATION != undefined) DURATION = preDURATION.text().trim();


            // 시작 및 종료날짜
            const dateParent = $(`#um_contents > div.landing-content > div.voucher-contents > div.voucher-main-img-area-1 > div.swiper-container.schedule-date-swiper.swiper-container-initialized.swiper-container-horizontal > div`);
            let STRDATE = "";
            let ENDDATE = "";
            if(dateParent != undefined) {
                const dateChild = [];
                dateParent.children().each((index, el) => {
                    const date = $(el).attr(`value`);
                    dateChild.push(date);
                });

                // dateChild 가 빈 배열일 경우
                if(dateChild.length === 0) {
                    const dateParent = $(`#um_contents > div.landing-content > div.voucher-contents > div.voucher-main-img-area-1 > div:nth-child(6) > div > div`)
                    dateParent.children().each((index, el) => {
                        const date = $(el).attr("value")
                        dateChild.push(date);
                    });
                }
                STRDATE = dateChild[0];
                ENDDATE = dateChild[dateChild.length-1];
            }
            if(STRDATE === undefined) STRDATE = `2023-03-01`;
            if(ENDDATE === undefined) ENDDATE = `2023-06-27`;


            // 수강인원
            const preMAN = $(`#um_contents > div.landing-content > div.voucher-contents > div.voucher-main-img-area-1 > div.voucher-semi-info-area > div:nth-child(2) > span:nth-child(2)`);
            let MAN = "";
            if(preMAN != undefined) MAN = preMAN.text().trim();

            // 소개
            const preINTRO = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(2) > span`);
            let INTRO = "";
            if(preINTRO != undefined) INTRO = preINTRO.text();

            // 규칙
            const preRULE = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(9) > span`);
            let RULE = "";
            if(preRULE != undefined) RULE = preRULE.text().trim();

            // 공지
            const preNOTICE = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(11) > span`);
            let NOTICE = "";
            if(preNOTICE != undefined) NOTICE = preNOTICE.text().trim();

            // 제품
            const prePRODUCT = $(`#um_contents > div.landing-content > div.voucher-contents > div:nth-child(6) > div:nth-child(1) > div:nth-child(15) > span`);
            let PRODUCT = "";
            if(prePRODUCT != undefined) PRODUCT = prePRODUCT.text().trim();

            // 타입: 현재 null로 한다.
            const TYPE = "";

            // 강사 이름
            const preTUTERNAME = $(`#um_contents > div.landing-content > div.voucher-contents > div.voucher-main-img-area-1 > div.acadey-profile-area > div > div > a > span`);
            let TUTERNAME = "";
            if(preTUTERNAME != undefined) TUTERNAME = preTUTERNAME.text().trim();

            // 강사 사진
            const preTUTERIMG = $(`#um_contents > div.landing-content > div.voucher-contents > div.voucher-main-img-area-1 > div.acadey-profile-area > div > a > div`);
            let style = "";
            if(preTUTERNAME != undefined) style = preTUTERIMG.attr("style");

            const regex = /url\((.*?)\)/;
            const match = style.match(regex);
            let TUTERIMG = "";
            if (match) {
                TUTERIMG = match[1];
            }

            LINKS.push(LINK);
            CNAMES.push(CNAME);
            DETAILS.push(DETAIL);
            SIDOS.push(SIDO);
            GUGUNS.push(GUGUN);
            ADDRS.push(ADDR);
            MATERIALS.push(MATERIAL);
            HASHS.push(HASH);
            DURATIONS.push(DURATION);
            STRDATES.push(STRDATE);
            ENDDATES.push(ENDDATE);
            MANS.push(MAN);
            INTROS.push(INTRO);
            RULES.push(RULE);
            NOTICES.push(NOTICE);
            PRODUCTS.push(PRODUCT);
            TYPES.push(TYPE);
            TUTERNAMES.push(TUTERNAME);
            TUTERIMGS.push(TUTERIMG);

        }   // URLList 반복문 종료

        // 데이터 db 저장
        const inserSQL = `insert into CLASSMETA (LINK, CNAME, DETAIL, SIDO, GUGUN, ADDR, STRDATE, ENDDATE, DURATION,
                                                 HASH, MAN, INTRO, MATERIAL, RULE, NOTICE, PRODUCT, TYPE,
                                                 TUTERNAME,
                                                 TUTERIMG) value (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`
        for(let j = 0; j < LINKS.length; j++) {
            let param = [LINKS[j], CNAMES[j], DETAILS[j], SIDOS[j], GUGUNS[j], ADDRS[j], STRDATES[j], ENDDATES[j], DURATIONS[j],
                HASHS[j], MANS[j], INTROS[j], MATERIALS[j], RULES[j], NOTICES[j], PRODUCTS[j], TYPES[j],
                TUTERNAMES[j],
                TUTERIMGS[j]]

            await conn.query(inserSQL, param)
        }

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
