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

export type DieOptions = {
	app: App,
	type: DieType,
	label: string,
	actor?: Partial<MRE.ActorLike>
}

export class Die {
	private app: App;
	private type: DieType;
	private _root: MRE.Actor;
	private _label: MRE.Actor;

	public get root() { return this._root; }

	public get text() { return this._label.text.contents; }
	public set text(value) {
		this._label.text.contents = value;
		this._label.text.height = textHeightForWidth(value, 0.08, 0.05);
	}

	constructor(options: DieOptions) {
		this.app = options.app;
		this.type = options.type;

		this._root = MRE.Actor.Create(this.app.context, { actor: {
			...options.actor,
			collider: { geometry: { shape: MRE.ColliderType.Sphere, radius: 0.1 }}
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
				color: MRE.Color3.Red(),
				contents: options.label,
				height: textHeightForWidth(options.label, 0.08, 0.05)
			}
		}});

		// load model
		let modelType = this.type;
		if (modelType === DieType.D100) {
			modelType = DieType.D10;
		}

		let model: MRE.Actor;
		getAsset(this.app.context, modelType)
		.then(asset => {
			model = MRE.Actor.CreateFromPrefab(this.app.context, {
				prefab: asset.prefab,
				actor: {
					name: "Model",
					parentId: this.root.id,
					transform: { local: { scale: { x: 0.1, y: 0.1, z: 0.1 }}}
				}
			});
			return model.created();
		})
		.then(() => {
			if (modelType === DieType.D100) {
				return getAsset(this.app.context, 'd100mat');
			} else {
				return Promise.resolve(model.children[0].appearance.material);
			}
		})
		.then(asset => {
			model.children[0].appearance.material = asset.material;
		})
		.catch(err => MRE.log.error('app', err));
	}
}
