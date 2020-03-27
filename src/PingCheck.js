const { promises: fs, constants: { F_OK } } = require('fs');

const https = require('https');
const http = require('http');
const url = require('url');

/**
 * Retrieve proper value for property.
 * 
 * @param {string} property Name of property.
 * @param {object} options Options.
 * @param {string|null} [options.value=null] Value that will be result if its valid.
 * @param {string|null} [options.valuePath=null] Path to file which contents will be result.
 * 
 * @returns {Promise<string>} Value.
 */
const getOrReadValue = async ({ value = null, valuePath = null }) => {
    if (value || valuePath) {
        if (typeof value === 'string' && value.length) {
            return value;
        }

        if (typeof valuePath === 'string' && valuePath.length) {
            await fs.access(valuePath, F_OK);

            return fs.readFile(valuePath);
        }
    }

    return null;
};


/**
 * 
 * Retrieve proper HTTPS key.
 * 
 * @param {object} options Options.
 * @param {string|null} options.key HTTPS key value.
 * @param {string|null} options.keyPath HTTPS key file path.
 * 
 * @returns {string} Key value.
 */
const getHTTPSKeyValue = async ({ key = null, keyPath = null } = {}) => {
    return getOrReadValue({ value: key, valuePath: keyPath });
}

/**
 * 
 * Retrieve proper HTTPS certificate.
 * 
 * @param {object} options Options.
 * @param {string|null} options.certificate HTTPS certificate value.
 * @param {string|null} options.certificatePath HTTPS certificate file path.
 * 
 * @returns {string} Key value.
 */
const getHTTPSCertificateValue = async ({ certificate = null, certificatePath = null } = {}) => {
    return getOrReadValue({ value: certificate, valuePath: certificatePath });
}

/**
 * @param {object} options Server options.
 * @param {string} [options.key=null] HTTPS Key.
 * @param {string} [options.certificate=null] HTTPS Certificate.
 * @param {string|null} [options.keyPath=null] Path to HTTPS key file.
 * @param {string|null} [options.certificatePath=null] Path to HTTPS certificate file.
 * 
 * @returns {Promise<http.Server|https.Server>} Server instance.
 */
const createServer = async (options, callback) => {
    let server = http.createServer;

    if (options.key || options.keyPath) {
        server = https.createServer.bind(null, {
            key: await getHTTPSKeyValue(options),
            cert: await getHTTPSCertificateValue(options),
            passphrase: options.passphrase || undefined,
        });
    }

    return server(callback);
};

/**
 * Determine whether or not provided secret is valid.
 * 
 * @param {string|null} secret Expected secret.
 * @param {http.IncommingMessage|https.IncommingMessage} request Request object.
 * 
 * @returns {boolean} State.
 */
const isValidRequestSecret = (secret, request) => {
    if (secret) {
        if (request.headers['x-check-secret'] && request.headers['x-check-secret'] === secret) {
            return true;
        }
        const parsed = url.parse(request.url, true);

        if (parsed.query && parsed.query.checkSecret === secret) {
            return true;
        }

        return false;
    }

    return true;
}

/**
 * Start HTTP(S) server.
 * 
 * @param {object} options Server options.
 * @param {string} options.key HTTPS Key.
 * @param {string} options.certificate HTTPS Certificate.
 * @param {string|null} [options.keyPath=null] Path to HTTPS key file.
 * @param {string|null} [options.certificatePath=null] Path to HTTPS certificate file.
 * @param {string|null} [options.passphrase=null] Passphrase provided to HTTPS server.
 * @param {string} [options.host='127.0.0.1'] Address on which server will liten.
 * @param {string} [options.path="/ping_check"] URL path on which server should listen.
 * @param {int} [options.port=80] URL Port on which server should listen.
 * @param {string} [options.secret=null] Secret key used to authorize client request.
 * 
 * @returns {Promise<http.Server|https.Server} Server instance.
 */
