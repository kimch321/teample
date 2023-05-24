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

// 연결, SQL 실행, 종료
// 절차
// 카테고리별 페이지 수 확인*
// 연결
// 카테고리별로 크롤링 => 입력 => 커밋 => 연결 종료 => 확인 후 다음 크롤링
// 피트니스(3): https://www.umclass.com/class?page=1&category=15&classType=day
// 요리(6): https://www.umclass.com/class?page=1&category=18&classType=day
// 공예(14): https://www.umclass.com/class?page=1&category=19&classType=day
// 음악(2): https://www.umclass.com/class?page=1&category=16&classType=day
// 미술(4): https://www.umclass.com/class?page=1&category=32&classType=day
// 액티비티(2): https://www.umclass.com/class?page=1&category=11&classType=day
// 기타(2): https://www.umclass.com/class?page=1&category=0&classType=day

async function crawlingMain() {

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().headless().addArguments("–allow-running-insecure-content", "–disable-logging"))
        .build();

    let LINKS = [];
    let CNAMES = [];
    let SIDOS = [];
    let GUGUNS = [];
    let STARS = [];
    let cntrvs = [];
    let rates = [];
    let sale = [];
    let thumnails = [];
    let category = 15;

    for(let i = 1; i <= 1; i++) { //3
        console.log(`${i} / 3 페이지`)
        const URL = `https://www.umclass.com/class?page=${i}&category=15&classType=day`;

        try {
            await driver.get(URL);
            await sleep(1000);
            const html = await driver.getPageSource();
            let $ = await cheerio.load(html);

            let j = 1
            while(true) {
                let cname = await $(`#um_contents > div.landing-content > div.banner-contents > div.classPlan-contents-list-zone > div.classPlan-contents-list > div > div > div:nth-child(${j}) > a > div:nth-child(2) > span`).text();
                if(cname === "") break;

                let link = await $(`#um_contents > div.landing-content > div.banner-contents > div.classPlan-contents-list-zone > div.classPlan-contents-list > div > div > div:nth-child(${j}) > a`).attr('href').replace("/classInfo/","");
                let preSidoGugun = await $(`#um_contents > div.landing-content > div.banner-contents > div.classPlan-contents-list-zone > div.classPlan-contents-list > div:nth-child(1) > div > div:nth-child(${j}) > a > div:nth-child(2) > div.class-lis-area-mb > span.class-lis-area`).text().trim();
                let sido = preSidoGugun.split("/")[1].trim();
                let gugun = preSidoGugun.split("/")[0].trim();

                const starParent = $(`#um_contents > div.landing-content > div.banner-contents > div.classPlan-contents-list-zone > div.classPlan-contents-list > div:nth-child(1) > div > div:nth-child(${j}) > a > div:nth-child(2) > div:nth-child(3) > div`);
                const starIcons = [];
                starParent.children().each((index, el) => {
                    const className = $(el).attr('class');
                    starIcons.push(className);
                });
                // review-able-icon: star
                // review-harf-able-icon: harf-star
                // review-disable-icon: empty-star

                let star = 0;
                starIcons.forEach((starClass) => {
                    if(starClass === 'review-able-icon') star += 1;
                    else if (starClass === 'review-harf-able-icon') star += 0.5;
                })

                let cntrvs = $(`#um_contents > div.landing-content > div.banner-contents > div.classPlan-contents-list-zone > div.classPlan-contents-list > div:nth-child(1) > div > div:nth-child(${j}) > a > div:nth-child(2) > div:nth-child(3) > span`).text().replace("(","").replace(")","");
                let rate = $(`#um_contents > div.landing-content > div.banner-contents > div.classPlan-contents-list-zone > div.classPlan-contents-list > div:nth-child(1) > div > div:nth-child(${j}) > a > div:nth-child(2) > div.class-lis-mony-mt > span:nth-child(1)`).text().replace("%","").trim()/100;
                let sale = $(`#um_contents > div.landing-content > div.banner-contents > div.classPlan-contents-list-zone > div.classPlan-contents-list > div:nth-child(1) > div > div:nth-child(${j}) > a > div:nth-child(2) > div.class-lis-mony-mt > span:nth-child(2)`).text().replace(",","").replace("원","");
                let thumnail = $(`#um_contents > div.landing-content > div.banner-contents > div.classPlan-contents-list-zone > div.classPlan-contents-list > div:nth-child(1) > div > div:nth-child(${j}) > a > div.class-lis-img`).attr('data-original');








                j++
            }



        } catch (e) {
            console.log(e)
        } finally {
            await driver.quit();
        }




    }

}

crawlingMain();