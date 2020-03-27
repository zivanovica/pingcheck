const PingCheck = require('../../');

PingCheck.notify('orders');
PingCheck.notify({ status: PingCheck.Status.Warning, message: 'Hello There.', expiration: '2020-03-24' }, 'orders');


module.exports = {};