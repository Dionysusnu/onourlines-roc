// @ts-check

export default function benchmark(callback) {
	const startTime = Date.now();
	const value = callback();
	console.log(`Benchmark: Took ${Date.now() - startTime}ms`);
	return value;
}
