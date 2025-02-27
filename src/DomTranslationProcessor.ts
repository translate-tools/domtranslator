import { LazyTranslator } from './LazyTranslator';
import { NodeStorage } from './NodeStorage';
import { Translator } from './Translator';
import { nodeExplore } from './utils/nodeExplore';

export class DomTranslationProcessor {
	private isTranslatableNode: (node: Node) => boolean;

	private lazyTranslator: LazyTranslator;
	private nodeStorage: NodeStorage;
	private translator: Translator;

	constructor(
		isTranslatableNode: (node: Node) => boolean,
		lazyTranslator: LazyTranslator,
		nodeStorage: NodeStorage,
		translator: Translator,
	) {
		this.isTranslatableNode = isTranslatableNode;
		this.lazyTranslator = lazyTranslator;
		this.translator = translator;
		this.nodeStorage = nodeStorage;
	}

	public isNodeStorageHas(node: Node) {
		return this.nodeStorage.has(node);
	}

	public getNodeData(node: Node) {
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

	public addNode(node: Node) {
		// Add all nodes which element contains (text nodes and attributes of current and inner elements)
		if (node instanceof Element) {
			this.handleTree(node, (node) => {
				if (node instanceof Element) return;

				if (this.isTranslatableNode(node)) {
					this.addNode(node);
				}
			});

			return;
		}

		// Handle text nodes and attributes

		if (this.lazyTranslator.process(node)) {
			return;
		}

		// Add to storage
		this.handleNode(node);
	}

	public deleteNode(node: Node, onlyTarget = false) {
		if (node instanceof Element) {
			// Delete all attributes and inner nodes
			if (!onlyTarget) {
				this.handleTree(node, (node) => {
					this.deleteNode(node, true);
				});
			}

			// Unobserve
			this.lazyTranslator.disable(node);
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
