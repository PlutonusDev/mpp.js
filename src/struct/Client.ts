import WebSocket from "ws";
import { EventEmitter } from "events";
import { OPCodes } from "../util/Enums";

export default class MPPClient extends EventEmitter {
	ws: WebSocket | null;

	constructor() {
		super();
		this.ws = null;
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
				for(let i = 0; i < (data.length); i++) {
					const payload: any = data[i];
					if(payload.m === OPCodes.MESSAGE) this.emit("message", {
						content: payload.a,
						author: {
							name: payload.p.name,
							id: payload.p._id
						}
					});
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
