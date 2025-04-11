import { NodeStorage } from '../NodeStorage';

describe('NodeStorage', () => {
	let div: Node;
	let div1: Node;

	beforeEach(() => {
		div = document.createElement('div');
		div.textContent = 'Hello world!';
		div1 = document.createElement('div');
	});

	test('return correct value for a node that is not added', () => {
		const nodeStorage = new NodeStorage();

		expect(nodeStorage.has(div)).toBe(false);
		expect(nodeStorage.get(div)).toBeNull();
	});

	test('add a node to storage', () => {
		const nodeStorage = new NodeStorage();

		nodeStorage.add(div, 1);

		expect(nodeStorage.has(div)).toBe(true);
		expect(nodeStorage.get(div)).toEqual(
			expect.objectContaining({
				id: 0,
				originalText: null,
				priority: 1,
				translateContext: 0,
				updateId: 1,
			}),
		);
	});

	test('can not add the same node twice', () => {
		const nodeStorage = new NodeStorage();

		nodeStorage.add(div, 1);
		nodeStorage.add(div, 1);

		expect(nodeStorage.get(div)).toEqual(
			expect.objectContaining({
				id: 0,
			}),
		);
	});

	test('increase id counter after add new node', () => {
		const nodeStorage = new NodeStorage();

		nodeStorage.add(div, 1);
		nodeStorage.add(div1, 1);

		expect(nodeStorage.get(div1)).toEqual(
			expect.objectContaining({
				id: 1,
			}),
		);
	});

	test('increase updateId after update a node', () => {
		const nodeStorage = new NodeStorage();

		nodeStorage.add(div, 1);
		nodeStorage.update(div);

		expect(nodeStorage.get(div)).toEqual(
			expect.objectContaining({
				updateId: 2,
			}),
		);
	});

	test('remove node from storage', () => {
		const nodeStorage = new NodeStorage();

		nodeStorage.add(div, 1);
		nodeStorage.delete(div);

		expect(nodeStorage.get(div)).toBeNull();
	});
});
