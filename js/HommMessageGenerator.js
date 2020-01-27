const MAX_WIDTH = 10;
const MAX_HEIGHT = 5;

const MAX_TEXT_LINES_NO_BUTTONS = 13;
const MAX_TEXT_LINES = 11;

const BORDER_SIZE = 64;
const BG_SIZE = 256;
const LINE_HEIGHT = 18;
const LETTER_SPACING = 1;

const HORIZONTAL_BORDER_HEIGHT = 15;
const VERTICAL_BORDER_WIDTH = 14;
const HORIZONTAL_COLOR_HEIGHT = 5;
const VERTICAL_COLOR_WIDTH = 4;

const COLOR_CORNER_SIZE = 56;

const BUTTON_SIZE = [66, 32];
const BUTTON_MARGIN = 16;

const SHADOW_OFFSET = [8, 8]; // отступ тени (всех её двух уровней)

const PADDING = { // отступы в пикселях
  "top": 17,
  "right": 16,
  // "right": 25, // originally: 16, пока не понял, почему нужно добавить лишнее
  "bottom": 15,
  "left": 16, // originally: 16, пока не понял, почему нужно добавить лишнее
  // "left": 23, // originally: 16, пока не понял, почему нужно добавить лишнее
  "left_with_scroll": 11,
  "right_with_scroll": 35
}

const SCROLL_SIDE = 16
const SCROLL_MARGINS = {
  "top": 20,
  "right": 11,
  "bottom": 23
}

class HommMessageGenerator {
  constructor() {
    // пользовательские переменные (изменяются руками)
    this.color = "red";

    this.buttons_show = {
      "ok": true,
      "cancel": false
    };

    this.showShadow = true

    this.text = ''

    //служебные переменные (заполняются сами)
    this.message_size = [0, 0];

    this.lines_for_text_count = 0;

    this.lines_offset = 0;

    this.scroll_visible = false;

    this.text_by_lines = []; // разбитый на строки текст
    this.split_words = []; // текст, разбитый по словам

    this.context = null
  }

  get useColor() {
    return !(this.color === "" || this.color === false || this.color === null || typeof this.color === "undefined")
  }

  get textLength() {
    return this.text.length
  }

  updateText(text) {
    if (typeof text === 'string') {
      this.text = text
    } else {
      this.text = text.toString()
    }
  }

  render() {
    this.setDefaults();
    this.breakInputIntoWordsAndSpaces();

    this.findMessageWindowSize();
    this.checkMaximumPopupWidth();

    this.splitTextToLines(true); // сначала попробуем разбить текст со скроллом
                                 // если со скроллом текста маловато, запустится рекурсия без скролла
    this.setCanvasSize();
    this.drawMessageWindow();
    this.drawText();
  }

  breakInputIntoWordsAndSpaces() {
    var output = [];

    var current_phase = "";
    var current_sequence = "";

    this.text.split('').forEach((char) => {
      var char_type = "";
      if(char.match(/^[\n\r]$/)) {
        char_type = "break";
      } else if(char.match(/^\s$/)) {
        char_type = "space";
      } else {
        char_type = "symbol";
      }
      if(current_phase != char_type) {
        if(current_sequence !== "") {
          output.push(current_sequence);
          current_sequence = "";
        }
        current_phase = char_type;
      }
      current_sequence += char;
      if(char_type == "break") {
        output.push(char);
        current_phase = char_type;
        current_sequence = "";
      }
    })

    if(current_sequence !== "") {
      output.push(current_sequence);
    }

    this.split_words = output;
  }

  splitTextToLines(text_has_scroll) {
    this.text_by_lines = [];
    this.scroll_visible = text_has_scroll;

    var current_line = [];
    var current_space_string = "";
    var current_line_width = 0;
    var is_new_line = false;
    var is_space_block = false;
    var block = "";

    var max_text_lines = (this.isButtonsVisible())
      ? MAX_TEXT_LINES
      : MAX_TEXT_LINES_NO_BUTTONS;

    for(var i=0;i<this.split_words.length;i++) {
      if(this.text_by_lines.length > max_text_lines) {
        break;
      }

      block = this.split_words[i];
      is_new_line = (block.match(/^[\n\r]+$/) !== null);
      is_space_block = (block.match(/^\s+$/) !== null && !is_new_line);

      if(is_new_line) {
        this.text_by_lines.push(current_line);
        current_line = [];
        current_space_string = "";
        current_line_width = 0;
        continue;
      } else if(is_space_block) {
        for(var j=0;j<block.length;j++) {
          var space_char = block[j];
          current_space_string += space_char;
          current_line_width += HommMessageGenerator.letters[" "].width;
          if(current_line_width > this.getPopupWidthWithoutPadding()) {
            current_line.push(current_space_string);
            this.text_by_lines.push(current_line);
            current_line = [];
            current_space_string = "";
            current_line_width = 0;
          }
        }
        if(current_space_string !== "") {
          current_line.push(current_space_string);
          current_space_string = "";
        }
      } else {
        var block_width = this.getStringWidth(block);
        if(current_line_width + block_width < this.getPopupWidthWithoutPadding()) {
          current_line.push(block);
          current_line_width += block_width;
        } else {
          if(current_line.length) {
            this.text_by_lines.push(current_line);
          }
          current_line = [block];
          current_line_width = block_width;
        }
      }
    }


    if(current_line.length) {
      this.text_by_lines.push(current_line);
    }

    if(text_has_scroll && (this.text_by_lines.length <= max_text_lines || (this.message_size[0] < MAX_WIDTH && this.message_size[1] < MAX_HEIGHT))) {
      this.splitTextToLines(false);
    } else {
      this.text_by_lines.splice(max_text_lines, this.text_by_lines.length - max_text_lines);
    }

    this.setPopupHeight();
  }

