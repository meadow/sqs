# @meadow/sqs

[![Build Status](https://circleci.com/gh/meadow/sqs.svg?style=shield)](https://circleci.com/gh/meadow/sqs)
[![codecov.io](https://codecov.io/github/meadow/sqs/coverage.svg?branch=master&precision=2)](https://codecov.io/github/meadow/sqs?branch=master)
[![npm](https://img.shields.io/npm/v/@meadow/sqs.svg)](https://www.npmjs.com/package/@meadow/sqs)

Promise/JSON based client for Amazon SQS with automatic long-polling.

- Requires node v6.x

## Installation

```js
npm install @meadow/sqs --save
```

## Usage

Create a client:

```js
const sqs = require('@meadow/sqs');

const client = new sqs({
  region: 'us-west-2',
  accessKeyId: 'AKFOOBAR',
  secretAccessKey: 'barbaz',
  queue: 'https://sqs.us-west-2.amazonaws.com/foobar/barbaz'
});
```

Send a message:

```js
client.sendMessage({
  type: 'ACTION_TYPE',
  payload: {
    foo: 'bar'
  }
});
```

Long poll the queue for messages:

```js
client.pollQueue({ VisibilityTimeout: 600 }, function (message) {
  console.log(message);

  return new Promise(function (resolve) {
    // Perform the work for this message

    resolve();
  });
});
```

## API

Everything is built around promises and JSON. Amazon SQS only supports message bodies as strings, but this client will transform that to and from JSON for you automatically. When polling the queue, `@meadow/sqs` expects that you return a promise. When that promise resolves, the message will automatically be deleted from the SQS queue. If the promise that you returned throws an error, the `VisibilityTimeout` of the message will be set to 0 so the queue can receive it again for re-processing.

### Constructor Options

When calling `new sqs()` you may pass in an argument of options like this: `new sqs({ visibilityTimeoutOnError: 60 })`. The available options are:

- `visibilityTimeoutOnError` - When the `pollQueue` handler throws an error, the visibility timeout of the message will be set to this value
- `preventVisibiltyTimeout` - When set to true, the visibility timeout of the messgae will remain unchanged after an error is thrown in the handler. This will disable the default behavior of removing the visibility timeout.

#### sendMessage(payload, [options])

- `payload` - A JSON object that will be persisted to the Amazon SQS queue.
- `options` - An object that will be sent to the Amazon SQS `sendMessage` method.

#### sendMessageBatch(payloads, [options])

- `payloads` - AN array of JSON objects to send to the SQS queue
- `options` - An object that will be sent alongside each message

#### pollQueue (options, handler)

Calling this method will long-poll the Amazon SQS queue waiting for messages to come in. For each message that is received, the handler will be called with the body of the message as a JSON object. You are required to return a promise from your handler that resolves when the work for this message is completed. After the promise resolves, `@meadow/sqs` will automatically delete the message from the SQS queue. If an error is thrown, `@meadow/sqs` will remove the visibility timeout so that the message can be immediately re-processed. If you would like different behavior, there are two options you may pass in to the constructor to change the default.

- `options` - These options will be sent to the Amazon SQS `receiveMessage` function defined here: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#receiveMessage-property
- `handler` - A function that returns a promise, which is meant to handle the message. The first parameter will be the message body as a JSON object. The second parameter will be the SQS message object

#### changeMessageVisibility (message, newVisibilityTimeout)

- `message` - The SQS message returned as the second parameter to your `pollQueue` handler method
- `newVisibilityTimeout` - The new visibility timeout you want applied to this message measured in seconds.
