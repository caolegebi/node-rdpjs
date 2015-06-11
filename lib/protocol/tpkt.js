/*
 * Copyright (c) 2014-2015 Sylvain Peyrefitte
 *
 * This file is part of node-rdp.
 *
 * node-rdp is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var inherits = require('util').inherits;
var type = require('../core').type;
var events = require('events');

/**
 * Type of tpkt packet
 * Fastpath is use to shortcut RDP stack
 * @see http://msdn.microsoft.com/en-us/library/cc240621.aspx
 * @see http://msdn.microsoft.com/en-us/library/cc240589.aspx
 */
var ACTION = {
	FASTPATH_ACTION_FASTPATH : 0x0,
    FASTPATH_ACTION_X224 : 0x3
};

/**
 * TPKT layer of rdp stack
 */
function TPKT(transport) {
	this.transport = transport;
	// wait 2 bytes
	this.transport.expect(2);
	// next state is receive header
	var self = this;
	this.transport.once('data', function(s) {
		self.recvHeader(s);
	});
}

/**
 * inherit from a packet layer
 */
inherits(TPKT, events.EventEmitter);

/**
 * Receive correct packet as expected
 * @param s {type.Stream}
 */
TPKT.prototype.recvHeader = function(s) {
	var version = new type.UInt8().read(s);
	if(version.value == ACTION.FASTPATH_ACTION_X224) {
		new type.UInt8().read(s);
		var self = this;
		this.transport.expect(2);
		this.transport.once('data', function(s) {
			self.recvExtendedHeader(s);
		});
	}
	else {
		
	}
};

/**
 * Receive second part of header packet
 * @param s {type.Stream}
 */
TPKT.prototype.recvExtendedHeader = function(s) {
	var size = new type.UInt16Be().read(s);
	this.transport.expect(size.value - 4);
	//next state receive packet
	var self = this;
	this.transport.once('data', function(s) {
		self.recvData(s);
	});
};

/**
 * Receive data available for presentation layer
 * @param s {type.Stream}
 */
TPKT.prototype.recvData = function(s) {
	this.emit('data', s);
	this.transport.expect(2);
	//next state receive header
	var self = this;
	this.transport.once('data', function(s) {
		self.recvHeader(s);
	});
};

/**
 * Send message throught TPKT layer
 * @param message {type.*}
 */
TPKT.prototype.send = function(message) {
	this.transport.send(new type.Component([
	    new type.UInt8(ACTION.FASTPATH_ACTION_X224),
	    new type.UInt8(0),
	    new type.UInt16Be(message.size() + 4),
	    message
	]));
};

/**
 * Module exports
 */
module.exports = TPKT;
