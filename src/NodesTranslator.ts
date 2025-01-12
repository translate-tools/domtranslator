import { XMutationObserver } from './lib/XMutationObserver';
import { isInViewport } from './utils/isInViewport';
import { nodeExplore } from './utils/nodeExplore';
import { configureTranslatableNodePredicate } from './utils/nodes';

interface NodeData {
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

type TranslatorInterface = (text: string, priority: number) => Promise<string>;

interface InnerConfig {
	isTranslatableNode: (node: Node) => boolean;
	lazyTranslate: boolean;
}

export interface Config {
	isTranslatableNode?: (node: Node) => boolean;
	lazyTranslate?: boolean;
}

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

/**
 * Module for dynamic translate a DOM nodes
 */
export class NodesTranslator {
	private readonly translateCallback: TranslatorInterface;
	private readonly config: InnerConfig;

	constructor(translateCallback: TranslatorInterface, config?: Config) {
		this.translateCallback = translateCallback;
		this.config = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};
	}

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();
	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and childs changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) => this.addNode(target));
		observer.addHandler('elementRemoved', ({ target }) => this.deleteNode(target));
		observer.addHandler('characterData', ({ target }) => {
			this.updateNode(target);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.nodeStorage.has(attribute)) {
				this.addNode(attribute);
			} else {
				this.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.addNode(node);
	}

	public unobserve(node: Element) {
		if (!this.observedNodesStorage.has(node)) {
			throw new Error('Node is not under observe');
		}

		this.deleteNode(node);
		this.observedNodesStorage.get(node)?.disconnect();
		this.observedNodesStorage.delete(node);
	}

	public getNodeData(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData === undefined) return null;

		const { originalText } = nodeData;
		return { originalText };
	}

	private readonly itersectStorage = new WeakSet<Node>();
	private readonly itersectObserver = new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;
				if (!this.itersectStorage.has(node) || !entry.isIntersecting) return;

				this.itersectStorage.delete(node);
				observer.unobserve(node);
				this.intersectNode(node);
			});
		},
		{ root: null, rootMargin: '0px', threshold: 0 },
	);

	private intersectNode = (node: Element) => {
		// Translate child text nodes and attributes of target node
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		node.childNodes.forEach((node) => {
			if (node instanceof Element || !this.isTranslatableNode(node)) return;
			this.handleNode(node);
		});
	};

	private handleElementByIntersectViewport(node: Element) {
		if (this.itersectStorage.has(node)) return;
		this.itersectStorage.add(node);
		this.itersectObserver.observe(node);
	}

	private idCounter = 0;
	private nodeStorage = new WeakMap<Node, NodeData>();
	private handleNode = (node: Node) => {
		if (this.nodeStorage.has(node)) return;

		// Skip empthy text
		if (node.nodeValue === null || node.nodeValue.trim().length == 0) return;

		// Skip not translatable nodes
		if (!this.isTranslatableNode(node)) return;

		const priority = this.getNodeScore(node);

		this.nodeStorage.set(node, {
			id: this.idCounter++,
			updateId: 1,
			translateContext: 0,
			originalText: null,
			priority,
		});

		this.translateNode(node);
	};

	private addNode(node: Node) {
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

		// Lazy translate when own element intersect viewport
		// But translate at once if node have not parent (virtual node) or parent node is outside of body (utility tags like meta or title)
		if (this.config.lazyTranslate) {
			const isAttachedToDOM = node.getRootNode() !== node;
			const observableNode =
				node instanceof Attr ? node.ownerElement : node.parentElement;

			// Ignore lazy translation for not intersectable nodes and translate it immediately
			if (
				isAttachedToDOM &&
				observableNode !== null &&
				this.isIntersectableNode(observableNode)
			) {
				this.handleElementByIntersectViewport(observableNode);
				return;
			}
		}

		// Add to storage
		this.handleNode(node);
	}

	private deleteNode(node: Node, onlyTarget = false) {
		if (node instanceof Element) {
			// Delete all attributes and inner nodes
			if (!onlyTarget) {
				this.handleTree(node, (node) => {
					this.deleteNode(node, true);
				});
			}

			// Unobserve
			this.itersectStorage.delete(node);
			this.itersectObserver.unobserve(node);
		}

		const nodeData = this.nodeStorage.get(node);
		if (nodeData !== undefined) {
			// Restore original text if text been replaced
			if (nodeData.originalText !== null) {
				node.nodeValue = nodeData.originalText;
			}
			this.nodeStorage.delete(node);
		}
	}

	// Updates never be lazy
	private updateNode(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData !== undefined) {
			nodeData.updateId++;
			this.translateNode(node);
		}
	}

	/**
	 * Call only for new and updated nodes
	 */
	private translateNode(node: Node) {
		const nodeData = this.nodeStorage.get(node);
		if (nodeData === undefined) {
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
			if (actualNodeData === undefined || nodeId !== actualNodeData.id) {
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

	private isTranslatableNode(targetNode: Node) {
		return this.config.isTranslatableNode(targetNode);
	}

	private isIntersectableNode = (node: Element) => {
		if (node.nodeName === 'OPTION') return false;

		return document.body.contains(node);
	};

	/**
	 * Calculate node priority for translate, the bigger number the importance text
	 */
	private getNodeScore = (node: Node) => {
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
