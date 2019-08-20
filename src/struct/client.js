const BaseClient = require("./baseclient");
const WebSocketManager = require("./websocket/websocketmanager");

/**
 * The main hub for interacting with MultiplayerPiano, and the starting point for any bot.
 * @extends {BaseClient}
 */
class Client extends BaseClient {
	/**
	 * @param {ClientOptions} [options] Options for the client.
	 */
	constructor(options={}) {
		super();
		
		this._validateOptions();

		/**
		 * The WebSocket manager of the client.
		 * @type {WebSocketManager}
		 */
		this.ws = new WebSocketManager(this);

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
	 * @returns {Promise<string>} The client's _id.
	 */
	async connect() {
		this.emit(Events.DEBUG, "Preparing to connect...");

		try {
			await this.ws.connect();
			return "um";
		} catch(err) {
			this.destroy();
			throw err;
		}
	}

	/**
	 * Disconnects, terminates the connection to MultiplayerPiano, and destroys the client.
	 * @returns {void}
	 */
	destroy() {
		super.destroy();
		this.ws.destroy();
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