/**
 * BetterMPP Client
 * PlutonusDev Aug 2019 ;D
 */

module.exports = {
	BaseClient:	require("./struct/baseclient"),
	Client:		require("./struct/client"),

	Util:		require("./util/Util"),
	util:		require("./util/Util"),

	Version:	require("../package.json").version
};