import test from 'ava';

import sqs from '../index';

test('instantiantes a client when used without new', (t) => {
  const client = sqs({ accessKeyId: 'foo', secretAccessKey: 'bar', queue: 'baz' });

  t.truthy(client.sendMessage);
});

test('throws when missing required options', (t) => {
  t.throws(() => {
    sqs();
  });
});

test('uses the default us-standard region', (t) => {
  const client = sqs({ accessKeyId: 'foo', secretAccessKey: 'bar', queue: 'baz' });

  t.is(client.sqs.config.region, 'us-standard');
});

test('creates amazon client with options', (t) => {
  const client = sqs({ region: 'us-west-2', accessKeyId: 'foo', secretAccessKey: 'bar', queue: 'baz' });

  t.truthy(client.sqs);
  t.is(client.sqs.config.apiVersion, '2016-07-19');
  t.is(client.sqs.config.region, 'us-west-2');
  t.is(client.sqs.config.accessKeyId, 'foo');
  t.is(client.sqs.config.secretAccessKey, 'bar');
  t.is(client.sqs.config.params.QueueUrl, 'baz');
});
