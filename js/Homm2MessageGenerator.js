class Homm2MessageGenerator {
  constructor(dispatcher) {
    this.dispatcher = dispatcher;

    this.language = "eng";

    this.input = this.dispatcher.input;
    this.canvas = this.dispatcher.canvas;
    this.context = this.dispatcher.context;

    this.middles_count = 0; // number of middle sections

    this.theme = "good";

    this.sprite = new Image();
    this.sprite.src = "img/homm2-sprite.png";

    this.is_current_renderer = false;
    this.ready_to_render = false;
    this.renderInterval = null;

    this.sprite.onload = function() {
      this.ready_to_render = true;
    }.bind(this);
  }


  render() {
    if(!this.is_current_renderer) {
      return;
    }

    if(!this.ready_to_render) {
      this.renderInterval = setTimeout(this.dispatcher.render.bind(this.dispatcher), 100);
      return;
    }

    this.setDefaults();
    this.splitTextToLines();
    this.setCanvasSize();
    this.drawMessageWindow();
    this.drawText();
  }


  /**
   * Sets either good or evil theme for message window
   * @param {string} theme name: good or evil
   * @return {undefined}
   */
  setTheme(which) {
    if(which.match(/^(evil|good)$/)) {
      this.theme = which;
    } else {
      this.theme = "good";
    }

    this.render();
  }


  /**
   * Clears canvas and sets defaults where necessary
   * @return {undefined}
   */
  setDefaults() {
    this.context.clearRect(0, 0, 999999, 999999);
    this.middles_count = 0;
  }


  /**
   * Renders message window on canvas
   * 
   */
  drawMessageWindow() {
    var theme_sections = Homm2MessageGenerator.sections_info[this.theme];

    this.drawMessageSections(theme_sections);
    if(this.dispatcher.isButtonsVisible()) {
      this.drawButtons(theme_sections);
    }
  }


  setCanvasSize() {
    var text_height = this.text_by_lines.length * Homm2MessageGenerator.line_height;
    var sections = Homm2MessageGenerator.sections_info[this.theme];
    var spare_height = sections.top.size[1] - this.getPadding("top") + sections.bottom.size[1] - this.getPadding("bottom");
    for(var i=0;i<10;i++) {
      if(i) {
        spare_height += sections.middle.size[1];
      }
      if(spare_height >= text_height) {
        this.middles_count = i;
        break;
      }
    }
    var width = sections.width;
    var height = 
      sections.top.size[1] 
      + sections.bottom.size[1] 
      + this.middles_count * sections.middle.size[1];
    if(this.dispatcher.draw_shadow) {
      width += sections.shadow_width;
      height += sections.bottom.shadows[1].size[1];
    }
    this.canvas.width = width;
    this.canvas.height = height;
  }


  /**
   * Gets padding from single direction
   * @param {string} which - direction (top / right / bottom / left)
   * @return {undefined}
   */
  getPadding(which) {
    var padding_to_return = 0;
    var sections_info = Homm2MessageGenerator.sections_info[this.theme];
    if(which == "bottom" && this.dispatcher.isButtonsVisible()) {
      which = "bottom_with_buttons";
    } else if(which == "forced_bottom") {
      which = "bottom";
    } else if(which == "left_with_shadow") {
      if(this.dispatcher.draw_shadow) {
        padding_to_return += sections_info.shadow_width;
      }
      which = "left";
    }
    padding_to_return += sections_info.padding[which];
    return padding_to_return;
  }


  splitTextToLines() {
    var current_line = [];
    var current_space_string = "";
    var is_new_line = false;
    var is_space_block = false;
    var block = "";
    var is_line_last = false;
    var current_line_with_block = "";
    var current_line_with_block_width = 0;
    var last_line_width = 0;

    this.text_by_lines = [];

    if(this.dispatcher.split_words.length === 0) {
      return;
    }

    current_line = [];
    current_space_string = "";
    is_new_line = false;
    is_space_block = false;
    block = "";

    for(var i=0;i<this.dispatcher.split_words.length;i++) {
      block = this.dispatcher.split_words[i];
      is_new_line = (block.match(/^[\n\r]+$/) !== null);
      is_space_block = (block.match(/^\s+$/) !== null && !is_new_line);

      current_line_with_block = current_line.join("") + block;
      current_line_with_block_width = this.getStringWidth(current_line_with_block);

      if(is_new_line) { // new line
        this.text_by_lines.push(current_line);
        current_line = [];
        current_space_string = "";
        continue;
      } else if(is_space_block) { // space block
        for(var j=0;j<block.length;j++) {
          var space_char = block[j];
          current_space_string += space_char;
          var current_line_with_space_block = current_line.join("") + current_space_string;
          var current_line_with_space_block_width = this.getStringWidth(current_line_with_space_block);
          if(current_line_with_space_block_width > this.getPopupWidthWithoutPadding()) {
            current_line.push(current_space_string);
            this.text_by_lines.push(current_line);
            current_line = [];
            current_space_string = "";
          }
        }
        if(current_space_string !== "") {
          current_line.push(current_space_string);
          current_space_string = "";
        }
      } else { // regular word
        if(current_line_with_block_width < this.getPopupWidthWithoutPadding()) {
          current_line.push(block);
        } else {
          if(current_line.length) {
            this.text_by_lines.push(current_line);
          }
          current_line = [block];
        }
      }
    }

    if(current_line.length) {
      this.text_by_lines.push(current_line);
    }
  }

  getStringWidth(string) {
    var width = 0;
    for(var i=0;i<string.length;i++) {
      var char = string[i];
      if(typeof Homm2MessageGenerator.letters[char] === "undefined") {
        continue;
      }
      if(char === " " && i + 1 == string.length) { // trim only single last space on line
        continue;
      }
      if(width) {
        width += Homm2MessageGenerator.letter_spacing;
      }
      var char_info = this.getCharInfo(char);

      width += char_info.width;
    }
    return width;
  }

  getCharInfo(char) {
    return this.dispatcher.getCharInfo(Homm2MessageGenerator, char);
  }


  /**
   * Returns full message window width in pixels
   * @return {number}
   */
  getPopupWidth() {
    return Homm2MessageGenerator.sections_info[this.theme].width;
  }


  /**
   * Returns free horizontal space for text in pixels
   * @return {number}
   */
  getPopupWidthWithoutPadding() {
    return this.getPopupWidth() - this.getPadding("left") - this.getPadding("right");
  }


  /**
   * Returns full message window height in pixels
   * @return {number}
   */
  getPopupHeight() {
    return Homm2MessageGenerator.sections_info[this.theme].top.size[1]
      + Homm2MessageGenerator.sections_info[this.theme].middle.size[1] * this.middles_count
      + Homm2MessageGenerator.sections_info[this.theme].bottom.size[1];
  }


  /**
   * Returns free vertical space for text in pixels
   * @return {number}
   */
  getPopupHeightWithoutPadding() {
    return this.getPopupHeight() - this.getPadding("top") - this.getPadding("bottom");
  }

  drawText() {
    for(var line_index=0;line_index<this.text_by_lines.length;line_index++) {
      this.drawLine(line_index);
    }
  }

  drawLine(line_index) {
    var text_line = this.text_by_lines[line_index];
    var current_x = 0;
    
    var joint_line = text_line.join("");
    var joint_line_width = this.getStringWidth(joint_line);
    current_x = Math.floor((this.getPopupWidthWithoutPadding() - joint_line_width) / 2);

    for(var word_index=0;word_index<text_line.length;word_index++) {
      current_x = this.drawWord(line_index, text_line, word_index, current_x);
    }
  }

  drawWord(line_index, text_line, word_index, current_x) {
    var word = text_line[word_index];
    if(word === " " && word_index + 1 == text_line.length) {
      return current_x;
    }
    for(var char_index=0;char_index<word.length;char_index++) {
      current_x = this.drawChar(line_index, word, char_index, current_x);
    }

    return current_x;
  }

  drawChar(line_index, word, char_index, current_x) {
    var char = word[char_index];
    if(typeof Homm3MessageGenerator.letters[char] === "undefined") {
      return current_x;
    }
    var char_info = this.getCharInfo(char);

    if(typeof char_info.marginLeft !== "undefined" && (word_index != 0 || char_index != 0 || char_info.marginLeft > 0)) {
      current_x += char_info.marginLeft;
    }

    if(typeof char_info.width !== "undefined") {
      var x_to_draw = this.getPadding("left_with_shadow") + current_x;
      var y_to_draw = this.getLetterY(line_index);
      var char_x = this.getCharX(char_info);
      var char_y = this.getCharY(char_info);
      var char_height = Homm2MessageGenerator.line_height;

      var extraHeightUp = (typeof char_info.extraHeightUp === "undefined") ? 0 : char_info.extraHeightUp;
      var extraHeightDown = (typeof char_info.extraHeightDown === "undefined") ? 0 : char_info.extraHeightDown;
      this.context.drawImage(
        this.sprite, 
        char_x, 
        char_y - extraHeightUp,
        char_info.width, 
        char_height + extraHeightUp + extraHeightDown,
        x_to_draw,
        y_to_draw - extraHeightUp,
        char_info.width, 
        char_height + extraHeightUp + extraHeightDown,
      );
      this.context.drawImage(
        this.sprite, 
        char_x - 1, 
        this.getCharShadowY(char_info) - extraHeightUp + 1,
        char_info.width, 
        char_height + extraHeightUp + extraHeightDown - 1,
        x_to_draw - 1,
        y_to_draw - extraHeightUp + 1,
        char_info.width, 
        char_height + extraHeightUp + extraHeightDown - 1,
      );
    }

    current_x += char_info.width;
    current_x += Homm2MessageGenerator.letter_spacing;

    return current_x;
  }

  getLetterY(line_index) {
    if(!this.dispatcher.isButtonsVisible()) {
      return line_index * Homm2MessageGenerator.line_height + this.getPadding("top") + Math.round((this.getPopupHeightWithoutPadding() - this.text_by_lines.length * Homm2MessageGenerator.line_height)/2);
    }
    return this.getPadding("top") + line_index * Homm2MessageGenerator.line_height;
  }

  getCharX(char_info) {
    return Homm2MessageGenerator.letters_offset_x + char_info.x * Homm2MessageGenerator.letter_container_width;
  }

  getCharY(char_info) {
    return Homm2MessageGenerator.letters_offset_y + char_info.y * Homm2MessageGenerator.line_height;
  }

  getCharShadowY(char_info) {
    return Homm2MessageGenerator.letters_shadow_offset_y + char_info.y * Homm2MessageGenerator.line_height;
  }

  drawMessageSections(theme_sections) {
    var sections_name = ["top", "middle", "bottom"];

    var y_to_draw = 0;
    for(var i=0;i<sections_name.length;i++) {
      var current_section = theme_sections[sections_name[i]];
      var repetitions = (sections_name[i] == "middle") ? this.middles_count : 1;
      var x_to_draw = (this.dispatcher.draw_shadow) 
        ? theme_sections.shadow_width
        : 0;
      for(var j=0;j<repetitions;j++) {
        this.context.drawImage(
          this.sprite, 
          current_section.offset[0],
          current_section.offset[1],
          current_section.size[0],
          current_section.size[1],
          x_to_draw,
          y_to_draw,
          current_section.size[0],
          current_section.size[1]
        );
        if(this.dispatcher.draw_shadow) {
          for(var k=0;k<current_section.shadows.length;k++) {
            var shadow = current_section.shadows[k];
            this.context.drawImage(
              this.sprite, 
              shadow.offset[0],
              shadow.offset[1],
              shadow.size[0],
              shadow.size[1],
              x_to_draw + shadow.parentOffset[0],
              y_to_draw + shadow.parentOffset[1],
              shadow.size[0],
              shadow.size[1]
            );
          }
        }
        y_to_draw += current_section.size[1];
      }
    }
  }

  drawButtons(theme_sections) {
    var buttons_info = theme_sections.buttons[this.language];
    var buttons_number = ((this.dispatcher.buttons_show.ok) ? 1 : 0) + ((this.dispatcher.buttons_show.cancel) ? 1 : 0);
    var button_y = this.getPopupHeight() - this.getPadding("bottom");
    if(this.dispatcher.buttons_show.ok) {
      var ok_x;
      if(buttons_number == 1) {
        ok_x = (this.dispatcher.draw_shadow ? theme_sections.shadow_width : 0) + (this.getPopupWidth() - Homm2MessageGenerator.button_size[0]) / 2;
      }
      if(buttons_number == 2) {
        ok_x = (this.dispatcher.draw_shadow ? theme_sections.shadow_width : 0) + this.getPopupWidth() / 2 - (Homm2MessageGenerator.button_size[0] + Homm2MessageGenerator.button_margin / 2);
      }
      this.context.drawImage(
        this.sprite, 
        buttons_info.ok.offsetX,
        buttons_info.ok.offsetY,
        Homm2MessageGenerator.button_size[0],
        Homm2MessageGenerator.button_size[1],
        ok_x,
        button_y,
        Homm2MessageGenerator.button_size[0],
        Homm2MessageGenerator.button_size[1]
      );
    }

    if(this.dispatcher.buttons_show.cancel) {
      var cancel_x;
      if(buttons_number == 2) {
        cancel_x = (this.dispatcher.draw_shadow ? theme_sections.shadow_width : 0) + (this.getPopupWidth() + Homm2MessageGenerator.button_margin) / 2;
      }
      if(buttons_number == 1) {
        cancel_x = ((this.dispatcher.draw_shadow ? theme_sections.shadow_width : 0) + this.getPopupWidth() - Homm2MessageGenerator.button_size[0]) / 2;
      }
      this.context.drawImage(
        this.sprite, 
        buttons_info.cancel.offsetX,
        buttons_info.cancel.offsetY,
        Homm2MessageGenerator.button_size[0],
        Homm2MessageGenerator.button_size[1],
        cancel_x,
        button_y,
        Homm2MessageGenerator.button_size[0],
        Homm2MessageGenerator.button_size[1]
      );
    }
  }

  setLanguage(lang) {
    this.language = lang;
  }
}

