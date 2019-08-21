const { register } = require("./MPPError");

const Messages = {
	INVALID_TYPE: (name, expected, an = false) => `Supplied ${name} is not a${an ? "n" : ""} ${expected}.`,

	WS_NOT_OPEN: (data = "data") => `Websocket not open to send ${data}.`,
	WS_CONNECTION_EXISTS: "There is already an existing WebSocket connection.",
	WS_CLOSE_REQUESTED: "WebSocket closed due to user request.",

	UDP_SEND_FAIL: "Tried to send a UDP packet, but there is no socket available.",
	UDP_ADDRESS_MALFORMED: "Malformed UDP address or port.",
	UDP_CONNECTION_EXISTS: "There is already an existing UDP connection."
}

for (const [name, message] of Object.entries(Messages)) register(name, message);