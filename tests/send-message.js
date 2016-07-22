import test from 'ava';
import sinon from 'sinon';

import sqs from '../index';

test.beforeEach((t) => {
  t.context.client = sqs({ accessKeyId: 'foo', secretAccessKey: 'bar', queue: 'baz' });

  sinon.stub(t.context.client.sqs, 'sendMessage', function (params, callback) {
    setImmediate(function () {
      callback(null, { foo: 'bar' });
    });
  });
});

test.afterEach((t) => {
  t.context.client.sqs.sendMessage.restore();
});

test('throws when a payload is not sent', (t) => {
  t.throws(() => {
    t.context.client.sendMessage();
  });
});

test('returns a promise', (t) => {
  const value = t.context.client.sendMessage({});

  t.true(typeof value.then === 'function');
});

test('calls sendMessage with the message body', (t) => {
  const message = { type: 'ACTION_TYPE', payload: 1337 };

  t.context.client.sendMessage(message);

  t.true(t.context.client.sqs.sendMessage.calledWith({ MessageBody: JSON.stringify(message) }));
});

test('should extend the default options', (t) => {
  const message = { type: 'ACTION_TYPE', payload: 1337 };

  t.context.client.sendMessage(message, { DelaySeconds: 3 });

  t.true(t.context.client.sqs.sendMessage.calledWith({ MessageBody: JSON.stringify(message), DelaySeconds: 3 }));
});

test('returns the data from the promise', async (t) => {
  const data = await t.context.client.sendMessage({ type: 'ACTION_TYPE', payload: 1337 });

  t.deepEqual(data, { foo: 'bar' });
});

test('rejects the promise if sqs call fails', (t) => {
  t.context.client.sqs.sendMessage.restore();

  sinon.stub(t.context.client.sqs, 'sendMessage', function (params, callback) {
    callback(new Error('foobar'), null);
  });

  t.throws(t.context.client.sendMessage({ type: 'ACTION_TYPE', payload: 1337 }));
});
