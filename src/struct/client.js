const BaseClient = require("./baseclient");
const WebSocketManager = require("./websocket/websocketmanager");
const { Error, TypeError, RangeError } = require("../errors");
const { Events, DefaultOptions } = require("../util/Constants")

/**
 * The main hub for interacting with MultiplayerPiano, and the starting point for any bot.
 * @extends {BaseClient}
 */
class Client extends BaseClient {
	/**
	 * @param {ClientOptions} [options] Options for the client.
	 */
	constructor(options=DefaultOptions) {
		super();
		
		this._validateOptions();

		/**
		 * The options for the client.
		 * @type {object}
		 */
		this.options = options;

		/**
		 * The WebSocket manager of the client.
		 * @type {WebSocketManager}
		 */
		this.socket = new WebSocketManager(this);

		/**
		 * User that the client is displayed as.
		 * @type {?ClientUser}
		 */
		this.user = null;

		/**
		 * Time at which the client was last regarded as being in the `READY` state.
		 * @type {?Date}
		 */
		this.readyAt = null;
	}

	/**
	 * Timestamp of the time the client was last `READY` at.
	 * @type {?number}
	 * @readonly
	 */
	get readyTimestamp() {
		return this.readyAt ? this.readyAt.getTime() : null;
	}

	/**
	 * The time since the client last entered the `READY` state.
	 * @type {?number}
	 * @readonly
	 */
	get uptime() {
		return this.readyAt ? Date.now() - this.readyAt : null;
	}

	/**
	 * Connects the client, establishing a websocket connection to MultiplayerPiano
	 * @returns {Promise<string>} The client's _id. (TODO)
	 */
	async connect() {
		this.emit(Events.DEBUG, "[CLIENT] Preparing to connect...");

		try {
			await this.socket.connect(this.options.proxy);
			return true;
		} catch(err) {
			//this.destroy();
			console.error(err);
		}
	}

	/**
	 * Disconnects, terminates the connection to MultiplayerPiano, and destroys the client.
	 * @returns {void}
	 */
	destroy() {
		super.destroy();
		this.socket.destroy();
	}

	/**
	 * Get the gateway url. Why not?
	 */
	getGateway() {
		return {url:"ws://www.multiplayerpiano.com"}
	}

	/**
	 * Calls {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval} on a script.
	 * Client is `this`.
	 * @param {string} script The script to evaluate.
	 * @returns {*}
	 * @private
	 */
	_eval(script) {
		return eval(script);
	}

	/**
	 * Validates the client options.
	 * @param {ClientOptions} [options=this.options] Options to validate.
	 * @private
	 */
	_validateOptions(options = this.options) {
		// No validation needed yet.
	}

	/**
	 * Sets the client's username.
	 * @param {string} username The client's username.
	 */
	setUsername(username) {
		return this.socket.sendArray([{m: "userset", set: {"name": username}}]);
	}

	/**
	 * Sends a message into the current room.
	 * @param {string} message The message.
	 */
	sendMessage(message) {
		return this.socket.sendArray([{m: "a", message: message}]);
	}

	/**
	 * Sets the client's room.
	 * @param {string} room The room's name.
	 */
	setRoom(room) {
		return this.socket.sendArray([{m: "ch", _id: room, set: undefined}]);
	}
}

module.exports = Client;

/**
 * Emitted for general warnings.
 * @event Client#warn
 * @param {string} info The warning.
 */

/**
 * Emitted for general debugging information.
 * @event Client#debug
 * @param {string} info The debug information.
 */