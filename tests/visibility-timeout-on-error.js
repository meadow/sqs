import test from 'ava';
import _get from 'lodash.get';
import sinon from 'sinon';

import sqs from '../index';

test.beforeEach((t) => {
  t.context.client = sqs({ accessKeyId: 'foo', secretAccessKey: 'bar', queue: 'baz', visibilityTimeoutOnError: 1234 });

  sinon.stub(t.context.client.sqs, 'receiveMessage', function (params, callback) {
    setImmediate(function () {
      callback(null, t.context.data);
    });
  });

  sinon.stub(t.context.client, 'deleteMessage', function () {
    return Promise.resolve();
  });

  sinon.stub(t.context.client, 'changeVisibilityTimeout', function () {
    return Promise.resolve();
  });

  sinon.stub(t.context.client, 'removeVisibilityTimeout', function () {
    return Promise.resolve();
  });
});

test.afterEach((t) => {
  t.context.client.sqs.receiveMessage.restore();
  t.context.client.deleteMessage.restore();
  t.context.client.changeVisibilityTimeout.restore();
  t.context.client.removeVisibilityTimeout.restore();
});

test.cb('should use `visibilityTimeoutOnError` option', (t) => {
  t.plan(2);

  t.context.data = {
    Messages: [{ Body: '{ "foobar": "bazqux" }' }]
  };

  t.context.client.pollQueue({}, function () {
    const promise = Promise.resolve();

    setImmediate(function () {
      promise.then(function () {
        t.is(_get(t.context.client.changeVisibilityTimeout, 'firstCall.args[1]'), 1234);
        t.is(t.context.client.changeVisibilityTimeout.callCount, 1);
        t.end();
      });
    });

    return promise.then(function () {
      throw new Error('bar');
    });
  });
});

test.cb('should call removeVisibilityTimeout after handler throws', (t) => {
  t.plan(2);

  t.context.data = {
    Messages: [{ Body: '{ "foobar": "bazqux" }' }]
  };

  t.context.client.pollQueue({}, function () {
    setImmediate(function () {
      t.is(_get(t.context.client.changeVisibilityTimeout, 'firstCall.args[1]'), 1234);
      t.is(t.context.client.changeVisibilityTimeout.callCount, 1);
      t.end();
    });

    throw new Error('bar');
  });
});