  drawText() {
    this.getLinesForTextCount();

    for(var line_index=0;line_index<this.text_by_lines.length;line_index++) {
      var text_line = this.text_by_lines[line_index];
      var current_x = 0;

      if(!this.scroll_visible) { // text align: center
        var joint_line = text_line.join("");
        var joint_line_width = this.getStringWidth(joint_line);
        current_x = Math.round((this.getPopupWidthWithoutPadding() - joint_line_width) / 2);
      } else {
        // render scroll
        this.drawScroll();
      }

      for(var word_index=0;word_index<text_line.length;word_index++) {
        var word = text_line[word_index];
        if(word === " " && word_index + 1 == text_line.length) {
          continue;
        }
        for(var char_index=0;char_index<word.length;char_index++) {
          var char = word[char_index];
          if(typeof HommMessageGenerator.letters[char] === "undefined") {
            continue;
          }
          var char_info = this.getCharInfo(char);
          var translateY = 0;
          if(typeof char_info.translateY !== "undefined") {
            translateY = char_info.translateY;
          }

          if(typeof char_info.marginLeft !== "undefined" && (word_index != 0 || char_index != 0 || char_info.marginLeft > 0)) {
            current_x += char_info.marginLeft;
          }

          if(typeof char_info.width !== "undefined" && typeof char_info.height !== "undefined") {
            var x_to_draw = this.getPadding("left") + current_x + this.getLineOffset("X");
            var y_to_draw =
              this.getPadding("top")
              + Math.floor((this.lines_for_text_count - this.text_by_lines.length)/2) * LINE_HEIGHT
              + line_index * LINE_HEIGHT
              + (LINE_HEIGHT - char_info.height)
              + translateY
              + this.getLineOffset("Y");
            this.context.drawImage(
              this.sprite,
              char_info.x,
              char_info.y,
              char_info.width,
              char_info.height,
              x_to_draw,
              y_to_draw,
              char_info.width,
              char_info.height,
            );
          }

          current_x += char_info.width;
          current_x += LETTER_SPACING;
          if(typeof char_info.marginRight !== "undefined") {
            current_x += char_info.marginRight;
          }
        }
      }
    }
  }

  getLinesForTextCount() {
    this.lines_for_text_count = (this.getPopupHeightWithoutPadding() - (this.isButtonsVisible() ? (BUTTON_SIZE[1] + BUTTON_MARGIN) : 0)) / LINE_HEIGHT;
    this.lines_for_text_count = Math.round(this.lines_for_text_count);
  }

  getLineOffset(which) {
    if(which == "X") {
      return this.lines_offset[0];
    }
    if(which == "Y") {
      return 0;
      if(this.text_by_lines.length == 5) {
        return this.lines_offset[1] + 18;
      } else {
        return this.lines_offset[1];
      }
    }
  }

  checkMaximumPopupWidth() {
    var maximum_string_width = 0;

    for(var i=0;i<this.split_words.length;i++) {
      var block = this.split_words[i];
      if(block.match(/^\s+$/)) { // строка только из пробелов совершает word-break, так что её не проверяем
        continue;
      }
      if(this.getStringWidth(block) > maximum_string_width) {
        maximum_string_width = this.getStringWidth(block);
      }
    }

    maximum_string_width += this.getPadding("left") + this.getPadding("right")
    // добавляем padding, ведь мы будем увеличивать общую длину, которая включает его в себя
    // нынешняя система PopupWidth — полная фигня

    if(maximum_string_width > this.getPopupWidth()) {
      this.message_size[0] = Math.min(Math.ceil(maximum_string_width/BORDER_SIZE), 100)
    }
  }

  setPopupHeight() {
    var proposed_height = 0;
    var text_height = this.text_by_lines.length * LINE_HEIGHT;
    var distractor = this.getPadding("top") + this.getPadding("bottom") + (this.isButtonsVisible() ? BUTTON_SIZE[1] : 0);
    for(var i=1;i<6;i++) {
      proposed_height = BORDER_SIZE * i - distractor;
      if (proposed_height > text_height) {
        if(this.message_size[1] < i) {
          this.message_size[1] = i;
        }
        return;
      }
    }

    // если не нашлось подходящего размера, ставим максимальный, при котором есть скролл (64 * 5 = 320)
    this.message_size[1] = 5;
  }

  getCharInfo(char) {
    if(typeof HommMessageGenerator.letters[char] === "undefined") {
      return null;
    }
    var original_char_info = HommMessageGenerator.letters[char];
    if(typeof original_char_info.same_as !== "undefined") {
      var real_char = original_char_info.same_as;
      return HommMessageGenerator.letters[real_char];
    } else {
      return original_char_info;
    }
  }

  getStringWidth(string) {
    var width = 0;
    for(var i=0;i<string.length;i++) {
      var char = string[i];
      if(typeof HommMessageGenerator.letters[char] === "undefined") {
        continue;
      }
      if(char === " " && i + 1 == string.length) { // trim only single last space on line
        continue;
      }
      if(width) {
        width += LETTER_SPACING;
      }
      var char_info = this.getCharInfo(char);

      width += char_info.width;
      if(typeof char_info.marginLeft !== "undefined" && i != 0) {
        width += char_info.marginLeft;
      }
      if(typeof char_info.marginRight !== "undefined") {
        width += char_info.marginRight;
      }
    }
    return width;
  }

