const PingCheck = require('../');

require('./services/user');
require('./services/order');
require('./services/payment');

setImmediate(async () => {
    PingCheck.notify({ status: PingCheck.Status.Ok, message: 'All good.' });

    await PingCheck.initialize();
    // await PingCheck.initialize({
    //     host: 'localhost',
    //     port: 1234,
    //     path: '/health',
    //     secret: 'secret',
    //     passphrase: 'test',// comment in case of HTTP protocol
    //     keyPath: resolve(__dirname, 'localDevCA.key'), // comment in case of HTTP protocol
    //     certificatePath: resolve(__dirname, 'localDevCA.pem'), // comment in case of HTTP protocol
    // });
})