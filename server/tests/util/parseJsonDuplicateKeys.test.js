import parseJsonDuplicateKeys from "../../src/util/parseJsonDuplicateKeys";

test("Should parse literals", () => {
	expect(parseJsonDuplicateKeys('{"a":true}')).toMatchObject({ a: true });
	expect(parseJsonDuplicateKeys('{"a":false}')).toMatchObject({ a: false });

	expect(parseJsonDuplicateKeys('{"a":""}')).toMatchObject({ a: "" });
	expect(parseJsonDuplicateKeys('{"a":"str"}')).toMatchObject({ a: "str" });

	expect(parseJsonDuplicateKeys('{"a":0}')).toMatchObject({ a: 0 });
	expect(parseJsonDuplicateKeys('{"a":1}')).toMatchObject({ a: 1 });
	expect(parseJsonDuplicateKeys('{"a":-1}')).toMatchObject({ a: -1 });

	expect(parseJsonDuplicateKeys('{"a":null}')).toMatchObject({ a: null });
});

test("Should parse flat objects", () => {
	expect(parseJsonDuplicateKeys('{"a":true,"b": false}')).toMatchObject({
		a: true,
		b: false,
	});
	expect(parseJsonDuplicateKeys('{"a":0,"b":1,"c":-1}')).toMatchObject({
		a: 0,
		b: 1,
		c: -1,
	});
});

test("Should parse nested objects", () => {
	expect(parseJsonDuplicateKeys('{"a":{"b": true}}')).toMatchObject({
		a: { b: true },
	});
	expect(parseJsonDuplicateKeys('{"a":false,"b":{"c":1}}')).toMatchObject({
		a: false,
		b: { c: 1 },
	});
});

test("Should parse duplicate keys", () => {
	expect(parseJsonDuplicateKeys('{"b":0,"b":1,"b":-1}')).toMatchObject({
		b: [0, 1, -1],
	});
	expect(parseJsonDuplicateKeys('{"b":{},"b":1,"b":false}')).toMatchObject({
		b: [{}, 1, false],
	});
	expect(
		parseJsonDuplicateKeys('{"a":{"c":"str1","c":"str2"},"b":1,"b":-1}')
	).toMatchObject({
		a: {
			c: ["str1", "str2"],
		},
		b: [1, -1],
	});
	expect(
		parseJsonDuplicateKeys('{"b":{"c":"str1","c":"str2"},"b":1,"b":false}')
	).toMatchObject({
		b: [{ c: ["str1", "str2"] }, 1, false],
	});
	expect(parseJsonDuplicateKeys('{"b":[1],"b":[2],"b":[3]}')).toMatchObject({
		b: [[1], [2], [3]],
	});
});