  findMessageWindowSize() {
    var breakpoints = HommMessageGenerator.breakpoints;
    var suitable_size = breakpoints[0];
    var breakpoint_found = false;

    for (let i = 0; i < breakpoints.length-1; ++i) {
      if (this.textLength >= breakpoints[i].at && this.textLength < breakpoints[i+1].at) {
        breakpoint_found = true
        this.message_size[0] = breakpoints[i].width
        if (typeof breakpoints[i].height !== "undefined") {
          this.message_size[1] = breakpoints[i].height;
        }
        break
      }
    }

    if(!breakpoint_found) {
      if(this.message_size[0] == 0) {
        this.message_size[0] = breakpoints[breakpoints.length - 1].width;
      }
    }

    this.findLinesOffset();
  }

  findLinesOffset() {
    this.lines_offset = [0, 0];
    var offsets_depending_on_length = [
      {
        "count": 0,
        "offset": [0, 0]
      },
      {
        "count": 35,
        "offset": [-1, -1]
      },
      {
        "count": 60,
        "offset": [1, 10]
      },
      {
        "count": 90,
        "offset": [-1, -1]
      },
      {
        "count": 125,
        "offset": [-1, -14]
      },
      {
        "count": 160,
        "offset": [-1, -23]
      },
      {
        "count": 195,
        "offset": [0, -36]
      },
      {
        "count": 225,
        "offset": [0, -45]
      },
      {
        "count": 300,
        "offset": [0, 0]
      }
    ];

    for(var i=0;i<offsets_depending_on_length.length;i++) {
      var offset_object = offsets_depending_on_length[i];
      if(this.textLength > offset_object.count) {
        this.lines_offset = offset_object.offset;
      }
    }
  }

  setCanvasSize() {
    this.canvas.width = this.getCanvasWidth();
    this.canvas.height = this.getCanvasHeight();
  }

  getShadowWidth() {
    if (!this.showShadow) {
      return 0
    }
    return SHADOW_OFFSET[0]
  }

  getShadowHeight() {
    if (!this.showShadow) {
      return 0
    }
    return SHADOW_OFFSET[1]
  }

  getCanvasWidth() {
    return this.getPopupWidth() + this.getShadowWidth();
  }

  getCanvasHeight() {
    return this.getPopupHeight() + this.getShadowHeight();
  }

  getPopupWidth() {
    return this.message_size[0] * BORDER_SIZE;
  }

  getPopupWidthWithoutPadding() {
    return this.getPopupWidth() - this.getPadding("left") - this.getPadding("right");
  }

  getPopupHeight() {
    return this.message_size[1] * BORDER_SIZE;
  }

  getPopupHeightWithoutPadding() {
    return this.getPopupHeight() - this.getPadding("top") - this.getPadding("bottom");
  }

  drawShadow() {
    if (!this.showShadow) {
      return false
    }
    this.context.beginPath();
    this.context.fillStyle = "rgba(0,0,0,.1)";
    this.context.rect(
      SHADOW_OFFSET[0],
      SHADOW_OFFSET[1],
      this.getPopupWidth(),
      this.getPopupHeight()
    );
    this.context.fill();

    this.context.beginPath();
    this.context.fillStyle = "rgba(0,0,0,.1)";
    this.context.rect(
      SHADOW_OFFSET[0] + 1,
      SHADOW_OFFSET[1] + 1,
      this.getPopupWidth() - 2,
      this.getPopupHeight() - 2
    );
    this.context.fill();
  }

  drawBackground() {
    var x_cycles = Math.ceil(this.message_size[0] * BORDER_SIZE / BG_SIZE);
    var y_cycles = Math.ceil(this.message_size[1] * BORDER_SIZE / BG_SIZE);
    for(var y=0;y<y_cycles;y++) {
      for(var x=0;x<x_cycles;x++) {
        var width_to_draw = BG_SIZE;
        var height_to_draw = BG_SIZE;
        if(x + 1 == x_cycles) {
          width_to_draw = this.getPopupWidth() - x * BG_SIZE;
        }
        if(y + 1 == y_cycles) {
          height_to_draw = this.getPopupHeight() - y * BG_SIZE;
        }

        this.context.drawImage(
          this.sprite,
          648,
          0,
          width_to_draw,
          height_to_draw,
          x * BG_SIZE,
          y * BG_SIZE,
          width_to_draw,
          height_to_draw
        );
      }
    }
  }

