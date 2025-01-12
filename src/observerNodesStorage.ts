import { IDecorateNodes } from './DecorateNodes';
import { XMutationObserver } from './lib/XMutationObserver';

export class NodeObserver {
	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();

	private nodesManager: IDecorateNodes;

	constructor(nodes: IDecorateNodes) {
		this.nodesManager = nodes;
	}

	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and childs changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) =>
			this.nodesManager.addNode(target),
		);
		observer.addHandler('elementRemoved', ({ target }) =>
			this.nodesManager.deleteNode(target),
		);
		observer.addHandler('characterData', ({ target }) => {
			this.nodesManager.updateNode(target);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.nodesManager.isNodeStorageHas(attribute)) {
				this.nodesManager.addNode(attribute);
			} else {
				this.nodesManager.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.nodesManager.addNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.nodesManager.deleteNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}
}
