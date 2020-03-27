
# Requeirements

- NodeJS >= 12

# Description

PingCheck is basic HTTP(s) JSON API that provides easy way to set service health status.
It is configurable and it support's both HTTP and HTTPS protocols.
Binding to custom address is supported, as well as port on which server should listen.
Also- custom path on which health check endpoint should listen is supported.

This library relies on singletop pattern, therefor everyting that is done is related to same class, and is  accessed via static methods/properties.

**NOTE: This only provides current data, historical values are not yet implemented.**

# Usage

## Using HTTP

```javascript
const PingCheck = require('pingcheck');

PingCheck.initialize()
    .then(() => { console.log('Server listening') })
    .catch(console.error);
```
This example will start server with default configurations.
Default address: http://localhost:8080/health

## Using HTTPS

```javascript
const PingCheck = require('pingcheck');

const options = {
    keyPath: '/path/to/ssl/key.key',
    certificatePath: '/path/to/ssl/certificate.pem',
    passphrase: 'custom key passphrase',
};

PingCheck.initialize(options)
    .then(() => { console.log('Server listening') })
    .catch(console.error);
```
In example aboce, we provide only SSL certificate, therefor default address will be used.
Default address: https://localhost:8080/health

## Protected Endpoint

```javascript
const PingCheck = require('pingcheck');

const options = {
    secret: 'MY_SECRET',
};

PingCheck.initialize(options)
    .then(() => { console.log('Server listening') })
    .catch(console.error);
```

To protect endpoint You can provide ``secret`` property to ``PingCheck.initialize`` options.
Providing ``secret`` makes endpoint locked behind that secret, which will require client to send either header ``x-check-secret`` that matches provided ``secret``, or query parameter ``checkSecret`` also matching ``secret`` parameter.

*NOTE: This is most basic protection*

One of possible way to access following example is by using query paraeter ``checkSecret``
Address: http://localhost:8080/health?checkSecret=MY_SECRET

#### Initialize options

- ``options.host`` *(default='localhost')*
  - Address on which server is listening
- ``options.port`` *(default=8080)*
  - Port on which server is listening
- ``options.path`` *(default='/health')*
  - Path on which health status is served.
- ``options.secret`` *(default=null)*
  - API Secret used to prevent access to unknowns.
- ``options.key`` *(default=null)*
  - SSL Key (required for HTTPS)
- ``options.certificate`` *(default=null)*
  - SSL Certificate
- ``options.keyPath`` *(default=null, ignored if options.key is set)*
  - Path to SSL key file
- ``options.certificatePath`` *(default=null, ignored if options.certificate is set)*
  - Path to SSL certificate file.
- ``options.passphrase`` *(default=null)*
  - Custom passphrase for SSL certificate

## Health Notifier

In order for API to provide proper or any data, some parts of Your application/service/script ***MUST*** trigger ``PingCheck.notify`` method.
``PingCheck.notify`` can be used to notify rest server about state of specific service.

There is always service called ``default`` and its used when we want to notify on "global" level. For sub-grouping we can provide custom service identifier when notifying.

### Notify Global
```javascript
const PingCheck = require('pingcheck');

// This will set global (default) Ok status, without message.
PingCheck.notify();

// This will set global (default) health status to "warning" with provided message.
PingCheck.notify({
  status: PingCheck.Status.Warning,
  message: 'High load',
});
```

### Notify as specific service
```javascript
const PingCheck = require('pingcheck');

// This will set service "users" health status to "warning" with provided message.
PingCheck.notify('users', {
  status: PingCheck.Status.Warning,
  message: 'High load',
});
```

### Notify health status with expiration time
```javascript

const PingCheck = require('pingcheck');

// This will set service "users" health status to "warning" with provided message and expiration time.
PingCheck.notify('users', {
  status: PingCheck.Status.Warning,
  message: 'High load',
  expiration: '2020-03-24 23:59:59',
});
```

NOTE: This status will be valid as long as check time is less than expiration. In case that state has expired last "non-expiring" state is used. In case that there is no previous "non-expiring" state, status "error" without message is used. 