Homm2MessageGenerator.button_size = [95, 25];
Homm2MessageGenerator.button_margin = 28;
Homm2MessageGenerator.letter_container_width = 19;
Homm2MessageGenerator.line_height = 16;
Homm2MessageGenerator.letters_offset_x = 1;
Homm2MessageGenerator.letters_offset_y = 313;
Homm2MessageGenerator.letters_shadow_offset_y = 483;
Homm2MessageGenerator.letter_spacing = 2;

Homm2MessageGenerator.sections_info = {
  "evil": {
    "width": 288,
    "shadow_width": 16,
    "padding": {
      "top": 53, 
      "right": 32,
      "bottom": 32,
      "bottom_with_buttons": 61,
      "left": 32
    },
    "buttons": {
      "eng": {
        "ok": {
          "offsetX": 19,
          "offsetY": 243
        },
        "cancel": {
          "offsetX": 115,
          "offsetY": 243
        },
      },
      "rus": {
        "ok": {
          "offsetX": 19,
          "offsetY": 269
        },
        "cancel": {
          "offsetX": 115,
          "offsetY": 269
        },
      },
    },
    "top": {
      "offset": [19, 11],
      "size": [288, 88],
      "shadows": [
        {
          "offset": [3, 27],
          "size": [14, 10],
          "parentOffset": [107, 16]
        },
        {
          "offset": [0, 48],
          "size": [16, 51],
          "parentOffset": [-16, 37]
        }
      ]
    },
    "middle": {
      "offset": [19, 100],
      "size": [288, 45],
      "shadows": [
        {
          "offset": [0, 100],
          "size": [16, 45],
          "parentOffset": [-16, 0]
        }
      ]
    },
    "bottom": {
      "offset": [19, 146],
      "size": [288, 68],
      "shadows": [
        {
          "offset": [0, 146],
          "size": [16, 61],
          "parentOffset": [-16, 0]
        },
        {
          "offset": [3, 216],
          "size": [288, 20],
          "parentOffset": [-16, 61]
        }
      ]
    }
  },
  "good": {
    "width": 290,
    "shadow_width": 17,
    "padding": {
      "top": 64, 
      "right": 32,
      "bottom": 32,
      "bottom_with_buttons": 58,
      "left": 32
    },
    "buttons": {
      "eng": {
        "ok": {
          "offsetX": 345,
          "offsetY": 243
        },
        "cancel": {
          "offsetX": 441,
          "offsetY": 243
        },
      },
      "rus": {
        "ok": {
          "offsetX": 345,
          "offsetY": 269
        },
        "cancel": {
          "offsetX": 441,
          "offsetY": 269
        },
      },
    },
    "top": {
      "offset": [346, 0],
      "size": [290, 99],
      "shadows": [
        {
          "offset": [312, 18],
          "size": [33, 20],
          "parentOffset": [97, 18]
        },
        {
          "offset": [328, 50],
          "size": [16, 49],
          "parentOffset": [-15, 50]
        }
      ]
    },
    "middle": {
      "offset": [346, 100],
      "size": [290, 45],
      "shadows": [
        {
          "offset": [327, 100],
          "size": [17, 45],
          "parentOffset": [-16, 0]
        }
      ]
    },
    "bottom": {
      "offset": [346, 146],
      "size": [290, 65],
      "shadows": [
        {
          "offset": [327, 146],
          "size": [17, 61],
          "parentOffset": [-16, 0]
        },
        {
          "offset": [331, 217],
          "size": [288, 20],
          "parentOffset": [-15, 61]
        }
      ]
    },
  }
};

