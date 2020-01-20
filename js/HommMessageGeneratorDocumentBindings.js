class HommMessageGeneratorDocumentBindings extends HommMessageGenerator {
  constructor() {
    super()

    const input = document.getElementById("input")
    input.addEventListener("input", (e) => {
      this.updateText(e.target.value)
      this.render()
    });
    this.text = input.value

    this.canvas = document.getElementById("canvas");
    this.context = this.canvas.getContext("2d");

    this.sprite = new Image();
    this.sprite.src = "img/sprite.png";

    this.sprite.onload = function() {
      this.render();
    }.bind(this);

    this.initControls();
  }

  initControls() {
    var colors = document.querySelectorAll(".color-item");
    for(var i=0;i<colors.length;i++) {
      colors[i].addEventListener("click", this.setColor.bind(this, colors[i].getAttribute("data-color")));
    }

    var checkboxes = document.querySelectorAll(".checkbox-wrapper");
    for(var i=0;i<checkboxes.length;i++) {
      checkboxes[i].addEventListener("click", this.toggleCheckbox.bind(this, checkboxes[i].getAttribute("data-button")));
    }

    document.querySelector(".about-icon.open").addEventListener("click", function() {
      document.querySelector(".left-panel").classList.add("about");
    });


    document.querySelector(".about-icon.close").addEventListener("click", function() {
      document.querySelector(".left-panel").classList.remove("about");
    });
  }

  setColor(color) {
    super.setColor(color)

    var colors = document.querySelectorAll(".color-item");
    for(var i=0;i<colors.length;i++) {
      colors[i].classList.remove("selected");
    }
    document.querySelector(".color-item[data-color='" + color + "']").classList.add("selected");
  }

  toggleCheckbox(button_id) {
    var new_value = !this.buttons_show[button_id];
    this.buttons_show[button_id] = new_value;

    document.querySelector(".checkbox-wrapper[data-button='" + button_id + "'] .checkbox-icon").classList[new_value ? "add" : "remove"]("checked");

    this.render();
  }
}