  drawMessageWindow() {
    this.drawShadow();

    if(this.useColor) {
      var color_info = HommMessageGenerator.colors[this.color];
    }

    this.drawBackground();

    // corners
    for(var y=0;y<2;y++) {
      for(var x=0;x<2;x++) {
        var x_to_set = 0;
        var x_to_cut = 0;
        var color_x_to_set = 8;
        if (x == 1) {
          x_to_set = this.getPopupWidth() - BORDER_SIZE;
          x_to_cut = BORDER_SIZE;
          color_x_to_set = this.getPopupWidth() - 8 - COLOR_CORNER_SIZE;
        }
        var y_to_set = 0;
        var y_to_cut = 0;
        var color_y_to_set = 8;
        if (y == 1) {
          y_to_set = this.getPopupHeight() - BORDER_SIZE;
          y_to_cut = BORDER_SIZE;
          color_y_to_set = this.getPopupHeight() - 8 - COLOR_CORNER_SIZE;
        }

        this.context.drawImage(
          this.sprite,
          x_to_cut,
          y_to_cut,
          BORDER_SIZE,
          BORDER_SIZE,
          x_to_set,
          y_to_set,
          BORDER_SIZE,
          BORDER_SIZE,
        );

        // color
        if(this.useColor) {
          this.context.drawImage(
            this.sprite,
            color_info.corners_offset[0] + (1 + COLOR_CORNER_SIZE) * x,
            color_info.corners_offset[1] + (1 + COLOR_CORNER_SIZE) * y,
            COLOR_CORNER_SIZE,
            COLOR_CORNER_SIZE,
            color_x_to_set,
            color_y_to_set,
            COLOR_CORNER_SIZE,
            COLOR_CORNER_SIZE
          );
        }
      }
    }

    // horizontal borders
    for(var i=1;i<this.message_size[0]-1;i++) {
      var x_to_set = i * BORDER_SIZE;
      var y_to_set = this.getCanvasHeight() - HORIZONTAL_BORDER_HEIGHT - this.getShadowHeight();
      // upper
      this.context.drawImage(
        this.sprite,
        BORDER_SIZE * 2,
        0,
        BORDER_SIZE,
        HORIZONTAL_BORDER_HEIGHT,
        x_to_set,
        0,
        BORDER_SIZE,
        HORIZONTAL_BORDER_HEIGHT
      );

      // lower
      this.context.drawImage(
        this.sprite,
        BORDER_SIZE * 2,
        HORIZONTAL_BORDER_HEIGHT + BORDER_SIZE,
        BORDER_SIZE,
        HORIZONTAL_BORDER_HEIGHT,
        x_to_set,
        y_to_set,
        BORDER_SIZE,
        HORIZONTAL_BORDER_HEIGHT
      );

      // colors
      if(this.useColor) {
        // upper
        this.context.drawImage(
          this.sprite,
          BORDER_SIZE * 2,
          color_info.horizontals_offset,
          BORDER_SIZE,
          HORIZONTAL_COLOR_HEIGHT,
          x_to_set,
          8,
          BORDER_SIZE,
          HORIZONTAL_COLOR_HEIGHT
        );

        // lower
        this.context.drawImage(
          this.sprite,
          BORDER_SIZE * 2,
          color_info.horizontals_offset + 1 + HORIZONTAL_COLOR_HEIGHT,
          BORDER_SIZE,
          HORIZONTAL_COLOR_HEIGHT,
          x_to_set,
          y_to_set + 2,
          BORDER_SIZE,
          HORIZONTAL_COLOR_HEIGHT
        );
      }
    }

    // vertical
    for(var i=1;i<this.message_size[1]-1;i++) {
      var right_x_to_set = this.getCanvasWidth() - VERTICAL_BORDER_WIDTH - this.getShadowWidth();
      var y_to_set = i * BORDER_SIZE;
      // left
      this.context.drawImage(
        this.sprite,
        BORDER_SIZE * 2,
        HORIZONTAL_BORDER_HEIGHT,
        VERTICAL_BORDER_WIDTH,
        BORDER_SIZE,
        0,
        y_to_set,
        VERTICAL_BORDER_WIDTH,
        BORDER_SIZE
      );

      // right
      this.context.drawImage(
        this.sprite,
        BORDER_SIZE * 3 - VERTICAL_BORDER_WIDTH,
        HORIZONTAL_BORDER_HEIGHT,
        VERTICAL_BORDER_WIDTH,
        BORDER_SIZE,
        right_x_to_set,
        y_to_set,
        VERTICAL_BORDER_WIDTH,
        BORDER_SIZE
      );

      // colors
      if(this.useColor) {
        // left
        this.context.drawImage(
          this.sprite,
          color_info.verticals_offset,
          BORDER_SIZE * 2,
          VERTICAL_COLOR_WIDTH,
          BORDER_SIZE,
          8,
          y_to_set,
          VERTICAL_COLOR_WIDTH,
          BORDER_SIZE
        );

        // right
        this.context.drawImage(
          this.sprite,
          color_info.verticals_offset,
          BORDER_SIZE * 2,
          VERTICAL_COLOR_WIDTH,
          BORDER_SIZE,
          right_x_to_set + 2,
          y_to_set,
          VERTICAL_COLOR_WIDTH,
          BORDER_SIZE
        );
      }
    }

    // buttons
    var buttons_number = ((this.buttons_show.ok) ? 1 : 0) + ((this.buttons_show.cancel) ? 1 : 0);
    var button_y = this.getPopupHeight() - BUTTON_SIZE[1] - this.getPadding("bottom");
    if(this.buttons_show.ok) {
      var ok_x;
      if(buttons_number == 1) {
        ok_x = (this.getPopupWidth() - BUTTON_SIZE[0]) / 2;
      }
      if(buttons_number == 2) {
        ok_x = this.getPopupWidth() / 2 - (BUTTON_SIZE[0] + BUTTON_MARGIN / 2);
      }
      this.context.drawImage(
        this.sprite,
        516,
        228,
        BUTTON_SIZE[0],
        BUTTON_SIZE[1],
        ok_x,
        button_y,
        BUTTON_SIZE[0],
        BUTTON_SIZE[1]
      );
    }

    if(this.buttons_show.cancel) {
      var cancel_x;
      if(buttons_number == 2) {
        cancel_x = (this.getPopupWidth() + BUTTON_MARGIN) / 2;
      }
      if(buttons_number == 1) {
        cancel_x = (this.getPopupWidth() - BUTTON_SIZE[0]) / 2;
      }
      this.context.drawImage(
        this.sprite,
        516,
        259,
        BUTTON_SIZE[0],
        BUTTON_SIZE[1],
        cancel_x,
        button_y,
        BUTTON_SIZE[0],
        BUTTON_SIZE[1]
      );
    }
  }

