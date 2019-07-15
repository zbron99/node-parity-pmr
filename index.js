/*
 * Copyright 2017 Parity authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const BigNumber = require('bignumber.js');
BigNumber.config({
  EXPONENTIAL_AT: 9
});

const MessageType = {
  VERSION: 'V',
  ORDER_ENTERED: 'E',
  ORDER_ADDED: 'A',
  ORDER_CANCELED: 'X',
  TRADE: 'T',
};

exports.MessageType = MessageType;

exports.Side = {
  BUY: 'B',
  SELL: 'S',
};

const Factor = {
  SIZE: Math.pow(10, 8),
  PRICE: Math.pow(10, 8),
};

exports.parse = (buffer) => {
  const messageType = buffer.readUInt8(0);

  switch (messageType) {
    case 0x56:
      return parseVersion(buffer);
    case 0x45:
      return parseOrderEntered(buffer);
    case 0x41:
      return parseOrderAdded(buffer);
    case 0x58:
      return parseOrderCanceled(buffer);
    case 0x54:
      return parseTrade(buffer);
    default:
      throw new Error('Unknown message type: ' + messageType);
  }
};

function parseVersion(buffer) {
  return {
    messageType: MessageType.VERSION,
    version: buffer.readUInt32BE(1),
  };
}

function parseOrderEntered(buffer) {
  return {
    messageType: MessageType.ORDER_ENTERED,
    timestamp: readUInt64BE(buffer, 1),
    username: readString(buffer, 9, 8),
    orderNumber: readUInt64BE(buffer, 17),
    side: parseOrderSide(readString(buffer, 25, 1)),
    instrument: readString(buffer, 26, 8).trim(),
    quantity: parseOrderQuantity(readUInt64BE(buffer, 34)),
    price: parseOrderPrice(readUInt64BE(buffer, 42)),
  };
}

function parseOrderAdded(buffer) {
  return {
    messageType: MessageType.ORDER_ADDED,
    timestamp: readUInt64BE(buffer, 1),
    orderNumber: readUInt64BE(buffer, 9),
  };
}

function parseOrderCanceled(buffer) {
  return {
    messageType: MessageType.ORDER_CANCELED,
    timestamp: readUInt64BE(buffer, 1),
    orderNumber: readUInt64BE(buffer, 9),
    canceledQuantity: parseOrderQuantity(readUInt64BE(buffer, 17)),
  };
}

function parseTrade(buffer) {
  return {
    messageType: MessageType.TRADE,
    timestamp: readUInt64BE(buffer, 1),
    restingOrderNumber: readUInt64BE(buffer, 9),
    incomingOrderNumber: readUInt64BE(buffer, 17),
    quantity: parseOrderQuantity(readUInt64BE(buffer, 25)),
    matchNumber: buffer.readUInt32BE(33),
  };
}

function parseOrderSide(side) {
  const parse = {
    B: 'buy',
    S: 'sell',
  };
  return parse[side];
}

function parseOrderQuantity(quantity) {
  return new BigNumber(quantity).dividedBy(Factor.SIZE).toString();
}

function parseOrderPrice(price) {
  return new BigNumber(price).dividedBy(Factor.PRICE).toString();
}

function readUInt64BE(buffer, offset) {
  const high = buffer.readUInt32BE(offset);
  const low = buffer.readUInt32BE(offset + 4);

  return 0x100000000 * high + low;
}

function readString(buffer, offset, length) {
  return buffer.toString('ascii', offset, offset + length);
}