Homm2MessageGenerator.letters = {
  " ": {
    "width": 4
  },
  ".": {
    "x": 0,
    "y": 0,
    "width": 2
  },
  "!": {
    "x": 1,
    "y": 0,
    "width": 2
  },
  "\"": {
    "x": 2,
    "y": 0,
    "width": 6
  },
  "$": {
    "x": 4,
    "y": 0,
    "width": 8
  },
  "%": {
    "x": 5,
    "y": 0,
    "width": 11
  },
  "&": {
    "x": 6,
    "y": 0,
    "width": 10
  },
  "'": {
    "x": 7,
    "y": 0,
    "width": 2
  },
  "(": {
    "x": 8,
    "y": 0,
    "width": 4
  },
  ")": {
    "x": 9,
    "y": 0,
    "width": 4
  },
  "*": {
    "x": 10,
    "y": 0,
    "width": 11
  },
  "+": {
    "x": 11,
    "y": 0,
    "width": 8
  },
  ",": {
    "x": 12,
    "y": 0,
    "width": 3
  },
  "-": {
    "x": 13,
    "y": 0,
    "width": 9
  },
  "/": {
    "x": 15,
    "y": 0,
    "width": 7
  },
  ":": {
    "x": 0,
    "y": 2,
    "width": 2
  },
  ";": {
    "x": 1,
    "y": 2,
    "width": 3
  },
  "=": {
    "x": 3,
    "y": 2,
    "width": 9
  },
  "?": {
    "x": 5,
    "y": 2,
    "width": 8
  },
  "[": {
    "x": 0,
    "y": 4,
    "width": 5
  },
  "]": {
    "x": 2,
    "y": 4,
    "width": 5
  },
  "_": {
    "x": 4,
    "y": 4,
    "width": 8
  },

  // digits
  "0": {
    "x": 0,
    "y": 1,
    "width": 8
  },
  "1": {
    "x": 1,
    "y": 1,
    "width": 4
  },
  "2": {
    "x": 2,
    "y": 1,
    "width": 7
  },
  "3": {
    "x": 3,
    "y": 1,
    "width": 7
  },
  "4": {
    "x": 4,
    "y": 1,
    "width": 8
  },
  "5": {
    "x": 5,
    "y": 1,
    "width": 7
  },
  "6": {
    "x": 6,
    "y": 1,
    "width": 7
  },
  "7": {
    "x": 7,
    "y": 1,
    "width": 7
  },
  "8": {
    "x": 8,
    "y": 1,
    "width": 7
  },
  "9": {
    "x": 9,
    "y": 1,
    "width": 7
  },

  // english
  // lowercase
  "a": {
    "x": 0,
    "y": 5,
    "width": 9
  },
  "b": {
    "x": 1,
    "y": 5,
    "width": 10
  },
  "c": {
    "x": 2,
    "y": 5,
    "width": 8
  },
  "d": {
    "x": 3,
    "y": 5,
    "width": 9
  },
  "e": {
    "x": 4,
    "y": 5,
    "width": 8
  },
  "f": {
    "x": 5,
    "y": 5,
    "width": 7
  },
  "g": {
    "x": 6,
    "y": 5,
    "width": 9
  },
  "h": {
    "x": 7,
    "y": 5,
    "width": 9
  },
  "i": {
    "x": 8,
    "y": 5,
    "width": 4
  },
  "j": {
    "x": 9,
    "y": 5,
    "width": 7
  },
  "k": {
    "x": 10,
    "y": 5,
    "width": 9
  },
  "l": {
    "x": 11,
    "y": 5,
    "width": 4
  },
  "m": {
    "x": 12,
    "y": 5,
    "width": 14
  },
  "n": {
    "x": 13,
    "y": 5,
    "width": 9
  },
  "o": {
    "x": 14,
    "y": 5,
    "width": 8
  },
  "p": {
    "x": 15,
    "y": 5,
    "width": 9
  },
  "q": {
    "x": 16,
    "y": 5,
    "width": 10
  },
  "r": {
    "x": 17,
    "y": 5,
    "width": 8
  },
  "s": {
    "x": 18,
    "y": 5,
    "width": 7
  },
  "t": {
    "x": 19,
    "y": 5,
    "width": 6
  },
  "u": {
    "x": 20,
    "y": 5,
    "width": 9
  },
  "v": {
    "x": 21,
    "y": 5,
    "width": 8
  },
  "w": {
    "x": 22,
    "y": 5,
    "width": 12
  },
  "x": {
    "x": 23,
    "y": 5,
    "width": 9
  },
  "y": {
    "x": 24,
    "y": 5,
    "width": 10
  },
  "z": {
    "x": 25,
    "y": 5,
    "width": 8
  },

  // english
  // uppercase
  "A": {
    "x": 0,
    "y": 3,
    "width": 14
  },
  "B": {
    "x": 1,
    "y": 3,
    "width": 10
  },
  "C": {
    "x": 2,
    "y": 3,
    "width": 12
  },
  "D": {
    "x": 3,
    "y": 3,
    "width": 11
  },
  "E": {
    "x": 4,
    "y": 3,
    "width": 10
  },
  "F": {
    "x": 5,
    "y": 3,
    "width": 10
  },
  "G": {
    "x": 6,
    "y": 3,
    "width": 13
  },
  "H": {
    "x": 7,
    "y": 3,
    "width": 11
  },
  "I": {
    "x": 8,
    "y": 3,
    "width": 6
  },
  "J": {
    "x": 9,
    "y": 3,
    "width": 9
  },
  "K": {
    "x": 10,
    "y": 3,
    "width": 11
  },
  "L": {
    "x": 11,
    "y": 3,
    "width": 10
  },
  "M": {
    "x": 12,
    "y": 3,
    "width": 15
  },
  "N": {
    "x": 13,
    "y": 3,
    "width": 14
  },
  "O": {
    "x": 14,
    "y": 3,
    "width": 12
  },
  "P": {
    "x": 15,
    "y": 3,
    "width": 10
  },
  "Q": {
    "x": 16,
    "y": 3,
    "width": 14
  },
  "R": {
    "x": 17,
    "y": 3,
    "width": 11
  },
  "S": {
    "x": 18,
    "y": 3,
    "width": 9
  },
  "T": {
    "x": 19,
    "y": 3,
    "width": 11
  },
  "U": {
    "x": 20,
    "y": 3,
    "width": 11
  },
  "V": {
    "x": 21,
    "y": 3,
    "width": 12
  },
  "W": {
    "x": 22,
    "y": 3,
    "width": 16
  },
  "X": {
    "x": 23,
    "y": 3,
    "width": 15
  },
  "Y": {
    "x": 24,
    "y": 3,
    "width": 13
  },
  "Z": {
    "x": 25,
    "y": 3,
    "width": 10
  },

  // russian
  // lowercase
  "а": {
    "x": 0,
    "y": 8,
    "width": 9
  },
  "б": {
    "x": 1,
    "y": 8,
    "width": 7
  },
  "в": {
    "x": 2,
    "y": 8,
    "width": 7
  },
  "г": {
    "x": 3,
    "y": 8,
    "width": 7
  },
  "д": {
    "x": 4,
    "y": 8,
    "width": 8
  },
  "е": {
    "x": 5,
    "y": 8,
    "width": 8
  },
  "ё": {
    "x": 32,
    "y": 8,
    "width": 8
  },
  "ж": {
    "x": 6,
    "y": 8,
    "width": 11
  },
  "з": {
    "x": 7,
    "y": 8,
    "width": 6
  },
  "и": {
    "x": 8,
    "y": 8,
    "width": 9
  },
  "й": {
    "x": 9,
    "y": 8,
    "width": 9
  },
  "к": {
    "x": 10,
    "y": 8,
    "width": 8
  },
  "л": {
    "x": 11,
    "y": 8,
    "width": 8
  },
  "м": {
    "x": 12,
    "y": 8,
    "width": 11
  },
  "н": {
    "x": 13,
    "y": 8,
    "width": 8
  },
  "о": {
    "x": 14,
    "y": 8,
    "width": 8
  },
  "п": {
    "x": 15,
    "y": 8,
    "width": 8
  },
  "р": {
    "x": 16,
    "y": 8,
    "width": 9
  },
  "с": {
    "x": 17,
    "y": 8,
    "width": 8
  },
  "т": {
    "x": 18,
    "y": 8,
    "width": 12
  },
  "у": {
    "x": 19,
    "y": 8,
    "width": 8
  },
  "ф": {
    "x": 20,
    "y": 8,
    "width": 10
  },
  "х": {
    "x": 21,
    "y": 8,
    "width": 9
  },
  "ц": {
    "x": 22,
    "y": 8,
    "width": 11
  },
  "ч": {
    "x": 23,
    "y": 8,
    "width": 9
  },
  "ш": {
    "x": 24,
    "y": 8,
    "width": 12
  },
  "щ": {
    "x": 25,
    "y": 8,
    "width": 14
  },
  "ъ": {
    "x": 26,
    "y": 8,
    "width": 9
  },
  "ы": {
    "x": 27,
    "y": 8,
    "width": 11
  },
  "ь": {
    "x": 28,
    "y": 8,
    "width": 7
  },
  "э": {
    "x": 29,
    "y": 8,
    "width": 7
  },
  "ю": {
    "x": 30,
    "y": 8,
    "width": 9
  },
  "я": {
    "x": 31,
    "y": 8,
    "width": 8
  },

  // russian
  // uppercase
  "А": {
    "x": 0,
    "y": 7,
    "width": 14
  },
  "Б": {
    "x": 1,
    "y": 7,
    "width": 11
  },
  "В": {
    "x": 2,
    "y": 7,
    "width": 10
  },
  "Г": {
    "x": 3,
    "y": 7,
    "width": 11
  },
  "Д": {
    "x": 4,
    "y": 7,
    "width": 11
  },
  "Е": {
    "x": 5,
    "y": 7,
    "width": 10
  },
  "Ё": {
    "x": 32,
    "y": 7,
    "width": 10
  },
  "Ж": {
    "x": 6,
    "y": 7,
    "width": 15
  },
  "З": {
    "x": 7,
    "y": 7,
    "width": 8
  },
  "И": {
    "x": 8,
    "y": 7,
    "width": 11
  },
  "Й": {
    "x": 9,
    "y": 7,
    "width": 11
  },
  "К": {
    "x": 10,
    "y": 7,
    "width": 11
  },
  "Л": {
    "x": 11,
    "y": 7,
    "width": 9
  },
  "М": {
    "x": 12,
    "y": 7,
    "width": 14
  },
  "Н": {
    "x": 13,
    "y": 7,
    "width": 11
  },
  "О": {
    "x": 14,
    "y": 7,
    "width": 12
  },
  "П": {
    "x": 15,
    "y": 7,
    "width": 11
  },
  "Р": {
    "x": 16,
    "y": 7,
    "width": 10
  },
  "С": {
    "x": 17,
    "y": 7,
    "width": 12
  },
  "Т": {
    "x": 18,
    "y": 7,
    "width": 15
  },
  "У": {
    "x": 19,
    "y": 7,
    "width": 10
  },
  "Ф": {
    "x": 20,
    "y": 7,
    "width": 11
  },
  "Х": {
    "x": 21,
    "y": 7,
    "width": 11
  },
  "Ц": {
    "x": 22,
    "y": 7,
    "width": 13
  },
  "Ч": {
    "x": 23,
    "y": 7,
    "width": 11
  },
  "Ш": {
    "x": 24,
    "y": 7,
    "width": 15
  },
  "Щ": {
    "x": 25,
    "y": 7,
    "width": 18
  },
  "Ъ": {
    "x": 26,
    "y": 7,
    "width": 12
  },
  "Ы": {
    "x": 27,
    "y": 7,
    "width": 15
  },
  "Ь": {
    "x": 28,
    "y": 7,
    "width": 10
  },
  "Э": {
    "x": 29,
    "y": 7,
    "width": 8
  },
  "Ю": {
    "x": 30,
    "y": 7,
    "width": 13
  },
  "Я": {
    "x": 31,
    "y": 7,
    "width": 10
  },
  "ą": {
    "x": 0,
    "y": 9,
    "width": 9
  },
  "ć": {
    "x": 1,
    "y": 9,
    "width": 8
  },
  "ę": {
    "x": 2,
    "y": 9,
    "width": 8
  },
  "ł": {
    "x": 3,
    "y": 9,
    "width": 7
  },
  "ń": {
    "x": 4,
    "y": 9,
    "width": 9
  },
  "ó": {
    "x": 5,
    "y": 9,
    "width": 8
  },
  "ś": {
    "x": 6,
    "y": 9,
    "width": 7
  },
  "ź": {
    "x": 7,
    "y": 9,
    "width": 8
  },
  "ż": {
    "x": 8,
    "y": 9,
    "width": 8
  },
  "Ą": {
    "x": 9,
    "y": 9,
    "width": 14
  },
  "Ć": {
    "x": 10,
    "y": 9,
    "width": 12
  },
  "Ę": {
    "x": 11,
    "y": 9,
    "width": 10,
    "extraHeightDown": 1
  },
  "Ł": {
    "x": 12,
    "y": 9,
    "width": 10
  },
  "Ń": {
    "x": 13,
    "y": 9,
    "width": 14,
    "extraHeightUp": 4
  },
  "Ó": {
    "x": 14,
    "y": 9,
    "width": 12,
    "extraHeightUp": 4
  },
  "Ś": {
    "x": 15,
    "y": 9,
    "width": 9,
    "extraHeightUp": 4
  },
  "Ź": {
    "x": 17,
    "y": 9,
    "width": 10,
    "extraHeightUp": 4
  },
  "Ż": {
    "x": 18,
    "y": 9,
    "width": 10,
    "extraHeightUp": 4
  },
  "á": {
    "x": 16,
    "y": 9,
    "width": 9
  },
  "é": {
    "x": 19,
    "y": 9,
    "width": 8
  },
  "í": {
    "x": 20,
    "y": 9,
    "width": 4
  },
  "ö": {
    "x": 21,
    "y": 9,
    "width": 8
  },
  "ő": {
    "x": 22,
    "y": 9,
    "width": 8
  },
  "ú": {
    "x": 23,
    "y": 9,
    "width": 9
  },
  "ű": {
    "x": 24,
    "y": 9,
    "width": 9
  },
  "ü": {
    "x": 25,
    "y": 9,
    "width": 9
  },
  "Á": {
    "x": 26,
    "y": 9,
    "width": 14,
    "extraHeightUp": 4
  },
  "É": {
    "x": 27,
    "y": 9,
    "width": 10,
    "extraHeightUp": 4
  },
  "Í": {
    "x": 28,
    "y": 9,
    "width": 6,
    "extraHeightUp": 4
  },
  "Ö": {
    "x": 29,
    "y": 9,
    "width": 12,
    "extraHeightUp": 4
  },
  "Ő": {
    "x": 30,
    "y": 9,
    "width": 12,
    "extraHeightUp": 4
  },
  "Ú": {
    "x": 31,
    "y": 9,
    "width": 11,
    "extraHeightUp": 4
  },
  "Ű": {
    "x": 32,
    "y": 9,
    "width": 11,
    "extraHeightUp": 4
  },
  "Ü": {
    "x": 33,
    "y": 9,
    "width": 11,
    "extraHeightUp": 4
  },
};