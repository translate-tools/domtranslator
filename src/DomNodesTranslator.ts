import { NodeStorage } from './NodeStorage';
import { handleTree } from './utils/handleTree';
import { isInViewport } from './utils/isInViewport';
import { TranslatableNodePredicate, TranslatorInterface } from '.';

/**
 * Class DomNodesTranslator responsible for translating DOM nodes
 */
export class DomNodesTranslator {
	constructor(
		private isTranslatableNode: TranslatableNodePredicate,
		private nodeStorage: NodeStorage,
		private readonly translateCallback: TranslatorInterface,
	) {}

	public isNodeStorageHas(node: Node) {
		return this.nodeStorage.has(node);
	}

	public getOriginalNodeText(node: Node) {
		const nodeData = this.nodeStorage.get(node);

		return nodeData ? { originalText: nodeData.originalText } : null;
	}

	public addNode = (node: Node) => {
		if (this.isNodeStorageHas(node)) return;

		// Skip empty text
		if (node.nodeValue === null || node.nodeValue.trim().length == 0) return;

		// Skip not translatable nodes
		if (!this.isTranslatableNode(node)) return;

		this.nodeStorage.add(node, this.getNodePriority(node));

		this.translateNode(node);
	};

	public deleteNode(node: Node, onlyTarget = false) {
		if (node instanceof Element && !onlyTarget) {
			// Delete all attributes and inner nodes
			handleTree(node, (node) => {
				this.deleteNode(node, true);
			});
		}

		this.nodeStorage.delete(node);
	}

	// Updates never be lazy
	public updateNode(node: Node) {
		// update only if the node is in storage
		if (!this.nodeStorage.get(node)) return;

		this.nodeStorage.update(node);
		this.translateNode(node);
	}

	/**
	 * Calculate node priority for translate, the bigger number the importance text
	 */
	private getNodePriority = (node: Node) => {
		let score = 0;

		if (node instanceof Attr) {
			score += 1;
			const parent = node.ownerElement;
			if (parent && isInViewport(parent)) {
				// Attribute of visible element is important than text of non-visible element
				score += 2;
			}
		} else if (node instanceof Text) {
			score += 2;
			const parent = node.parentElement;
			if (parent && isInViewport(parent)) {
				// Text of visible element is most important node for translation
				score += 2;
			}
		}

		return score;
	};

	/**
	 * Call only for new and updated nodes
	 */
	private translateNode(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (!nodeData) {
			throw new Error('Node is not register');
		}

		if (node.nodeValue === null) return;

		// Recursion prevention
		if (nodeData.updateId <= nodeData.translateContext) {
			return;
		}

		const nodeId = nodeData.id;
		const nodeContext = nodeData.updateId;
		return this.translateCallback(node.nodeValue, nodeData.priority).then((text) => {
			const actualNodeData = this.nodeStorage.get(node);
			if (!actualNodeData || nodeId !== actualNodeData.id) {
				return;
			}
			if (nodeContext !== actualNodeData.updateId) {
				return;
			}

			// actualNodeData.translateData = text;
			actualNodeData.originalText = node.nodeValue !== null ? node.nodeValue : '';
			actualNodeData.translateContext = actualNodeData.updateId + 1;
			node.nodeValue = text;
			return node;
		});
	}
}
