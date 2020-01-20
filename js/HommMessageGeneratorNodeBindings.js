const {createCanvas, loadImage} = require('canvas')
const HommMessageGenerator = require('./HommMessageGenerator')

const fs = require('fs')
const path = require('path')

class HommMessageGeneratorNodeBindings extends HommMessageGenerator {
  constructor() {
    super()

    this.canvas = createCanvas(1, 1)
    this.context = this.canvas.getContext('2d')

    this.sprite = null
    Promise.all([
      this.loadSprite(),
    ])
      .then(() => {
        this.ready = true
      })
  }

  async loadSprite() {
    this.sprite = await loadImage(fs.readFileSync(path.join(__dirname, './img/sprite.png')))
  }

  setCanvasSize() {
    this.canvas = createCanvas(this.getCanvasWidth(), this.getCanvasHeight())
    this.context = this.canvas.getContext('2d')
  }

  renderText(text) {
    this.updateText(text)
    this.render()
  }

  renderWithTextAndConfig(text, config) {
    this.color = config.color;
    this.use_color = !(this.color === "" || this.color === false || this.color === null || typeof this.color === "undefined");

    this.buttons_show = config.buttons_show

    this.updateText(text)
    this.render()
  }

  exportBuffer() {
    return this.canvas.toBuffer()
  }
}

module.exports = HommMessageGeneratorNodeBindings
