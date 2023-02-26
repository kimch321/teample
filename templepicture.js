const {Builder, By, Key, until} = require('selenium-webdriver');
const cheerio = require('cheerio');

const templeList = ['gapsa','sansa','gunbongsa','kyungguksa','gounsa','d-kumkang','gm5300', 'gwaneumsa', 'alfmr3700', 'guryongsa', 'guinsa', 'seoncenter', 'gwijeongsa', 'sejon', 'Geumdangsa', 'kumyongsa', 'geumsansa', 'geumsunsa', 'kirimsa', 'kilsangsa', 'naksansa', 'naesosa', 'naewonjungsa', 'neunggasa', 'dasolsa', 'daegwangsa2', 'biriya', 'daeseungsa', 'kathyy', 'daewonsab', 'admin', 'botongzen', 'dogapsa', 'dorisa', 'dorimsa1', 'donghwasa', 'magoksa', 'mangkyung', 'gopanhwa', 'myogaksa2008', 'mjts2008', 'mugaksa', 'muryangsa2', 'muwisa', 'munsuam5820', 'mrdaeheungsa', 'dalmaom', 'bys4199', 'baekdamsa', 'baekryunsa', 'ildams', 'baekyangsa', '100je4', 'beomeosa', 'gusdka874', 'beopjusa', 'bogyeong', 'bohyunsa', 'bongnyeongsa', 'lotus0415', 'bongeunsa', 'bonginsa', 'bongjeongsa', 'busuksa', 'bulgapsa11', 'bgs9913', 'sanasa', 'saseongam', 'samwoon', '534-7661', 'seogwangsa', 'seokbulsa', 'seonmaster', 'seonbonsa', 'sunamsa', 'seonamsa', 'sg9893', 'sinhungsa', 'seongjusa', 'songgwangsa', 'songkwangsa', 'suguksa', 'sudeoksa', 'suwonsa', 'sujinsa', 'ttbag', 'silsangsa', 'simwonsa', 'palman56', 'ssanggyesa', 'ssangbongsa', 'yeongoksa', 'lotus', 'duswndka3', 'ygs0001', 'younglangsa', 'ypsa', 'okcheonsa100', 'yongmunsanam', 'yongmunsa', 'yougmoonsa', 'yongyeounsa', 'yonghwasa', 'tsyong', 'unjusa0660', 'wonhyosa', 'woljeongsa', 'yukjijangsa', 'eunhaesa', 'jabisunsa', 'jangyuksa', 'jds5450', 'jungtosa', 'jeonghyesa', 'jogyesa', 'jhs3554488', 'jeungsimsa', 'jijang', 'jikjisa', 'jks1080', 'choneunsa', 'cheonchuksa', 'cheongpyeongsa', 'chookseosa', 'temple089', 'TemplestayCenter', 'pyochunsa','odzen',   'sabaha83',    'haeinsa',    'hd569',    'hongbubsa',    'hwagyesa',    'hwaamsa',    'hwaeomsa',    'hws3280',    'hoeamsa',
    'heungguksa',    'hgs6856433',    'anguksa',    'yakchunsa'];

async function getTempleData(url) {
    let templeData = {templeName: null};
    let driver = await new Builder().forBrowser('chrome').build();
    try {
        await driver.get(url);
        let html = await driver.getPageSource();
        let $ = cheerio.load(html);
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

async function getTempleDataList(templeList) {
    let templeDataList = [];
    for (let i = 0; i < templeList.length; i++) {
        let url = `https://www.templestay.com/temple_info.asp?t_id=${templeList[i]}`;
        let templeData = await getTempleData(url);
        templeDataList.push(templeData);
    }
    return templeDataList;
}

// Example temple list array


// Call function to scrape data for each temple in the list
getTempleDataList(templeList)
    .then((templeDataList) => {
        console.log(templeDataList);
    })
    .catch((e) => {
        console.error(`Error retrieving temple data: ${e}`);
    });
