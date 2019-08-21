const mpp = require("../src/app");
const client = new mpp.Client();

client.on("debug", msg => {
	console.log(msg);
});

client.on("ready", () => {
	console.log("Client connected!");
	client.setUsername("[ PlutoBot ]")
	client.setRoom("lulwut");
	//setInterval(() => client.setRoom("lulwut"), 5000);
	client.sendMessage("yeet");
});

client.connect();