const EventEmitter = require("events");
const Util = require("../../util/Util");
const { Events, Status, WSEvents } = require("../../util/Constants");
const { Error: MPPError } = require("../../errors");
const WebSocket = require("ws");
const ProxyAgent = require("https-proxy-agent");

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

		/**
		 * The websocket client's connection attempts.
		 * @type {number}
		 * @private
		 */
		this.connectionAttempts = 0;

		this.serverTimeOffset = 0;

		this.handleEvents();
	}

	/**
	 * Handles client socket events.
	 */
	handleEvents() {
		this.on("p", msg => {
			this.client.emit(Events.USER_JOIN);
		});
		this.on("bye", msg => {
			this.client.emit(Events.USER_LEAVE, msg.p);
		});
		this.on("hi", msg => {
			this.debug("HI");
			this.client.emit("hi");
			this.handleServerTime(msg.t, msg.e || undefined)
		});
		this.on("t", msg => {
			this.debug("T :(");
			this.handleServerTime(msg.t, msg.e || undefined)
		});
	}

	/**
	 * Emits a debug message.
	 * @param {string} message The debug message.
	 * @private
	 */
	debug(message) {
		this.client.emit(Events.DEBUG, `[WS => Manager] ${message}`);
	}

	handleServerTime(time, echo) {
		const now = Date.now();
		const target = time - now;
		const duration = 1000;
		let step = 0;
		const steps = 50;
		const step_ms = duration / steps;
		const difference = target - this.serverTimeOffset;
		const inc = difference / steps;
		const iv = this.client.setInterval(() => {
			this.serverTimeOffset += inc;
			if (step++ >= steps) {
				clearInterval(iv);
				this.serverTimeOffset = target;
			}
		}, step_ms);
	}

	/**
	 * Handles socket events.
	 * @private
	 */
	handleSocket() {
		this.socket.once("open", () => {
			this.debug("Socket connected.");
			this.sendArray([{ m: "hi" }]);
			this.client.setInterval(() => {
				this.sendArray([{ m: "t", e: Date.now() }]);
			}, 20000);
			this.client.setInterval(() => {
				this.sendArray([{ m: "n", t: this.serverTimeOffset, n: [] }]);
			}, 200);
			this.client.setRoom("lulwut");
			this.client.setUsername("yeet");
			this.triggerReady();
			this.status = Status.READY;
			this.client.emit(Events.READY);
		});
		this.socket.once("close", e => {
			this.socket.close();
			this.debug("Connection was closed - Code " + e);
			this.status = Status.DISCONNECTED;
			this.reconnect();
		});
		this.socket.on("error", err => {
			this.debug("Socket error :( - " + err);
		});
	}

	/**
	 * Connects this manager to the gateway.
	 * @private
	 */
	async connect() {
		const {
			url: gatewayURL
		} = this.client.getGateway();

		this.debug(`Fetched Gateway Information: ${gatewayURL}/`);

		this.gateway = `${gatewayURL}/`;
		this.debug("Connecting...");
		let agent = null;
		if (this.client.options.proxy && this.client.options.proxy !== "") {
			agent = new ProxyAgent({
				"host": this.client.options.proxy.split(":")[0],
				"port": this.client.options.proxy.split(":")[1]
			});
		}
		this.socket = new WebSocket(this.gateway, {
			"headers": {
				"origin": "http://www.multiplayerpiano.com",
				"user-agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36"
			},
			"agent": agent
		});

		this.socket.on("message", e => {
			let data = JSON.parse(e);
			for (let i = 0; i < data.length; i++) {
				const msg = data[i];
				this.debug(`RECEIVED: ${msg.m}`);
				this.client.emit(msg.m, msg);
			}
		});

		this.handleSocket();
		return this.socket;
	}

	/**
	 * Handles reconnects for this manager.
	 * @private
	 * @returns {Promise<boolean>}
	 */
	async reconnect() {
		if (this.reconnecting || this.status === Status.READY || this.connectionAttempts > 2) return false;
		this.reconnecting = true;
		try {
			this.connectionAttempts++;
			this.debug(`Reconnecting...[${this.connectionAttempts}/3]`);
			this.socket = new WebSocket(this.gateway, {
				"headers": {
					"origin": "http://multiplayerpiano.com",
					"user-agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.85 Safari/537.36"
				}
			});
			this.handleSocket();
			if (this.connectionAttempts === 3) {
				this.client.setTimeout(() => {
					this.destroy();
				}, 1000);
			}
		} catch (err) {
			this.debug(`Couldn't reconnect or fetch gateway information. ${err}`);
			if (err.httpStatus !== 401) {
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
		if (this.destroyed) return;
		this.debug(`Manager was destroyed. Called by:\n${new Error(`MANAGER_DESTROYED`).stack}`);
		this.destroyed = true;
		this.socket.close();
		this.state = Status.DISCONNECTED;
	}

	/**
	 * Processes a packet and queues it if the WebSocketManager is not ready.
	 * @param {Object} [packet] The packet to be handled.
	 * @returns {boolean}
	 * @private
	 */
	handlePacket(packet) {
		if (packet && this.status !== Status.READY) {
			if (!BeforeReadyWhitelist.includes(packet.t)) {
				this.packetQueue.push({ packet });
				return false
			}
		}

		if (this.packetQueue.length) {
			const item = this.packetQueue.shift();
			this.client.setImmediate(() => {
				this.handlePacket(item.packet);
			});
		}

		return true;
	}

	/**
	 * Causes the client to be marked as ready and emits the `READY` event.
	 * @private
	 */
	triggerReady() {
		if (this.status === Status.READY) {
			this.debug("Tried to mark self as READY, but already READY.");
			return;
		}

		this.status = Status.READY;
		this.client.readyAt = new Date();

		/**
		 * Emitted when the client becomes ready to start working.
		 * @event Client#ready
		 */
		this.client.emit(Events.CLIENT_READY);
		this.handlePacket();
	}

	/**
	 * Send data through the websocket.
	 * @param {string} data The data to send.
	 * @returns {boolean}
	 * @private
	 */
	send(data) {
		if (this.status === Status.READY) {
			this.socket.send(data);
		} else return false;
	}

	/**
	 * Send an array through the websocket.
	 * @param {Array<string>} arr The array to send.
	 * @returns {boolean}
	 * @private
	 */
	sendArray(arr) {
		return this.send(JSON.stringify(arr));
	}
}

module.exports = WebSocketManager;