  getPadding(which) {
    var padding_to_return = PADDING[which];
    if(this.scroll_visible && which == "right") {
      padding_to_return = PADDING.right_with_scroll + SCROLL_MARGINS.right + SCROLL_SIDE;
    }
    if(this.scroll_visible && which == "left") {
      padding_to_return = PADDING.left_with_scroll;
    }
    var border_size = (which == "top" || which == "bottom")
      ? HORIZONTAL_BORDER_HEIGHT
      : VERTICAL_BORDER_WIDTH;
    return padding_to_return + border_size;
  }

  drawScroll() {
    var scroll_x = this.getPopupWidth() - VERTICAL_BORDER_WIDTH - SCROLL_SIDE - SCROLL_MARGINS.right;
    var scroll_start_y = HORIZONTAL_BORDER_HEIGHT + SCROLL_MARGINS.top;
    var scroll_end_y = this.getPopupHeight() - this.getPadding("bottom") - (this.isButtonsVisible() ? (BUTTON_SIZE[1] + SCROLL_MARGINS.bottom) : 0);
    // top arrow
    this.context.drawImage(
      this.sprite,
      714,
      257,
      SCROLL_SIDE,
      SCROLL_SIDE,
      scroll_x,
      scroll_start_y,
      SCROLL_SIDE,
      SCROLL_SIDE
    );

    // scroll handle
    this.context.drawImage(
      this.sprite,
      731,
      257,
      SCROLL_SIDE,
      SCROLL_SIDE,
      scroll_x,
      scroll_start_y + SCROLL_SIDE,
      SCROLL_SIDE,
      SCROLL_SIDE
    );

    // bottom arrow
    this.context.drawImage(
      this.sprite,
      748,
      257,
      SCROLL_SIDE,
      SCROLL_SIDE,
      scroll_x,
      scroll_end_y - SCROLL_SIDE,
      SCROLL_SIDE,
      SCROLL_SIDE
    );

    // scroll track
    this.context.fillStyle = "#000";
    this.context.beginPath();
    this.context.rect(
      scroll_x,
      scroll_start_y + 32,
      SCROLL_SIDE,
      scroll_end_y - scroll_start_y - 48
    );
    this.context.fill();
  }

  isButtonsVisible() {
    return this.buttons_show.ok || this.buttons_show.cancel;
  }

  setDefaults() {
    this.context.clearRect(0, 0, this.getCanvasWidth(), this.getCanvasHeight());
    this.message_size = [0, 0];
  }

  setColor(color) {
    this.color = color;

    this.render();
  }
}

