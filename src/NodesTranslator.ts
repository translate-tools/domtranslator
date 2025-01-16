import { IntersectionWatcher } from './IntersectWatcher';
import { XMutationObserver } from './lib/XMutationObserver';
import { Nodes } from './NodePrimitive';
import { Config, InnerConfig, TranslatorInterface } from './types';
import { configureTranslatableNodePredicate } from './utils/nodes';

// TODO: consider local language definitions (and implement `from`, `to` parameters for translator to specify default or locale languages)
// TODO: scan nodes lazy - defer scan to `requestIdleCallback` instead of instant scan
// TODO: describe nodes life cycle

/**
 * Module for dynamic translate a DOM nodes
 */
export class NodesTranslator {
	// private readonly translateCallback: TranslatorInterface;
	private readonly config: InnerConfig;

	private intersectionWatcher: IntersectionWatcher;

	private nodes: Nodes;

	private readonly observedNodesStorage = new Map<Element, XMutationObserver>();

	constructor(translateCallback: TranslatorInterface, config?: Config) {
		// this.translateCallback = translateCallback;
		this.config = {
			...config,
			isTranslatableNode:
				config?.isTranslatableNode ?? configureTranslatableNodePredicate(),
			lazyTranslate:
				config?.lazyTranslate !== undefined ? config?.lazyTranslate : true,
		};

		this.intersectionWatcher = new IntersectionWatcher((node: Element) => {
			this.handleIntersection(node);
		});

		this.nodes = new Nodes(
			translateCallback,
			this.config,
			this.lazyTranslationHander.bind(this),
		);
	}

	private lazyTranslationHander(node: Node) {
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
				this.intersectionWatcher.isIntersectableNode(observableNode)
			) {
				this.intersectionWatcher.handleElementByIntersectViewport(observableNode);
				return;
			}
		}

		// Add to storage
		this.nodes.handleNode(node);
	}

	private handleIntersection(node: Element) {
		// Translate child text nodes and attributes of target node
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		node.childNodes.forEach((node) => {
			if (node instanceof Element || !this.config.isTranslatableNode(node)) {
				return;
			}

			this.nodes.handleNode(node);
		});
	}

	private deleteNode(node: Node, onlyTarget?: boolean) {
		this.nodes.deleteNode(node, onlyTarget);

		if (node instanceof Element) {
			this.intersectionWatcher.unobserve(node);
		}
	}

	public observe(node: Element) {
		if (this.observedNodesStorage.has(node)) {
			throw new Error('Node already under observe');
		}

		// Observe node and childs changes
		const observer = new XMutationObserver();
		this.observedNodesStorage.set(node, observer);

		observer.addHandler('elementAdded', ({ target }) => this.nodes.addNode(target));
		observer.addHandler('elementRemoved', ({ target }) => this.deleteNode(target));
		observer.addHandler('characterData', ({ target }) => {
			this.nodes.updateNode(target);
		});
		observer.addHandler('changeAttribute', ({ target, attributeName }) => {
			if (attributeName === undefined || attributeName === null) return;
			if (!(target instanceof Element)) return;

			const attribute = target.attributes.getNamedItem(attributeName);

			if (attribute === null) return;

			// NOTE: If need delete untracked nodes, we should keep relates like Element -> attributes
			if (!this.nodes.isNodeStorageHas(attribute)) {
				this.nodes.addNode(attribute);
			} else {
				this.nodes.updateNode(attribute);
			}
		});

		observer.observe(node);
		this.nodes.addNode(node);
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
		this.nodes.getNodeData(node);
	}
}
