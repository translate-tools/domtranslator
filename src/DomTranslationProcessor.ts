import { NodeStorage } from './NodeStorage';
import { Translator } from './Translator';
import { nodeExplore } from './utils/nodeExplore';

type IsTranslatableNode = (node: Node) => boolean;

export class DomTranslationProcessor {
	private isTranslatableNode: IsTranslatableNode;

	private nodeStorage: NodeStorage;

	private translator: Translator;

	constructor(
		isTranslatableNode: IsTranslatableNode,
		nodeStorage: NodeStorage,
		translator: Translator,
	) {
		this.isTranslatableNode = isTranslatableNode;
		this.nodeStorage = nodeStorage;
		this.translator = translator;
	}

	public isNodeStorageHas(node: Node) {
		return this.nodeStorage.has(node);
	}

	public getOriginalNodeText(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData === undefined) return null;

		const { originalText } = nodeData;
		return { originalText };
	}

	public handleNode = (node: Node) => {
		if (this.isNodeStorageHas(node)) return;

		// Skip empthy text
		if (node.nodeValue === null || node.nodeValue.trim().length == 0) return;

		// Skip not translatable nodes
		if (!this.isTranslatableNode(node)) return;

		const priority = this.translator.getNodePriority(node);

		this.nodeStorage.add(node, priority);

		const nodeData = this.nodeStorage.get(node);
		if (nodeData === undefined) {
			throw new Error('Node is not register');
		}
		this.translator.translateNode(node, nodeData);
	};

	public processNodesInElement(element: Element, callback: (node: Node) => void) {
		this.handleTree(element, (node) => {
			if (node instanceof Element) return;

			if (this.isTranslatableNode(node)) {
				callback(node);
			}
		});
	}

	public deleteNode(node: Node, onlyTarget = false) {
		if (node instanceof Element) {
			// Delete all attributes and inner nodes
			if (!onlyTarget) {
				this.handleTree(node, (node) => {
					this.deleteNode(node, true);
				});
			}
		}

		this.nodeStorage.delete(node);
	}

	// Updates never be lazy
	public updateNode(node: Node) {
		const nodeData = this.nodeStorage.get(node);

		if (nodeData !== undefined) {
			this.nodeStorage.update(node);

			this.translator.translateNode(node, nodeData);
		}
	}

	/**
	 * Handle all translatable nodes from element
	 * Element, Attr, Text
	 */
	private handleTree(node: Element, callback: (node: Node) => void) {
		nodeExplore(node, NodeFilter.SHOW_ALL, true, (node) => {
			callback(node);

			if (node instanceof Element) {
				// Handle nodes from opened shadow DOM
				if (node.shadowRoot !== null) {
					for (const child of Array.from(node.shadowRoot.children)) {
						this.handleTree(child, callback);
					}
				}

				// Handle attributes of element
				for (const attribute of Object.values(node.attributes)) {
					callback(attribute);
				}
			}
		});
	}
}
