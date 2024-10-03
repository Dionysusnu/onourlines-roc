// @ts-check

const digits = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const whitespace = new Set([
	32, // 0x20, space
	9, // 0x09, tab
	10, // 0x0A, LF
	13, // 0x0D, CR
]);
const markerSymbol = Symbol("DuplicateKeyArray");
/**
 * Duplicates will be joined into an array
 * @param {string} input
 */
export default function parseJsonDuplicateKeys(input) {
	function throwError(i, message) {
		const inputUntilError = input.slice(0, i);
		const lineNumber = (inputUntilError.match("\n") ?? []).length + 1;
		const lastLinebreak = inputUntilError.lastIndexOf("\n");
		const column = i - lastLinebreak;
		throw new Error(`${message} at line ${lineNumber}:${column}`);
	}

	function throwUnexpectedToken(i) {
		throwError(i, `Unexpected token \`${input[i]}\``);
	}

	let i = 0;
	function read() {
		if (i === input.length) throw new Error("Unexpected end of input");
		return input[i++];
	}
	function readMultiple(n) {
		let string = "";
		for (let i = 0; i < n; i++) string += read();
		return string;
	}
	function peek() {
		return input[i];
	}

	function isWhitespace(char) {
		return whitespace.has(char?.charCodeAt(0));
	}
	function skipWhitespace() {
		while (isWhitespace(peek())) read();
	}

	function readNumberExponent(number) {
		if (peek() === "e" || peek() === "E") {
			number += read();
			if (peek() === "-" || peek() === "+") {
				number += read();
			}
			while (digits.has(peek())) {
				number += read();
			}
		}
		const num = Number(number);
		if (num !== num) {
			throwError(i, "Malformed number");
		}
		return num;
	}
	function readNumberFraction(number) {
		if (peek() === ".") {
			number += read();
			const firstDigit = read();
			if (!digits.has(firstDigit)) throwUnexpectedToken(i);
			number += firstDigit;
			while (digits.has(peek())) {
				number += read();
			}
		}
		return readNumberExponent(number);
	}
	function readNumber0() {
		read();
		return readNumberFraction("0");
	}
	function readNumberNegative() {
		read();
		if (peek() === "0") {
			read();
			return readNumberFraction("-0");
		} else if (!digits.has(peek())) {
			throwUnexpectedToken(i);
		} else {
			return readNumber("-");
		}
	}
	function readNumber(number) {
		while (digits.has(peek())) {
			number += read();
		}
		return readNumberFraction(number);
	}

	function readFalse() {
		if (read() !== "f") throwUnexpectedToken(i - 1);
		if (read() !== "a") throwUnexpectedToken(i - 1);
		if (read() !== "l") throwUnexpectedToken(i - 1);
		if (read() !== "s") throwUnexpectedToken(i - 1);
		if (read() !== "e") throwUnexpectedToken(i - 1);
		return false;
	}
	function readTrue() {
		if (read() !== "t") throwUnexpectedToken(i - 1);
		if (read() !== "r") throwUnexpectedToken(i - 1);
		if (read() !== "u") throwUnexpectedToken(i - 1);
		if (read() !== "e") throwUnexpectedToken(i - 1);
		return true;
	}
	function readNull() {
		if (read() !== "n") throwUnexpectedToken(i - 1);
		if (read() !== "u") throwUnexpectedToken(i - 1);
		if (read() !== "l") throwUnexpectedToken(i - 1);
		if (read() !== "l") throwUnexpectedToken(i - 1);
		return null;
	}

	function readString() {
		read();
		let string = "";
		while (true) {
			const char = read();
			if (char === "\\") {
				const escaped = read();
				switch (escaped) {
					case '"':
					case "\\":
					case "/":
						string += escaped;
						break;
					case "b":
						string += "\b";
						break;
					case "f":
						string += "\f";
						break;
					case "n":
						string += "\n";
						break;
					case "r":
						string += "\r";
						break;
					case "t":
						string += "\t";
						break;
					case "u":
						const charCode = parseInt(readMultiple(4), 16);
						if (charCode !== charCode)
							throwError(i - 6, "Invalid escape sequence");
						string += String.fromCharCode(charCode);
						break;
					default:
						throwError(i - 1, "Invalid escaped character");
				}
			} else if (char === '"') {
				return string;
			} else {
				if (char.charCodeAt(0) < 32) {
					throwError(
						i - 1,
						"Invalid character (needs to be escaped)"
					);
				}
				string += char;
			}
		}
	}

	function readObjectItem(object) {
		const key = readString();
		skipWhitespace();
		if (read() !== ":") {
			throwError(i - 1, "Expected token `:`");
		}
		const element = readElement();
		if (key in object) {
			if (object[key][markerSymbol]) {
				object[key].push(element);
			} else {
				object[key] = [object[key], element];
				Object.defineProperty(object[key], markerSymbol, {
					value: true,
					enumerable: false,
				});
			}
		} else {
			object[key] = element;
		}
		const char = read();
		if (char === ",") {
			skipWhitespace();
			readObjectItem(object);
		} else if (char === "}") {
			return;
		} else {
			throwUnexpectedToken(i - 1);
		}
	}
	function readObject() {
		read();
		skipWhitespace();
		if (peek() === "}") {
			read();
			return {};
		} else if (peek() === '"') {
			const object = {};
			readObjectItem(object);
			return object;
		} else {
			throwUnexpectedToken(i);
		}
	}

	function readArrayItem(array) {
		array.push(readElement());
		const char = read();
		if (char === ",") {
			readArrayItem(array);
		} else if (char === "]") {
			return;
		} else {
			throwUnexpectedToken(i - 1);
		}
	}

	function readArray() {
		read();
		skipWhitespace();
		if (peek() === "]") {
			read();
			return [];
		} else {
			const array = [];
			readArrayItem(array);
			return array;
		}
	}

	function readValue() {
		switch (peek()) {
			case "-":
				return readNumberNegative();
			case "0":
				return readNumber0();
			case "1":
			case "2":
			case "3":
			case "4":
			case "5":
			case "6":
			case "7":
			case "8":
			case "9":
				return readNumber("");
			case "f":
				return readFalse();
			case "n":
				return readNull();
			case "t":
				return readTrue();
			case '"':
				return readString();
			case "{":
				return readObject();
			case "[":
				return readArray();
			default:
				throwUnexpectedToken(i);
		}
	}
	function readElement() {
		skipWhitespace();
		const item = readValue();
		skipWhitespace();
		return item;
	}

	const value = readElement();
	if (i !== input.length) throwError(i, "Expected end of input");
	return value;
}
