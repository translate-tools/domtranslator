export interface NodeData {
	/**
	 * Unique node identifier
	 */
	id: number;

	/**
	 * Each node update should increase the value
	 */
	updateId: number;

	/**
	 * Contains `updateId` value at time when start node translation
	 */
	translateContext: number;

	/**
	 * Original node text, before start translation
	 * Contains `null` for node that not been translated yet
	 */
	originalText: null | string;

	/**
	 * Priority to translate node. The bigger the faster will translate
	 */
	priority: number;
}

/**
 * The NodeStorage class encapsulates node storage, manages node metadata
 */

export class NodeStorage {
	private idCounter = 0;
	private nodeStorage = new WeakMap<Node, NodeData>();

	public has(node: Node) {
		return this.nodeStorage.has(node);
	}

	public get(node: Node) {
		return this.nodeStorage.get(node) ?? null;
	}

	public add(node: Node, priority: number) {
		if (this.nodeStorage.has(node)) {
			return;
		}

		this.nodeStorage.set(node, {
			id: this.idCounter++,
			updateId: 1,
			translateContext: 0,
			originalText: null,
			priority,
		});
	}

	public update(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData !== undefined) {
			nodeData.updateId++;
		}
	}

	public delete(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData !== undefined) {
			// Restore original text if text been replaced
			if (nodeData.originalText !== null) {
				node.nodeValue = nodeData.originalText;
			}
			this.nodeStorage.delete(node);
		}
	}
}
