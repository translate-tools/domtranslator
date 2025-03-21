import { NodeStorage } from '../NodeStorage';

describe('NodeStorage', () => {
	let nodeStorage: NodeStorage;
	let div: Node;
	let div1: Node;

	beforeEach(() => {
		nodeStorage = new NodeStorage();

		div = document.createElement('div');
		div.textContent = 'Hello world!';
		div1 = document.createElement('div');
	});

	test('return correct value for a node that is not added', () => {
		expect(nodeStorage.has(div)).toBe(false);
		expect(nodeStorage.get(div)).toBeNull();
	});

	test('add a node to storage', () => {
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
		nodeStorage.add(div, 1);
		nodeStorage.add(div, 1);

		expect(nodeStorage.get(div)).toEqual(
			expect.objectContaining({
				id: 0,
			}),
		);
	});

	test('increase id counter when adding new node', () => {
		nodeStorage.add(div, 1);
		nodeStorage.add(div1, 1);

		expect(nodeStorage.get(div1)).toEqual(
			expect.objectContaining({
				id: 1,
			}),
		);
	});

	test('increase updateId when updating a node', () => {
		nodeStorage.add(div, 1);
		nodeStorage.update(div);

		expect(nodeStorage.get(div)).toEqual(
			expect.objectContaining({
				updateId: 2,
			}),
		);
	});

	test('remove node from storage', () => {
		nodeStorage.add(div, 1);
		nodeStorage.delete(div);

		expect(nodeStorage.get(div)).toBeNull();
	});

	test('not throw if deleting a non-existent node', () => {
		expect(() => nodeStorage.delete(div)).not.toThrow();
	});
});
