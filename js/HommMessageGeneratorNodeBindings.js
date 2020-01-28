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
    this.loadSprite()
  }

  loadSprite() {
    loadImage(fs.readFileSync(path.join(__dirname, './img/sprite.png')))
      .then((img) => {
        this.sprite = img
      })
  }

  setCanvasSize() {
    this.canvas = createCanvas(this.getCanvasWidth(), this.getCanvasHeight())
    this.context = this.canvas.getContext('2d')
  }

  renderText(text) {
    this.setText(text)
    this.render()
  }

  renderWithTextAndConfig(text, config) {
    this.setColor(config.color)

    this.buttons_show = config.buttons_show

    this.showShadow = config.showShadow

    this.setText(text)
    this.render()
  }

  exportBuffer() {
    return this.canvas.toBuffer()
  }
}

module.exports = HommMessageGeneratorNodeBindings