const startHTTPServer = async (options) => {
    const { secret = null } = options;

    const server = await createServer(options, async (request, response) => {
        let status = 401;
        let data = { message: 'Invalid Secret.' };

        if (isValidRequestSecret(secret, request)) {
            status = 200;
            data = Object
                .entries(PingCheck[propServiceStatuses])
                .map(([service, data]) => {
                    if (null !== data.expiration && new Date(data.expiration) < new Date()) {
                        PingCheck.notify({
                            ...(PingCheck[propFallbackStates][service] || { status: PingCheck.Status.Error })
                        }, service);
                    }

                    return { ...PingCheck[propServiceStatuses][service], service };
                });
        }

        response.writeHead(status, {
            'Content-Type': 'application/json'
        });

        response.end(JSON.stringify(data));
    });

    const {
        path = '/health',
        host = '127.0.0.1',
        port = 8080,
    } = options;

    return new Promise((resolve) => {
        server.listen({ host, port, path }, () => {
            resolve(server);
        });
    });

};

const propServiceStatuses = Symbol('Statuses for each service that provided health check.');
const propFallbackStates = Symbol('Fallback sate for each service.');

class PingCheck {

    /**
     * Retrieve available statuses.
     * 
     * @returns {{Ok: string, Warning: string, Error: string}} Statuses.
     */
    static get Status() {
        return {
            Ok: 'ok',
            Warning: 'warning',
            Error: 'error'
        };
    }

    /**
     * @param {object} options Server options.

     * @param {string} [options.key=null] HTTPS Key.
     * @param {string} [options.certificate=null] HTTPS Certificate.
     * @param {string|null} [options.keyPath=null] Path to HTTPS key file.
     * @param {string|null} [options.certificatePath=null] Path to HTTPS certificate file.
     * @param {string|null} [options.passphrase=null] Passphrase provided to HTTPS server.
     * @param {string} [options.host='127.0.0.1'] Address on which server will liten.
     * @param {string} [options.path="/ping_check"] URL path on which server should listen.
     * @param {int} [options.port=80] URL Port on which server should listen.
     * @param {string} [options.secret=null] Secret key used to authorize client request.
     */
    static async initialize(options = {}) {
        return startHTTPServer(options);
    }

    /**
     * Change current status of service.
     * 
     * @param {object} [options={}] Health notifier options.
     * @param {PingCheck.Status.Ok | PingCheck.Status.Warning | PingCheck.Status.Error} [options.status=PingCheck.Status.Ok] Status.
     * @param {string} [options.message=null] Additional message.
     * @param {Date|string} [options.expiration=null] Time until state is valid (if not overriden).
     * @param {string} [id='default'] Identifier (name) of service that provides healthcheck.
     */
    static notify(options, id = 'default') {
        const data = {
            service: null,
            payload: null,
        };

        if (typeof options !== 'object') {
            data.service = (typeof options === 'string' && options) || (typeof id === 'string' && id) || 'default';
            data.payload = { status: PingCheck.Status.Ok, message: null, expiration: null };
        } else if (options && typeof options === 'object') {
            let expiration = (new Date(options.expiration || '')).toString();

            expiration = expiration === 'Invalid Date' ? null : expiration;

            data.service = (typeof id === 'string' && id) || 'default';
            data.payload = {
                status: options.status || PingCheck.Status.Warning,
                message: options.message || 'Message not provided.',
                expiration,
            };
        }

        if (typeof PingCheck[propServiceStatuses][data.service] !== 'object') {
            PingCheck[propServiceStatuses][data.service] = {};
            PingCheck[propFallbackStates][data.service] = null;
        }

        PingCheck[propServiceStatuses][data.service] = { ...data.payload };

        if (null === data.payload.expiration) {
            PingCheck[propFallbackStates][data.service] = { ...data.payload };
        }
    }
}

PingCheck[propServiceStatuses] = {
    default: {
        status: PingCheck.Status.Ok,
        message: null,
        expiration: null,
    },
};

PingCheck[propFallbackStates] = {
    default: {
        status: PingCheck.Status.Ok,
        message: null,
        expiration: null,
    },
};

module.exports = PingCheck;