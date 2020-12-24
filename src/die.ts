import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import App from './app';
import { getAsset } from './assets';
import { textHeightForWidth } from './utils';

export enum DieType {
	D1 = 'd1',
	D4 = 'd4',
	D6 = 'd6',
	D8 = 'd8',
	D10 = 'd10',
	D12 = 'd12',
	D20 = 'd20',
	D100 = 'd100'
}

export type DieConstructorOptions = {
	app: App,
	type: DieType,
	text?: string,
	actor?: Partial<MRE.ActorLike>
}

/** Representation of an individual die. 10cm in diameter by default. */
export class Die {
	private app: App;
	private _type: DieType;
	private _root: MRE.Actor;
	private _label: MRE.Actor;
	private _model: MRE.Actor;

	private clickHandlers = new Set<MRE.ActionHandler<MRE.ButtonEventData>>();
	private ogScale: MRE.Vector3;
	private hoverScale: MRE.Vector3;

	public get root() { return this._root; }
	public get type() { return this._type; }

	public get text() { return this._label.text.contents; }
	public set text(value) {
		this._label.text.contents = value;
		this._label.text.height = textHeightForWidth(value, 0.08, 0.05);
	}

	public get textColor() { return this._label.text.color; }
	public set textColor(value) {
		this._label.text.color = value;
	}

	constructor(options: DieConstructorOptions) {
		this.app = options.app;
		this._type = options.type;

		this._root = MRE.Actor.Create(this.app.context, { actor: {
			name: this.type,
			...options.actor,
			collider: { geometry: { shape: MRE.ColliderType.Sphere, radius: 0.05 }}
		}});
		const labelSwivel = MRE.Actor.Create(this.app.context, { actor: {
			name: "LabelSwivel",
			parentId: this.root.id,
			lookAt: { mode: MRE.LookAtMode.TargetXY }
		}});
		this._label = MRE.Actor.Create(this.app.context, { actor: {
			name: "Label",
			parentId: labelSwivel.id,
			transform: { local: { position: { z: -0.05 }}},
			text: {
				justify: MRE.TextJustify.Center,
				anchor: MRE.TextAnchorLocation.MiddleCenter,
				contents: options.text,
				height: textHeightForWidth(options.text, 0.08, 0.05)
			}
		}});

		this._root.setBehavior(MRE.ButtonBehavior)
			.onHover('enter', user => this.onHover(user))
			.onHover('exit', user => this.offHover(user))
			.onButton('pressed', (user, data) => this.internalOnClick(user, data));

		// load model
		let modelType = this.type;
		if (modelType === DieType.D100) {
			modelType = DieType.D10;
		}

		getAsset(this.app.context, modelType)
		.then(asset => {
			this._model = MRE.Actor.CreateFromPrefab(this.app.context, {
				prefab: asset.prefab,
				actor: {
					name: "Model",
					parentId: this.root.id,
					transform: { local: { scale: { x: 0.1, y: 0.1, z: 0.1 }}}
				}
			});
			return this._model.created();
		})
		.then(() => {
			if (this.type === DieType.D100) {
				return getAsset(this.app.context, 'd100mat');
			} else {
				return Promise.resolve(this._model.children[0].appearance.material);
			}
		})
		.then(asset => {
			this._model.children[0].appearance.material = asset.material;

			this.ogScale = this._model.transform.local.scale.clone();

			const hoverFactor = 1.1;
			this.hoverScale = new MRE.Vector3(
				this.ogScale.x * hoverFactor,
				this.ogScale.y * hoverFactor,
				this.ogScale.z * hoverFactor);
		})
		.catch(err => MRE.log.error('app', err));
	}

	public onClick(handler: MRE.ActionHandler<MRE.ButtonEventData>) {
		this.clickHandlers.add(handler);
	}

	public offClick(handler: MRE.ActionHandler<MRE.ButtonEventData>) {
		this.clickHandlers.delete(handler);
	}

	private onHover(user: MRE.User) {
		if (!this._model) return;

		// TODO: make this a material tint instead of scale (bugged)
		if (this.clickHandlers.size > 0) {
			this._model.transform.local.scale = this.hoverScale;
		} else {
			this._model.transform.local.scale = this.ogScale;
		}
	}

	private offHover(user: MRE.User) {
		if (!this._model) return;

		this._model.transform.local.scale = this.ogScale;
	}

	private internalOnClick(user: MRE.User, data: MRE.ButtonEventData) {
		for (const handler of this.clickHandlers) {
			handler(user, data);
		}
	}
}