HommMessageGenerator.letters = {
  " ": {
    "width": 3
  },

  // digits
  "0": {
    "width": 7,
    "height": 10,
    "x": 0,
    "y": 265,
    "marginRight": 1
  },
  "1": {
    "width": 7,
    "height": 10,
    "x": 7,
    "y": 265,
    "marginLeft": -1
  },
  "2": {
    "width": 7,
    "height": 10,
    "x": 14,
    "y": 265
  },
  "3": {
    "width": 7,
    "height": 10,
    "x": 21,
    "y": 265
  },
  "4": {
    "width": 7,
    "height": 10,
    "x": 28,
    "y": 265
  },
  "5": {
    "width": 7,
    "height": 10,
    "x": 35,
    "y": 265
  },
  "6": {
    "width": 7,
    "height": 10,
    "x": 42,
    "y": 265,
    "marginRight": 1
  },
  "7": {
    "width": 7,
    "height": 10,
    "x": 49,
    "y": 265,
    "marginRight": -1
  },
  "8": {
    "width": 7,
    "height": 10,
    "x": 56,
    "y": 265
  },
  "9": {
    "width": 7,
    "height": 10,
    "x": 63,
    "y": 265
  },

  // signs
  "&": {
    "width": 10,
    "height": 10,
    "x": 70,
    "y": 265
  },
  "*": {
    "width": 6,
    "height": 5,
    "x": 80,
    "y": 265,
    "translateY": -5
  },
  "@": {
    "width": 10,
    "height": 10,
    "x": 86,
    "y": 265
  },
  "[": {
    "width": 4,
    "height": 13,
    "x": 96,
    "y": 262,
    "translateY": 3,
    "marginLeft": 1
  },
  "]": {
    "width": 4,
    "height": 13,
    "x": 100,
    "y": 262,
    "translateY": 3
  },
  ":": {
    "width": 2,
    "height": 7,
    "x": 104,
    "y": 268
  },
  ",": {
    "width": 4,
    "height": 5,
    "x": 106,
    "y": 272,
    "translateY": 2,
    "marginRight": -1
  },
  "-": {
    "width": 5,
    "height": 2,
    "x": 110,
    "y": 269,
    "translateY": -3,
    "marginRight": -1
  },
  "–": {
    "width": 7,
    "height": 2,
    "x": 247,
    "y": 269,
    "translateY": -3,
    "marginLeft": 1,
    "marginRight": -1
  },
  "—": {
    "same_as": "–"
  },
  "$": {
    "width": 6,
    "height": 12,
    "x": 115,
    "y": 263
  },
  ".": {
    "width": 2,
    "height": 2,
    "x": 121,
    "y": 273,
    "marginLeft": 1
  },
  "=": {
    "width": 8,
    "height": 4,
    "x": 123,
    "y": 268,
    "translateY": -5
  },
  "!": {
    "width": 2,
    "height": 10,
    "x": 131,
    "y": 265,
    "marginLeft": 1,
    "marginRight": 1
  },
  "<": {
    "width": 7,
    "height": 8,
    "x": 133,
    "y": 267
  },
  "#": {
    "width": 8,
    "height": 10,
    "x": 140,
    "y": 265
  },
  ">": {
    "width": 7,
    "height": 8,
    "x": 148,
    "y": 267
  },
  "(": {
    "width": 4,
    "height": 13,
    "x": 155,
    "y": 264,
    "translateY": 3
  },
  ")": {
    "width": 4,
    "height": 13,
    "x": 159,
    "y": 264,
    "translateY": 3,
    "marginLeft": 1,
    "marginRight": -1
  },
  "%": {
    "width": 10,
    "height": 10,
    "x": 163,
    "y": 265
  },
  "+": {
    "width": 8,
    "height": 8,
    "x": 173,
    "y": 266,
    "translateY": -1
  },
  "^": {
    "width": 6,
    "height": 6,
    "x": 181,
    "y": 264,
    "translateY": -5
  },
  "?": {
    "width": 5,
    "height": 10,
    "x": 187,
    "y": 265
  },
  "`": {
    "width": 3,
    "height": 3,
    "x": 192,
    "y": 265,
    "translateY": -7
  },
  "\"": {
    "width": 4,
    "height": 5,
    "x": 195,
    "y": 265,
    "translateY": -6
  },
  "'": {
    "width": 2,
    "height": 5,
    "x": 199,
    "y": 265,
    "translateY": -6
  },
  "«": {
    "width": 6,
    "height": 4,
    "x": 201,
    "y": 268,
    "translateY": -3
  },
  "»": {
    "width": 6,
    "height": 4,
    "x": 207,
    "y": 265,
    "translateY": -3
  },
  ";": {
    "width": 4,
    "height": 9,
    "x": 213,
    "y": 268,
    "translateY": 2
  },
  "/": {
    "width": 6,
    "height": 13,
    "x": 217,
    "y": 265,
    "translateY": 2
  },
  "\\": {
    "width": 6,
    "height": 13,
    "x": 264,
    "y": 265,
    "translateY": 2
  },
  "~": {
    "width": 8,
    "height": 3,
    "x": 229,
    "y": 267,
    "translateY": -5
  },
  "_": {
    "width": 8,
    "height": 2,
    "x": 237,
    "y": 273
  },
  "|": {
    "width": 2,
    "height": 13,
    "x": 245,
    "y": 264,
    "translateY": 2
  },

  // eng lowercase
  "a": {
    "width": 7,
    "height": 7,
    "x": 0,
    "y": 250
  },
  "b": {
    "width": 7,
    "height": 10,
    "x": 7,
    "y": 247
  },
  "c": {
    "width": 6,
    "height": 7,
    "x": 14,
    "y": 250
  },
  "d": {
    "width": 7,
    "height": 10,
    "x": 20,
    "y": 247,
    "marginLeft": 1
  },
  "e": {
    "width": 6,
    "height": 7,
    "x": 27,
    "y": 250
  },
  "f": {
    "width": 5,
    "height": 10,
    "x": 33,
    "y": 247,
    "marginRight": -1
  },
  "g": {
    "width": 7,
    "height": 11,
    "x": 38,
    "y": 250,
    "translateY": 4
  },
  "h": {
    "width": 8,
    "height": 10,
    "x": 45,
    "y": 247
  },
  "i": {
    "width": 4,
    "height": 9,
    "x": 53,
    "y": 248
  },
  "j": {
    "width": 4,
    "height": 13,
    "x": 57,
    "y": 248,
    "translateY": 4,
    "marginLeft": -1
  },
  "k": {
    "width": 8,
    "height": 10,
    "x": 61,
    "y": 247,
    "marginRight": -1
  },
  "l": {
    "width": 4,
    "height": 10,
    "x": 69,
    "y": 247
  },
  "m": {
    "width": 12,
    "height": 7,
    "x": 73,
    "y": 250,
    "marginRight": -1
  },
  "n": {
    "width": 8,
    "height": 7,
    "x": 85,
    "y": 250
  },
  "o": {
    "width": 7,
    "height": 7,
    "x": 93,
    "y": 250
  },
  "p": {
    "width": 8,
    "height": 11,
    "x": 100,
    "y": 250,
    "translateY": 4
  },
  "q": {
    "width": 8,
    "height": 11,
    "x": 108,
    "y": 250,
    "translateY": 4,
    "marginRight": -1
  },
  "r": {
    "width": 6,
    "height": 7,
    "x": 116,
    "y": 250,
    "marginRight": -1
  },
  "s": {
    "width": 5,
    "height": 7,
    "x": 122,
    "y": 250,
    "marginRight": 1
  },
  "t": {
    "width": 5,
    "height": 9,
    "x": 127,
    "y": 248,
    "marginLeft": -1
  },
  "u": {
    "width": 8,
    "height": 7,
    "x": 132,
    "y": 250
  },
  "v": {
    "width": 8,
    "height": 7,
    "x": 140,
    "y": 250,
    "marginRight": -1
  },
  "w": {
    "width": 11,
    "height": 7,
    "x": 148,
    "y": 250
  },
  "x": {
    "width": 7,
    "height": 7,
    "x": 159,
    "y": 250
  },
  "y": {
    "width": 8,
    "height": 11,
    "x": 166,
    "y": 250,
    "translateY": 4,
    "marginRight": -1
  },
  "z": {
    "width": 7,
    "height": 7,
    "x": 174,
    "y": 250
  },

  // eng uppercase
  "A": {
    "width": 10,
    "height": 10,
    "x": 181,
    "y": 247
  },
  "B": {
    "width": 8,
    "height": 10,
    "x": 191,
    "y": 247
  },
  "C": {
    "width": 9,
    "height": 10,
    "x": 199,
    "y": 247
  },
  "D": {
    "width": 10,
    "height": 10,
    "x": 208,
    "y": 247
  },
  "E": {
    "width": 8,
    "height": 10,
    "x": 218,
    "y": 247
  },
  "F": {
    "width": 7,
    "height": 10,
    "x": 226,
    "y": 247
  },
  "G": {
    "width": 10,
    "height": 10,
    "x": 233,
    "y": 247
  },
  "H": {
    "width": 11,
    "height": 10,
    "x": 243,
    "y": 247
  },
  "I": {
    "width": 4,
    "height": 10,
    "x": 254,
    "y": 247
  },
  "J": {
    "width": 5,
    "height": 13,
    "x": 258,
    "y": 247,
    "translateY": 3,
    "marginLeft": -1
  },
  "K": {
    "width": 10,
    "height": 10,
    "x": 263,
    "y": 247,
    "marginRight": -1
  },
  "L": {
    "width": 8,
    "height": 10,
    "x": 273,
    "y": 247
  },
  "M": {
    "width": 12,
    "height": 10,
    "x": 281,
    "y": 247
  },
  "N": {
    "width": 11,
    "height": 10,
    "x": 293,
    "y": 247
  },
  "O": {
    "width": 10,
    "height": 10,
    "x": 304,
    "y": 247
  },
  "P": {
    "width": 8,
    "height": 10,
    "x": 314,
    "y": 247
  },
  "Q": {
    "width": 10,
    "height": 12,
    "x": 322,
    "y": 247,
    "translateY": 2
  },
  "R": {
    "width": 9,
    "height": 10,
    "x": 332,
    "y": 247
  },
  "S": {
    "width": 7,
    "height": 10,
    "x": 341,
    "y": 247
  },
  "T": {
    "width": 8,
    "height": 10,
    "x": 348,
    "y": 247
  },
  "U": {
    "width": 10,
    "height": 10,
    "x": 356,
    "y": 247
  },
  "V": {
    "width": 10,
    "height": 10,
    "x": 366,
    "y": 247,
    "marginRight": -1
  },
  "W": {
    "width": 14,
    "height": 10,
    "x": 376,
    "y": 247,
    "marginRight": -1
  },
  "X": {
    "width": 9,
    "height": 10,
    "x": 390,
    "y": 247
  },
  "Y": {
    "width": 9,
    "height": 10,
    "x": 399,
    "y": 247
  },
  "Z": {
    "width": 9,
    "height": 10,
    "x": 408,
    "y": 247
  },

  // rus lowercase
  "а": {
    "same_as": "a"
  },
  "б": {
    "width": 6,
    "height": 10,
    "x": 0,
    "y": 283,
    "marginLeft": 1
  },
  "в": {
    "width": 6,
    "height": 7,
    "x": 6,
    "y": 286
  },
  "г": {
    "width": 7,
    "height": 7,
    "x": 12,
    "y": 286,
    "marginRight": -1
  },
  "д": {
    "width": 8,
    "height": 9,
    "x": 19,
    "y": 286,
    "translateY": 2,
    "marginRight": -1
  },
  "е": {
    "same_as": "e"
  },
  "ё": {
    "width": 6,
    "height": 9,
    "x": 27,
    "y": 284
  },
  "ж": {
    "width": 10,
    "height": 7,
    "x": 33,
    "y": 286
  },
  "з": {
    "width": 5,
    "height": 7,
    "x": 43,
    "y": 286
  },
  "и": {
    "width": 8,
    "height": 7,
    "x": 48,
    "y": 286
  },
  "й": {
    "width": 8,
    "height": 9,
    "x": 56,
    "y": 284
  },
  "к": {
    "width": 8,
    "height": 7,
    "x": 64,
    "y": 286,
    "marginRight": -1
  },
  "л": {
    "width": 7,
    "height": 7,
    "x": 72,
    "y": 286
  },
  "м": {
    "width": 10,
    "height": 7,
    "x": 79,
    "y": 286,
    "marginRight": -1
  },
  "н": {
    "width": 8,
    "height": 7,
    "x": 89,
    "y": 286
  },
  "о": {
    "same_as": "o"
  },
  "п": {
    "width": 8,
    "height": 7,
    "x": 97,
    "y": 286
  },
  "р": {
    "same_as": "p"
  },
  "с": {
    "same_as": "c"
  },
  "т": {
    "width": 6,
    "height": 7,
    "x": 105,
    "y": 286
  },
  "у": {
    "same_as": "y"
  },
  "ф": {
    "width": 11,
    "height": 14,
    "x": 121,
    "y": 283,
    "translateY": 4
  },
  "х": {
    "same_as": "x"
  },
  "ц": {
    "width": 8,
    "height": 9,
    "x": 132,
    "y": 286,
    "translateY": 2
  },
  "ч": {
    "width": 8,
    "height": 7,
    "x": 140,
    "y": 286,
    "marginRight": -1
  },
  "ш": {
    "width": 12,
    "height": 7,
    "x": 148,
    "y": 286,
    "marginRight": -1
  },
  "щ": {
    "width": 12,
    "height": 9,
    "x": 160,
    "y": 286,
    "translateY": 2,
    "marginLeft": -1
  },
  "ъ": {
    "width": 7,
    "height": 7,
    "x": 172,
    "y": 286
  },
  "ы": {
    "width": 11,
    "height": 7,
    "x": 179,
    "y": 286,
    "marginRight": -1
  },
  "ь": {
    "width": 6,
    "height": 7,
    "x": 190,
    "y": 286
  },
  "э": {
    "width": 6,
    "height": 7,
    "x": 196,
    "y": 286
  },
  "ю": {
    "width": 10,
    "height": 7,
    "x": 202,
    "y": 286
  },
  "я": {
    "width": 8,
    "height": 7,
    "x": 212,
    "y": 286,
    "marginRight": -1
  },

  // rus uppercase
  "А": {
    "same_as": "A"
  },
  "Б": {
    "width": 8,
    "height": 10,
    "x": 220,
    "y": 283
  },
  "В": {
    "same_as": "B"
  },
  "Г": {
    "width": 8,
    "height": 10,
    "x": 228,
    "y": 283,
    "marginRight": -1
  },
  "Д": {
    "width": 10,
    "height": 12,
    "x": 236,
    "y": 283,
    "translateY": 2
  },
  "Е": {
    "same_as": "E"
  },
  "Ё": {
    "width": 8,
    "height": 12,
    "x": 246,
    "y": 281
  },
  "Ж": {
    "width": 14,
    "height": 10,
    "x": 254,
    "y": 283,
    "marginRight": -1
  },
  "З": {
    "width": 7,
    "height": 10,
    "x": 268,
    "y": 283
  },
  "И": {
    "width": 11,
    "height": 10,
    "x": 275,
    "y": 283
  },
  "Й": {
    "width": 11,
    "height": 12,
    "x": 286,
    "y": 281
  },
  "К": {
    "same_as": "K"
  },
  "Л": {
    "width": 10,
    "height": 10,
    "x": 297,
    "y": 283
  },
  "М": {
    "same_as": "M"
  },
  "Н": {
    "same_as": "H"
  },
  "О": {
    "same_as": "O"
  },
  "П": {
    "width": 11,
    "height": 10,
    "x": 307,
    "y": 283
  },
  "Р": {
    "same_as": "P"
  },
  "С": {
    "same_as": "C"
  },
  "Т": {
    "same_as": "T"
  },
  "У": {
    "width": 10,
    "height": 13,
    "x": 318,
    "y": 283,
    "translateY": 3,
    "marginRight": -1
  },
  "Ф": {
    "width": 12,
    "height": 10,
    "x": 328,
    "y": 283,
    "marginRight": -1
  },
  "Х": {
    "same_as": "X"
  },
  "Ц": {
    "width": 12,
    "height": 12,
    "x": 340,
    "y": 283,
    "translateY": 2,
    "marginRight": -1
  },
  "Ч": {
    "width": 10,
    "height": 10,
    "x": 352,
    "y": 283
  },
  "Ш": {
    "width": 14,
    "height": 10,
    "x": 362,
    "y": 283
  },
  "Щ": {
    "width": 15,
    "height": 12,
    "x": 376,
    "y": 283,
    "translateY": 2,
    "marginRight": -1
  },
  "Ъ": {
    "width": 9,
    "height": 10,
    "x": 391,
    "y": 283
  },
  "Ы": {
    "width": 11,
    "height": 10,
    "x": 400,
    "y": 283,
    "marginRight": 1
  },
  "Ь": {
    "width": 8,
    "height": 10,
    "x": 411,
    "y": 283,
    "marginLeft": 1
  },
  "Э": {
    "width": 9,
    "height": 10,
    "x": 419,
    "y": 283
  },
  "Ю": {
    "width": 15,
    "height": 10,
    "x": 428,
    "y": 283
  },
  "Я": {
    "width": 9,
    "height": 10,
    "x": 443,
    "y": 283
  },

}


