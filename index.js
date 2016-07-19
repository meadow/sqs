'use strict';

const aws = require('aws-sdk');

const DEFAULT_OPTS = {
  region: 'us-standard',
  accessKeyId: '',
  secretAccessKey: '',
  queue: ''
}

const Client = function Client (opts = DEFAULT_OPTS) {
  if (!(this instanceof Client)) return new Client(opts);

  const { region, accessKeyId, secretAccessKey, queue } = opts;

  console.log(opts);

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

Client.prototype.sendMessage = function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    this.sqs.sendMessage({
      MessageBody: JSON.stringify(payload)
    }, function (err, data) {
      if (err) {
        return reject(err);
      }

      resolve(data);
    });
  });
};

module.exports = Client;
