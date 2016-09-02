import test from 'ava';
import sinon from 'sinon';

import sqs from '../index';

test.beforeEach((t) => {
  t.context.client = sqs({ accessKeyId: 'foo', secretAccessKey: 'bar', queue: 'baz' });

  sinon.stub(t.context.client.sqs, 'receiveMessage', function (params, callback) {
    setImmediate(function () {
      callback(null, t.context.data);
    });
  });

  sinon.stub(t.context.client, 'deleteMessage', function () {
    return Promise.resolve();
  });

  sinon.stub(t.context.client, 'removeVisibilityTimeout', function () {
    return Promise.resolve();
  });
});

test.afterEach((t) => {
  t.context.client.sqs.receiveMessage.restore();
  t.context.client.deleteMessage.restore();
  t.context.client.removeVisibilityTimeout.restore();
});

test('should use the default options', (t) => {
  t.context.client.pollQueue({}, function () {

  });

  t.deepEqual(t.context.client.receiveOptions, {
    AttributeNames: ['All'],
    MessageAttributeNames: ['All'],
    WaitTimeSeconds: 20
  });
});

test('should extend the default options', (t) => {
  t.context.client.pollQueue({ WaitTimeSeconds: 5, otherOption: 'foobar' }, function () {

  });

  t.deepEqual(t.context.client.receiveOptions, {
    AttributeNames: ['All'],
    MessageAttributeNames: ['All'],
    WaitTimeSeconds: 5,
    otherOption: 'foobar'
  });
});

test.cb('should call the handler', (t) => {
  t.plan(2);

  t.context.data = {
    Messages: [{ Body: '{ "foobar": "bazqux" }' }]
  };

  t.context.client.pollQueue({}, function (body) {
    t.deepEqual(body, {
      foobar: 'bazqux'
    });
    t.pass();
    t.end();
  });
});

test.cb('should call delete message', (t) => {
  t.plan(1);

  t.context.data = {
    Messages: [{ Body: '{ "foobar": "bazqux" }' }]
  };

  t.context.client.pollQueue({}, function () {
    const promise = Promise.resolve();

    setImmediate(function () {
      promise.then(function () {
        t.is(t.context.client.deleteMessage.callCount, 1);
        t.end();
      });
    });

    return promise;
  });
});

test.cb('should call removeVisibilityTimeout', (t) => {
  t.plan(1);

  t.context.data = {
    Messages: [{ Body: '{ "foobar": "bazqux" }' }]
  };

  t.context.client.pollQueue({}, function () {
    const promise = Promise.resolve();

    setImmediate(function () {
      promise.then(function () {
        t.is(t.context.client.removeVisibilityTimeout.callCount, 1);
        t.end();
      });
    });

    return promise.then(function () {
      throw new Error('bar');
    });
  });
});

test.cb('should call removeVisibilityTimeout after handler throws', (t) => {
  t.plan(1);

  t.context.data = {
    Messages: [{ Body: '{ "foobar": "bazqux" }' }]
  };

  t.context.client.pollQueue({}, function () {
    setImmediate(function () {
      t.is(t.context.client.removeVisibilityTimeout.callCount, 1);
      t.end();
    });

    throw new Error('bar');
  });
});

test.cb('should call poll queue multiple times', (t) => {
  t.plan(1);

  sinon.spy(t.context.client, 'pollQueue');

  t.context.client.pollQueue({}, function () {

  });

  setTimeout(function () {
    t.true(t.context.client.pollQueue.callCount > 1);
    t.end();
  }, 100);
});

test.cb('should call poll queue again even after errors', (t) => {
  t.plan(1);

  t.context.client.removeVisibilityTimeout.restore();
  sinon.spy(t.context.client, 'pollQueue');

  sinon.stub(t.context.client, 'removeVisibilityTimeout', function () {
    throw new Error('bar');
  });

  t.context.data = {
    Messages: [{ Body: '{ "foobar": "bazqux" }' }]
  };

  t.context.client.pollQueue({}, function () {
    return Promise.resolve().then(function () {
      throw new Error();
    });
  });

  setTimeout(function () {
    t.true(t.context.client.pollQueue.callCount > 1);
    t.end();
  }, 100);
});
