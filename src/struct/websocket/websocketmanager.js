const EventEmitter = require("events");
const Util = require("../../util/Util");
const { Events, Status, WSEvents } = require("../../util/Constants");
const { Error: MPPError } = require("../../errors");

/**
 * The WebSocket manager for this client.
 * @extends EventEmitter
 */
class WebSocketManager extends EventEmitter {
	constructor(client) {
		super();

		/**
		 * The client that instantiated this WebSocketManager
		 * @type {Client}
		 * @readonly
		 * @name WebSocketManager#client
		 */
		Object.defineProperty(this, "client", { value: client });

		/**
		 * The gateway this manager uses.
		 * @type {?string}
		 */
		this.gateway = undefined;

		/**
		 * An array of queued events before this WebSocketManager became ready.
		 * @type {object[]}
		 * @private
		 * @name WebSocketManager#packetQueue
		 */
		Object.defineProperty(this, "packetQueue", { value: [] });

		/**
		 * The current status of this WebSocketManager
		 * @type {number}
		 */
		this.status = Status.IDLE;

		/**
		 * If this manager was destroyed. Prevent from reconnecting.
		 * @type {boolean}
		 * @private
		 */
		this.destroyed = false;

		/**
		 * If this manager is currently reconnecting.
		 * @type {boolean}
		 * @private
		 */
		this.reconnecting = false;
	}

	/**
	 * Emits a debug message.
	 * @param {string} message The debug message.
	 * @private
	 */
	debug(message) {
		this.client.emit(Events.DEBUG, `[WS => Manager] ${message}`);
	}

	/**
	 * Connects this manager to the gateway.
	 * @private
	 */
	async connect() {
		const {
			url: gatewayURL
		} = this.client.bot.get();

		this.debug(`Fetched Gateway Information
		  URL: ${gatewayURL}`);
		
		this.gateway = `${gatewayURL}/`;
	}

	/**
	 * Handles reconnects for this manager.
	 * @private
	 * @returns {Promise<boolean>}
	 */
	async reconnect() {
		if(this.reconnecting || this.status !== Status.READY) return false;
		this.reconnecting = true;
		try {
			
		} catch(err) {
			this.debug(`Couldn't reconnect or fetch gateway information. ${err}`);
			if(err.httpStatus !== 401) {
				this.debug(`Possible network error occured. Retrying in 5s...`);
				await Util.delayFor(5000);
				this.reconnecting = false;
				this.reconnect();
			}
		} finally {
			this.reconnecting = false;
		}
		return true;
	}

	/**
	 * Destroys a manager.
	 */
	destroy() {
		if(this.destroyed) return;
		this.debug(`Manager was destroyed. Called by:\n${new Error(`MANAGER_DESTROYED`).stack}`);
		this.destroyed = true;
	}

	/**
	 * Processes a packet and queues it if the WebSocketManager is not ready.
	 * @param {Object} [packet] The packet to be handled.
	 */
}