'use strict';

const assign = require('lodash.assign');
const aws = require('aws-sdk');

const Client = function Client (opts = {}) {
  if (!(this instanceof Client)) {
    return new Client(opts);
  }

  const { region = 'us-standard', accessKeyId, secretAccessKey, queue } = opts;

  if (!accessKeyId || !secretAccessKey || !queue) {
    throw new Error('Missing a required parameter: accessKeyId, secretAccessKey, or queue');
  }

  this.options = opts;
  this.sqs = new aws.SQS({
    apiVersion: '2016-07-19',
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

Client.prototype.sendMessage = function sendMessage (payload, options = {}) {
  if (!payload) {
    throw new Error('Messages must have a payload.');
  }

  options.MessageBody = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    this.sqs.sendMessage(options, function (err, data) {
      if (err) {
        return reject(err);
      }

      return resolve(data);
    });
  });
};

/*
 * Send an array of messages (up to 10) to the SQS queue
 *
 * @param payloads - An array of objects containing the message data
 */

Client.prototype.sendMessageBatch = function sendMessageBatch (payloads, options = {}) {
  if (!payloads || !Array.isArray(payloads)) {
    throw new Error('You must pass in an array of payloads.');
  }

  const Entries = payloads.map(function (payload) {
    return {
      ...options,
      MessageBody: JSON.stringify(payload)
    };
  });

  return new Promise((resolve, reject) => {
    this.sqs.sendMessageBatch({ Entries }, function (err, data) {
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
  const messagePromise = Promise.resolve().then(function () {
    const body = JSON.parse(message.Body);

    return handler(body, message);
  });

  return messagePromise.then(() => {
    return this.deleteMessage(message.ReceiptHandle);
  }).catch(() => {
    if (this.options.preventVisibilityTimeoutRemoval === true) {
      return Promise.resolve();
    }

    return this.removeVisibilityTimeout(message);
  });
};

/*
 * Change the visibility timeout of a message
 *
 * @param message - A message returned from SQS
 * @param newVisibilityTimeout - The new visibility timeout measured in seconds
 */

Client.prototype.changeVisibilityTimeout = function (message, newVisibilityTimeout) {
  return new Promise((resolve, reject) => {
    this.sqs.changeMessageVisibility({
      ReceiptHandle: message.ReceiptHandle,
      VisibilityTimeout: newVisibilityTimeout
    }, function (err, data) {
      if (data) {
        return resolve(data);
      }

      return reject(err);
    });
  });
};

Client.prototype.removeVisibilityTimeout = function removeVisibilityTimeout (message) {
  return new Promise((resolve) => {
    this.sqs.changeMessageVisibility({
      ReceiptHandle: message.ReceiptHandle,
      VisibilityTimeout: 0
    }, function () {
      resolve();
    });
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
