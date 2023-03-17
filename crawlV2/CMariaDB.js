const mariadb = require('mariadb');

// const dbconfig = {
//     host : '192.168.142.129',
//     user : 'root',
//     password : 'maria',
//     database : 'TEMPLETEST'
// };

const dbconfig = {
    host : 'fullstacks.csgna22pwwig.ap-northeast-2.rds.amazonaws.com',
    user : 'admin',
    password : 'fullstack_2023',
    database : 'fullstacks'
};

const CMariaDB = {
    makeConn: async () => {
        try {
            return await mariadb.createConnection(dbconfig)
        } catch (e) { console.log(e); }
    },
    closeConn: async (conn) => {
        if (conn) {
            try { await conn.close(); }
            catch (e) { console.log(e); }
        }
    }
}

module.exports = CMariaDB;