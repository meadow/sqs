'use strict';

const assign = require('lodash.assign');
const aws = require('aws-sdk');

const DEFAULT_OPTS = {
  region: 'us-standard',
  accessKeyId: '',
  secretAccessKey: '',
  queue: ''
};

const Client = function Client (opts = DEFAULT_OPTS) {
  if (!(this instanceof Client)) {
    return new Client(opts);
  }

  const { region, accessKeyId, secretAccessKey, queue } = opts;

  if (!accessKeyId || !secretAccessKey || !queue) {
    throw new Error('Missing a required parameter: accessKeyId, secretAccessKey, or queue');
  }

  this.sqs = new aws.SQS({
    region,
    accessKeyId,
    secretAccessKey,
    params: {
      QueueUrl: queue
    }
  });
};

/*
 * Send a message to the SQS queue
 *
 * @param payload - An object containing the message data
 */

Client.prototype.sendMessage = function sendMessage (payload) {
  return new Promise((resolve, reject) => {
    this.sqs.sendMessage({
      MessageBody: JSON.stringify(payload)
    }, function (err, data) {
      if (err) {
        return reject(err);
      }

      return resolve(data);
    });
  });
};

/*
 * Poll the SQS queue for new messages
 *
 * @param opts - An object to pass directly to the aws `receiveMessage` method
 * @param handler - A function that should return a promise when passed a message
 */

Client.prototype.pollQueue = function pollQueue (opts = {}, handler) {
  if (!this.receiveOptions) {
    this.receiveOptions = assign({
      AttributeNames: ['All'],
      MessageAttributeNames: ['All'],
      WaitTimeSeconds: 20
    }, opts);
  }

  if (!this.handler) {
    this.handler = handler;
  }

  const self = this;

  this.sqs.receiveMessage(this.receiveOptions, (err, data) => {
    if (err) {
      // Not needed
    }

    const promises = [];

    if (data && data.Messages) {
      data.Messages.forEach(function (message) {
        promises.push(this.handleMessage(message, this.handler));
      }, this);
    }

    Promise.all(promises).then(function () {
      setImmediate(function () {
        self.pollQueue();
      });
    }, function () {
      setImmediate(function () {
        self.pollQueue();
      });
    });
  });
};

/*
 * Interacts with the handler to process a message
 *
 * @param message - A message returned from SQS
 * @param handler - The message handler that will return a promise
 */

Client.prototype.handleMessage = function handleMessage (message, handler) {
  const body = JSON.parse(message.Body);
  const messagePromise = handler(body, message);

  if (!messagePromise) {
    return Promise.resolve();
  }

  return messagePromise.then(() => {
    return this.deleteMessage(message.ReceiptHandle);
  });
};

/*
 * Deletes a message from the SQS queue
 *
 * @param receipt - A message receipt returned from SQS on `receiveMessage`
 */

Client.prototype.deleteMessage = function deleteMessage (receipt) {
  return new Promise((resolve) => {
    this.sqs.deleteMessage({
      ReceiptHandle: receipt
    }, function () {
      resolve();
    });
  });
};

module.exports = Client;
