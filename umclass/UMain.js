const Mariadb = require("./MariaDB");


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


