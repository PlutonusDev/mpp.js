const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObject = d => typeof d === 'object' && d !== null;
const { parse } = require("path");

/**
 * Contains various general-purpose utility methods. These functions are also available on the base `BetterMPP` object.
 */
class Util {
	constructor() {
		throw new Error(`The ${this.constructor.name} class may not be instantiated.`)
	}

	/**
   * Flatten an object. Any properties that are collections will get converted to an array of keys.
   * @param {Object} obj The object to flatten.
   * @param {...Object<string, boolean|string>} [props] Specific properties to include/exclude.
   * @returns {Object}
   */
	static flatten(obj, ...props) {
		if (!isObject(obj)) return obj;

		props = Object.assign(...Object.keys(obj).filter(k => !k.startsWith('_')).map(k => ({ [k]: true })), ...props);

		const out = {};

		for (let [prop, newProp] of Object.entries(props)) {
			if (!newProp) continue;
			newProp = newProp === true ? prop : newProp;

			const element = obj[prop];
			const elemIsObj = isObject(element);
			const valueOf = elemIsObj && typeof element.valueOf === 'function' ? element.valueOf() : null;

			// If it's a collection, make the array of keys
			if (element instanceof require('./Collection')) out[newProp] = Array.from(element.keys());
			// If it's an array, flatten each element
			else if (Array.isArray(element)) out[newProp] = element.map(e => Util.flatten(e));
			// If it's an object with a primitive `valueOf`, use that value
			else if (typeof valueOf !== 'object') out[newProp] = valueOf;
			// If it's a primitive
			else if (!elemIsObj) out[newProp] = element;
		}

		return out;
	}

	/**
	 * Splits a string into multiple chunks at a designated character that do not exceed a specific length.
	 * @param {StringResolvable} text Content to split
	 * @param {SplitOptions} [options] Options controlling the behavior of the split
	 * @returns {string[]}
	 */
	static splitMessage(text, { maxLength = 2000, char = '\n', prepend = '', append = '' } = {}) {
		text = this.resolveString(text);
		if (text.length <= maxLength) return [text];
		const splitText = text.split(char);
		if (splitText.some(chunk => chunk.length > maxLength)) throw new RangeError('SPLIT_MAX_LEN');
		const messages = [];
		let msg = '';
		for (const chunk of splitText) {
			if (msg && (msg + char + chunk + append).length > maxLength) {
				messages.push(msg + append);
				msg = prepend;
			}
			msg += (msg && msg !== prepend ? char : '') + chunk;
		}
		return messages.concat(msg).filter(m => m);
	}

	/**
   * Shallow-copies an object with its class/prototype intact.
   * @param {Object} obj Object to clone
   * @returns {Object}
   * @private
   */
	static cloneObject(obj) {
		return Object.assign(Object.create(obj), obj);
	}

	/**
	 * Sets default properties on an object that aren't already specified.
	 * @param {Object} def Default properties
	 * @param {Object} given Object to assign defaults to
	 * @returns {Object}
	 * @private
	 */
	static mergeDefault(def, given) {
		if (!given) return def;
		for (const key in def) {
			if (!has(given, key) || given[key] === undefined) {
				given[key] = def[key];
			} else if (given[key] === Object(given[key])) {
				given[key] = Util.mergeDefault(def[key], given[key]);
			}
		}

		return given;
	}

	/**
	 * Converts an ArrayBuffer or string to a Buffer.
	 * @param {ArrayBuffer|string} ab ArrayBuffer to convert
	 * @returns {Buffer}
	 * @private
	 */
	static convertToBuffer(ab) {
		if (typeof ab === 'string') ab = Util.str2ab(ab);
		return Buffer.from(ab);
	}

	/**
	 * Converts a string to an ArrayBuffer.
	 * @param {string} str String to convert
	 * @returns {ArrayBuffer}
	 * @private
	 */
	static str2ab(str) {
		const buffer = new ArrayBuffer(str.length * 2);
		const view = new Uint16Array(buffer);
		for (var i = 0, strLen = str.length; i < strLen; i++) view[i] = str.charCodeAt(i);
		return buffer;
	}

	/**
	 * Makes an Error from a plain info object.
	 * @param {Object} obj Error info
	 * @param {string} obj.name Error type
	 * @param {string} obj.message Message for the error
	 * @param {string} obj.stack Stack for the error
	 * @returns {Error}
	 * @private
	 */
	static makeError(obj) {
		const err = new Error(obj.message);
		err.name = obj.name;
		err.stack = obj.stack;
		return err;
	}

	/**
	 * Makes a plain error info object from an Error.
	 * @param {Error} err Error to get info from
	 * @returns {Object}
	 * @private
	 */
	static makePlainError(err) {
		return {
			name: err.name,
			message: err.message,
			stack: err.stack,
		};
	}

	/**
	 * Moves an element in an array *in place*.
	 * @param {Array<*>} array Array to modify
	 * @param {*} element Element to move
	 * @param {number} newIndex Index or offset to move the element to
	 * @param {boolean} [offset=false] Move the element by an offset amount rather than to a set index
	 * @returns {number}
	 * @private
	 */
	static moveElementInArray(array, element, newIndex, offset = false) {
		const index = array.indexOf(element);
		newIndex = (offset ? index : 0) + newIndex;
		if (newIndex > -1 && newIndex < array.length) {
			const removedElement = array.splice(index, 1)[0];
			array.splice(newIndex, 0, removedElement);
		}
		return array.indexOf(element);
	}

	/**
	 * Data that can be resolved to give a string. This can be:
	 * * A string
	 * * An array (joined with a new line delimiter to give a string)
	 * * Any value
	 * @typedef {string|Array|*} StringResolvable
	 */

	/**
	 * Resolves a StringResolvable to a string.
	 * @param {StringResolvable} data The string resolvable to resolve
	 * @returns {string}
	 */
	static resolveString(data) {
		if (typeof data === 'string') return data;
		if (Array.isArray(data)) return data.join('\n');
		return String(data);
	}

	/**
   * Alternative to Node's `path.basename`, removing query string after the extension if it exists.
   * @param {string} path Path to get the basename of
   * @param {string} [ext] File extension to remove
   * @returns {string} Basename of the path
   * @private
   */
	static basename(path, ext) {
		let res = parse(path);
		return ext && res.ext.startsWith(ext) ? res.name : res.base.split('?')[0];
	}

	/**
   * Creates a Promise that resolves after a specified duration.
   * @param {number} ms How long to wait before resolving (in milliseconds)
   * @returns {Promise<void>}
   * @private
   */
	static delayFor(ms) {
		return new Promise(resolve => {
			setTimeout(resolve, ms);
		});
	}
}

module.exports = Util;