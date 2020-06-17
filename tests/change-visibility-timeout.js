import test from 'ava';
import sinon from 'sinon';

import sqs from '../index';

test.beforeEach((t) => {
  t.context.client = sqs({ accessKeyId: 'foo', secretAccessKey: 'bar', queue: 'baz' });

  sinon.stub(t.context.client.sqs, 'changeMessageVisibility', function (params, callback) {
    setImmediate(function () {
      callback();
    });
  });
});

test.afterEach((t) => {
  t.context.client.sqs.changeMessageVisibility.restore();
});

test('returns a promise', (t) => {
  const value = t.context.client.changeVisibilityTimeout({ ReceiptHandle: 'foobar' }, 5);

  t.true(typeof value.then === 'function');
});

test('calls changeMessageVisbility with the message receipt', async (t) => {
  await t.context.client.changeVisibilityTimeout({ ReceiptHandle: 'foobar' }, 1337);

  t.true(t.context.client.sqs.changeMessageVisibility.calledWith({ ReceiptHandle: 'foobar', VisibilityTimeout: 1337 }));
});
