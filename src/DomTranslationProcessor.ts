import { NodeStorage } from './NodeStorage';
import { isInViewport } from './utils/isInViewport';
import { nodeExplore } from './utils/nodeExplore';
import { TranslatorInterface } from '.';

type IsTranslatableNode = (node: Node) => boolean;

export class DomTranslationProcessor {
	private isTranslatableNode: IsTranslatableNode;
	private nodeStorage: NodeStorage;
	private readonly translateCallback: TranslatorInterface;

	constructor(
		isTranslatableNode: IsTranslatableNode,
		nodeStorage: NodeStorage,
		translateCallback: TranslatorInterface,
	) {
		this.isTranslatableNode = isTranslatableNode;
		this.nodeStorage = nodeStorage;
		this.translateCallback = translateCallback;
	}

	public isNodeStorageHas(node: Node) {
		return this.nodeStorage.has(node);
	}

	public getOriginalNodeText(node: Node) {
		const nodeData = this.nodeStorage.get(node);

		return nodeData ? { originalText: nodeData.originalText } : null;
	}

	public addNode = (node: Node) => {
		if (node instanceof Element) {
			this.processNodesInElement(node, this.addNode);
			return;
		}

		if (this.isNodeStorageHas(node)) return;

		// Skip empthy text
		if (node.nodeValue === null || node.nodeValue.trim().length == 0) return;

		// Skip not translatable nodes
		if (!this.isTranslatableNode(node)) return;

		const priority = this.getNodePriority(node);

		this.nodeStorage.add(node, priority);

		this.translateNode(node);
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
		// update only if the node is in storage
		if (!this.nodeStorage.get(node)) {
			return;
		}

		this.nodeStorage.update(node);
		this.translateNode(node);
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
