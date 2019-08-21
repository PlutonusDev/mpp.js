const Package = exports.Package = require("../../package.json");
const { Error, rangeError } = require("../errors");

/**
 * Options for a client.
 * @typedef {Object} ClientOptions
 * @property {string} [proxy=""] Proxy used for connecting (IP/Hostname:Port)
 * @property {string} [username="[ PlutoBot ]"] Username to set on `READY` event.
 * @property {string} [room="lobby"] Room to join on `READY` event.
 */
exports.DefaultOptions = {
	proxy: "",
	username: "[ PlutoBot ]",
	room: "lulwut"
}

/**
 * The current status of the client. Here are the available statuses:
 * * READY: 0
 * * CONNECTING: 1
 * * RECONNECTING: 2
 * * IDLE: 3
 * * NEARLY: 4
 * * DISCONNECTED: 5
 * @typedef {number} Status
 */
exports.Status = {
	READY: 0,
	CONNECTING: 1,
	RECONNECTING: 2,
	IDLE: 3,
	NEARLY: 4,
	DISCONNECTED: 5
}

exports.OPCodes = {
	HELLO: 0,
	HEARTBEAT: 1,
	STATUS_UPDATE: 2
}

exports.Events = {
	CLIENT_READY: "ready",
	USER_JOIN: "userJoin",
	USER_LEAVE: "userLeave",
	USER_UPDATE: "userUpdate",
	MESSAGE: "message",
	NOTE_PLAY: "note",

	DEBUG: "debug"
}

/**
 * The type of a websocket message event, e.g `MESSAGE`. Here are the available events:
 * * CLIENT_READY
 * * USER_ADD
 * * USER_LEAVE
 * * USER_UPDATE
 * * MESSAGE
 * * NOTE_PLAY
 * @typedef {string} WSEventType
 */
exports.WSEvents = keyMirror([
	"CLIENT_READY",
	"USER_ADD",
	"USER_LEAVE",
	"USER_UPDATE",
	"MESSAGE",
	"NOTE_PLAY"
]);

function keyMirror(arr) {
	let tmp = Object.create(null);
	for (const value of arr) tmp[value] = value;
	return tmp;
  }