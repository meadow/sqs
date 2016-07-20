import test from 'ava';
import sinon from 'sinon';

import sqs from '../index';

test.beforeEach((t) => {
  t.context.client = sqs({ accessKeyId: 'foo', secretAccessKey: 'bar', queue: 'baz' });

  sinon.stub(t.context.client.sqs, 'deleteMessage', function (params, callback) {
    setImmediate(function () {
      callback();
    });
  });
});

test.afterEach((t) => {
  t.context.client.sqs.deleteMessage.restore();
});

test('returns a promise', (t) => {
  const value = t.context.client.deleteMessage('foobar');

  t.true(typeof value.then === 'function');
});

test('calls deleteMessage with the message body', async (t) => {
  await t.context.client.deleteMessage('foobar');

  t.true(t.context.client.sqs.deleteMessage.calledWith({ ReceiptHandle: 'foobar' }));
});
