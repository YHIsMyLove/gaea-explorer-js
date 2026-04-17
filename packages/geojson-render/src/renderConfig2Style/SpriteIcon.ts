import { SpriteJson, getSpriteJson } from './sprite';
import { image2canvas, loadImage } from './renderTool';

export type SpriteIconOptions = {
  url: string;
  params?: Record<string, any> | undefined;
};

export type SpriteOptins = {
  spriteImage: HTMLImageElement;
  json: SpriteJson;
};

export { loadImage, image2canvas };

export const reColorCanvas = (image: HTMLCanvasElement, color?: string) => {
  if (!image) return undefined;

  const newCanvas = document.createElement('canvas');
  newCanvas.width = image.width;
  newCanvas.height = image.height;
  const context = newCanvas.getContext('2d');

  if (context) {
    context.drawImage(image, 0, 0);

    if (color) {
      context.globalCompositeOperation = 'source-in';
      context.fillStyle = color;
      context.fillRect(0, 0, image.width, image.height);
    }
  }
  return newCanvas;
};

export default class SpriteIcon {
  private static _optionsCache: Record<string, SpriteOptins> = {};

  private _options: SpriteOptins | undefined;
  private _ready: boolean;
  readyPromise: Promise<SpriteOptins | undefined>;
  private _cache: Record<string, HTMLCanvasElement | undefined>;

  constructor(sprite: SpriteIconOptions) {
    this._ready = false;
    this.readyPromise = this.loadSprite(sprite).then((res) => {
      this._ready = true;
      return res;
    });
    this._cache = {};
  }

  get ready() {
    return this._ready;
  }

  get options() {
    return this._options;
  }

  async loadSprite(sprite: SpriteIconOptions) {
    if (!sprite) return undefined;

    const key = sprite.url + sprite.params;
    let options: SpriteOptins;
    if (SpriteIcon._optionsCache[key]) options = SpriteIcon._optionsCache[key];
    else {
      options = {
        spriteImage: await loadImage(
          sprite.url.replace(/(.*)\.(.*)/, '$1.png'),
          sprite.params,
        ),
        json: await getSpriteJson(
          sprite.url.replace(/(.*)\.(.*)/, '$1.json'),
          sprite.params,
        ),
      };
      SpriteIcon._optionsCache[key] = options;
    }
    this._options = options;
    return this._options;
  }

  getImageByName(name: string | undefined, color = 'white') {
    if (!name || !this._options?.spriteImage) {
      return undefined;
    }
    const key = name + color;
    if (this._cache[key]) return this._cache[key];
    else {
      const image = image2canvas(
        this._options.spriteImage,
        this._options.json[name],
        color,
      );
      this._cache[key] = image;
      return image;
    }
  }
}
