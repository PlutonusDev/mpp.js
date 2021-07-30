import WebSocket from "ws";
import { EventEmitter } from "events";
import { OPCodes } from "../util/Enums";

export default class MPPClient extends EventEmitter {
	ws: WebSocket | null;
	users: Map<string, any>;

	constructor() {
		super();
		this.ws = null;
		this.users = new Map();
		return this;
	}

	start(token: string) {
		this.ws = new WebSocket("wss://mppclone.com:8443", {
			origin: "https://www.multiplayerpiano.com"
		});

		this.ws!.on("open", async () => {
			await this._sendPayload([{
				m: OPCodes.ESTABLISH,
				token: token
			}]);

			this.emit("ready");

			setInterval(() => this._sendPayload([{
				m: OPCodes.HEARTBEAT,
				e: Date.now()
			}]), 20000);
		});

		this.ws!.on("message", (raw: string[]) => {
			let data = JSON.parse(raw.toString());
			data.map((payload: any) => payload.m !== OPCodes.NOTE && payload.m !== OPCodes.POINTER);
			if(data) {
				this.emit("data", `Received: '${JSON.stringify(data)}'`);
				for(let i = 0; i < data.length; i++) {
					const payload: any = data[i];
					if(payload.m === OPCodes.CHANNEL) {
						for(let j = 0; j < payload.ppl.length; j++) {
							this.users.set(payload.ppl[j]._id, {
								name: payload.ppl[j].name,
								type: payload.ppl[j].tag || "user"
							});
						}
					}

					if(payload.m === OPCodes.MESSAGE) {
						let p = this.users.get(payload.p._id);

						return this.emit("message", {
							content: payload.a,
							author: {
								name: payload.p.name,
								id: payload.p._id,
								type: p.type
							}
						});
					}

					if(payload.m === OPCodes.USER_JOIN) {
						let p = this.users.get(payload._id);
						if(p) return this.emit("userUpdate", {
							name: payload.name,
							type: payload.tag || "user"
						});

						this.users.set(payload._id, {
							name: payload.name,
							type: payload.tag || "user"
						});

						return this.emit("userAdd", {
							id: payload._id,
							name: payload.name,
							type: payload.tag || "user"
						});
					}

					if(payload.m === OPCodes.USER_LEAVE) {
						let p = this.users.get(payload.p);
						this.users.delete(payload.p);

						return this.emit("userRemove", {
							id: payload.p,
							name: p.name,
							type: p.type
						});
					}
				}
			}
		});

		this.ws!.on("error", e => {
			this.emit("debug", `WebSocket Error! "${e.message}"`);
		});
	}

	private _isConnected() {
		return this.ws!.readyState === 1;
	}

	private _sendPayload(data: string | any[any]) {
		return new Promise(async (res) => {
			this.emit("debug", this._isConnected() ? `Payload sent with information ${typeof data == "string" ? `"${data}"` : JSON.stringify(data)}` : `Tried to send payload with information ${typeof data === "string" ? `"${data}"` : JSON.stringify(data)} without being connected.`);
			if(!this._isConnected()) return;
			if(typeof data === "string") {
				await this.ws!.send(data);
			} else {
				await this.ws!.send(JSON.stringify(data));
			}
			res(true);
		});
	}

	async setRoom(roomName: string = "lobby") {
		return new Promise(async (res) => {
			await this._sendPayload([{
				m: OPCodes.CHANNEL,
				_id: roomName,
				set: undefined
			}]);
			res(true);
		});
	}

	setUsername(userName: string = "Anonymous") {
		return new Promise(async (res) => {
			await this._sendPayload([{
				m: OPCodes.USER,
				set: {
					name: userName
				}
			}]);
			res(true);
		});
	}

	chat(message: string) {
		return new Promise(async (res) => {
			if(!message) return new Error("Cannot send an empty message.");
			await this._sendPayload([{
				m: OPCodes.MESSAGE,
				message: message
			}]);
			res(true);
		});
	}
}
