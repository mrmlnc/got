import test from 'ava';
import {Handler} from 'express';
import {HTTPError, ParseError} from '../source';
import withServer from './helpers/with-server';

const dog = {data: 'dog'};
const jsonResponse = JSON.stringify(dog);

const defaultHandler: Handler = (_request, response) => {
	response.end(jsonResponse);
};

test('`options.resolveBodyOnly` works', withServer, async (t, server, got) => {
	server.get('/', defaultHandler);

	t.deepEqual(await got({responseType: 'json', resolveBodyOnly: true}), dog);
});

test('JSON response', withServer, async (t, server, got) => {
	server.get('/', defaultHandler);

	t.deepEqual((await got({responseType: 'json'})).body, dog);
});

test('Buffer response', withServer, async (t, server, got) => {
	server.get('/', defaultHandler);

	t.deepEqual((await got({responseType: 'buffer'})).body, Buffer.from(jsonResponse));
});

test('Text response', withServer, async (t, server, got) => {
	server.get('/', defaultHandler);

	t.is((await got({responseType: 'text'})).body, jsonResponse);
});

test('JSON response - promise.json()', withServer, async (t, server, got) => {
	server.get('/', defaultHandler);

	t.deepEqual(await got('').json(), dog);
});

test('Buffer response - promise.buffer()', withServer, async (t, server, got) => {
	server.get('/', defaultHandler);

	t.deepEqual(await got('').buffer(), Buffer.from(jsonResponse));
});

test('Text response - promise.text()', withServer, async (t, server, got) => {
	server.get('/', defaultHandler);

	t.is(await got('').text(), jsonResponse);
});

test('throws an error on invalid response type', withServer, async (t, server, got) => {
	server.get('/', defaultHandler);

	// @ts-ignore Error tests
	const error = await t.throwsAsync<ParseError>(got({responseType: 'invalid'}), /^Failed to parse body of type 'invalid'/);
	t.true(error.message.includes(error.options.hostname));
	t.is(error.options.path, '/');
});

test('doesn\'t parse responses without a body', withServer, async (t, server, got) => {
	server.get('/', (_request, response) => {
		response.end();
	});

	const body = await got('').json();
	t.is(body, '');
});

test('wraps parsing errors', withServer, async (t, server, got) => {
	server.get('/', (_request, response) => {
		response.end('/');
	});

	const error = await t.throwsAsync<ParseError>(got({responseType: 'json'}), ParseError);
	t.true(error.message.includes(error.options.hostname));
	t.is(error.options.path, '/');
});

test('parses non-200 responses', withServer, async (t, server, got) => {
	server.get('/', (_request, response) => {
		response.statusCode = 500;
		response.end(jsonResponse);
	});

	const error = await t.throwsAsync<HTTPError>(got({responseType: 'json'}), HTTPError);
	t.deepEqual(error.response.body, dog);
});

test('ignores errors on invalid non-200 responses', withServer, async (t, server, got) => {
	server.get('/', (_request, response) => {
		response.statusCode = 500;
		response.end('Internal error');
	});

	const error = await t.throwsAsync<HTTPError>(got({responseType: 'json'}), {
		instanceOf: got.HTTPError,
		message: 'Response code 500 (Internal Server Error)'
	});

	t.is(error.response.body, 'Internal error');
	t.is(error.options.path, '/');
});

test('parse errors have `response` property', withServer, async (t, server, got) => {
	server.get('/', (_request, response) => {
		response.end('/');
	});

	const error = await t.throwsAsync<ParseError>(got({responseType: 'json'}), ParseError);

	t.is(error.response.statusCode, 200);
});

test('sets correct headers', withServer, async (t, server, got) => {
	server.post('/', (request, response) => {
		response.end(JSON.stringify(request.headers));
	});

	const {body: headers} = await got.post({responseType: 'json', json: {}});
	t.is(headers['content-type'], 'application/json');
	t.is(headers.accept, 'application/json');
});