// количество ячеек 64x64 по горизонтали и вертикали в зависимости от числа символов
HommMessageGenerator.breakpoints = [
  {
    "at" : 0,
    "width": 4,
    "height": 2
  },
  {
    "at": 20, // значит >= 20 символов
    "width": 5,
    "height": 2
  },
  {
    "at": 35,
    "width": 5,
    "height": 3
  },
  {
    "at": 125,
    "width": 5,
    "height": 4
  },
  {
    "at": 225,
    "width": 7
  },
  {
    "at": 520,
    "width": 10
  }
];

HommMessageGenerator.colors = {
  "red": {
    "corners_offset": [192, 0],
    "horizontals_offset": 95,
    "verticals_offset": 0,
    "flag": ""
  },
  "blue": {
    "corners_offset": [192, 114],
    "horizontals_offset": 107,
    "verticals_offset": 10,
    "flag": ""
  },
  "brown": {
    "corners_offset": [306, 0],
    "horizontals_offset": 119,
    "verticals_offset": 20,
    "flag": ""
  },
  "green": {
    "corners_offset": [306, 114],
    "horizontals_offset": 131,
    "verticals_offset": 30,
    "flag": ""
  },
  "orange": {
    "corners_offset": [420, 0],
    "horizontals_offset": 143,
    "verticals_offset": 40,
    "flag": ""
  },
  "violet": {
    "corners_offset": [420, 114],
    "horizontals_offset": 155,
    "verticals_offset": 50,
    "flag": ""
  },
  "teal": {
    "corners_offset": [534, 0],
    "horizontals_offset": 167,
    "verticals_offset": 60,
    "flag": ""
  },
  "pink": {
    "corners_offset": [534, 114],
    "horizontals_offset": 179,
    "verticals_offset": 70,
    "flag": ""
  },
};

module.exports = HommMessageGenerator
