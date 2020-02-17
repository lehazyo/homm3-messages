class HommMessageGenerator {
  constructor() {
    this.max_width = 10;
    this.max_height = 5;
    this.message_size_index = 0;
    this.message_size = null; // will be set in splitTextToLines
    this.forced_width = 0;
    this.forced_height = 0;

    this.border_size = 64;
    this.bg_size = 256;
    this.line_height = 18;
    this.letter_spacing = 1;
    this.raise_by_half_line = false;

    this.horizontal_border_height = 15;
    this.vertical_border_width = 14;
    this.horizontal_color_height = 5;
    this.vertical_color_width = 4;
    
    this.color_corner_size = 56;
    this.color = "red";
    this.use_color = true;
    
    this.buttons_show = {
      "ok": true,
      "cancel": false
    };
    this.button_size = [66, 32];
    this.button_margin = 16;
    if(this.color === "" || this.color == false || this.color == null || typeof this.color === "undefined") {
      this.use_color = false;
    }

    this.shadow_offset = [8, 8]; // отступ тени (всех её двух уровней)

    this.padding = { // отступы в пикселях
      "top": 11,
      "bottom": 15,
      "right": 11,
      "left": 10
    };

    this.scroll_side = 16;
    this.scroll_margins = {
      "top": 20,
      "right": 11,
      "bottom": 23
    }
    this.scroll_visible = false;
    this.lines_needed_to_show_scroll = 12; // how many lines of text you need for scroll to appear

    this.text_by_lines = []; // разбитый на строки текст
    this.split_words = []; // текст, разбитый по словам

    this.sprite = new Image();
    this.sprite.src = "img/sprite.png";

    this.input = document.getElementById("input");
    this.input.addEventListener("input", this.render.bind(this));
    this.canvas = document.getElementById("canvas");
    this.context = this.canvas.getContext("2d");

    this.initControls();

    this.sprite.onload = function() {
      this.render();
    }.bind(this);
  }

  render() {
    this.setDefaults();
    this.breakInputIntoWordsAndSpaces();
    /*
    this.splitTextToLines(true); // сначала попробуем разбить текст со скроллом
                                 // если со скроллом текста маловато, запустится рекурсия без скролла
    */
    this.splitTextToLines();
    this.setCanvasSize();
    this.drawMessageWindow();
    this.drawText();
  }

  breakInputIntoWordsAndSpaces() {
    var output = [];

    var current_phase = "";
    var current_sequence = "";

    for(var i=0;i<this.getInputValueLength();i++) {
      var char = this.getInputValue()[i];
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
    }
    if(current_sequence !== "") {
      output.push(current_sequence);
    }

    this.split_words = output;

    this.checkForcedWidth();
  }

  splitTextToLines() {
    var suitable_size_found = false;

    var current_line = [];
    var current_space_string = "";
    var is_new_line = false;
    var is_space_block = false;
    var block = "";
    var is_line_last = false;
    var half_at = false;
    var resize_at = false;
    var current_line_with_block = "";
    var current_line_with_block_width = 0;
    var last_line_width = 0;

    for(
      this.message_size_index = 0;
      this.message_size_index < HommMessageGenerator.sizes.length;
      this.message_size_index++
    ) { // cycling through all possible sizes
      this.text_by_lines = [];

      this.message_size = HommMessageGenerator.sizes[this.message_size_index];
      this.scroll_visible = (typeof this.message_size.scroll !== "undefined" && this.message_size.scroll);

      if(this.split_words.length === 0) {
        break;
      }

      current_line = [];
      current_space_string = "";
      is_new_line = false;
      is_space_block = false;
      block = "";


      for(var i=0;i<this.split_words.length;i++) {
        this.raise_by_half_line = false;

        half_at = this.getHalfAt();
        resize_at = this.getResizeAt();

        is_line_last = (this.text_by_lines.length == this.message_size.max_text_lines);

        suitable_size_found = true;

        block = this.split_words[i];
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

        // if width with space block is enough to trigger resize, let's trigger it
        if(resize_at && 
            (current_line_with_space_block_width >= resize_at
             || current_line_with_block_width >= resize_at)
        ) {
          break;
        }

        if(half_at && 
            (current_line_with_space_block_width >= half_at
             || current_line_with_block_width >= half_at)
        ) {
          this.raise_by_half_line = true;
        }
      }

      // line remainder makes the new line
      if(current_line.length) {
        this.text_by_lines.push(current_line);

        last_line_width = this.getStringWidth(current_line.join(""));

        resize_at = this.getResizeAt();
        if(resize_at && last_line_width >= resize_at) {
          continue; // trying next message size
        }

        half_at = this.getHalfAt();
        this.raise_by_half_line = (half_at && last_line_width >= half_at);
      }

      if(this.text_by_lines.length > this.message_size.max_text_lines) {
        suitable_size_found = false;

        this.text_by_lines.splice(this.message_size.max_text_lines, this.text_by_lines.length - this.message_size.max_text_lines);
      }

      if(suitable_size_found) {
        // if suitable size is found, we don't need to search bigger sizes
        break;
      }
    }
  }

  getInputValue() {
    return this.input.value;
  }

  getInputValueLength() {
    return this.getInputValue().length;
  }

  drawText() {
    for(var line_index=0;line_index<this.text_by_lines.length;line_index++) {
      var text_line = this.text_by_lines[line_index];
      var current_x = 0;
      
      if(!this.scroll_visible) { // text align: center
        var joint_line = text_line.join("");
        var joint_line_width = this.getStringWidth(joint_line);
        current_x = Math.floor((this.getPopupWidthWithoutPadding() - joint_line_width) / 2);
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

          if(typeof char_info.marginLeft !== "undefined" && (word_index != 0 || char_index != 0 || char_info.marginLeft > 0)) {
            current_x += char_info.marginLeft;
          }

          if(typeof char_info.width !== "undefined" && typeof char_info.height !== "undefined") {
            var x_to_draw = this.getPadding("left") + current_x;
            var y_to_draw = this.getLetterY(line_index, char_info);


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
          current_x += this.letter_spacing;
          if(typeof char_info.marginRight !== "undefined") {
            current_x += char_info.marginRight;
          }
        }
      }
    }
  }

  getLinesForTextCount() {
    var lines_for_text_count = (this.getPopupHeightWithoutPadding() - (this.isButtonsVisible() ? (this.button_size[1] + this.button_margin) : 0)) / this.line_height;
    lines_for_text_count = Math.floor(lines_for_text_count);
    return lines_for_text_count;
  }


  /**
   * Check if there is a line that has no word-breaks and forces window to become wider
   */
  checkForcedWidth() {
    var maximum_string_width = 0;

    for(var i=0;i<this.split_words.length;i++) {
      var block = this.split_words[i];
      if(block.match(/^\s+$/)) { // только строка из пробелов совершает word-break, так что её не проверяем
        continue;
      }
      if(maximum_string_width < this.getStringWidth(block)) {
        maximum_string_width = this.getStringWidth(block);
      }
    }

    for(var i=0;i<99;i++) {
      var proposed_width = i * this.border_size;
      if(proposed_width > maximum_string_width) {
        this.forced_width = i;
        break;
      }
    }
  }

  setPopupHeight() {
    var proposed_height = 0;
    var text_height = this.text_by_lines.length * this.line_height;
    var subtractor = this.getPadding("top") + this.getPadding("bottom") + (this.isButtonsVisible() ? this.button_size[1] : 0);
    for(var i=1;i<(this.max_height+1);i++) {
      proposed_height = this.border_size * i - subtractor;
      if (proposed_height > text_height) {
        if(this.message_size.height < i) {
          this.message_size.height = i;
        }
        return;
      }
    }

    // если не нашлось подходящего размера, ставим максимальный, при котором есть скролл (64 * 5 = 320)
    this.message_size.height = this.max_height;
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
        width += this.letter_spacing;
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


  /**
   * Sets canvas element dimensions
   * @return {undefined}
   */
  setCanvasSize() {
    this.canvas.width = this.getCanvasWidth();
    this.canvas.height = this.getCanvasHeight();
  }


  /**
   * Returns canvas width (message window + shadow)
   * @return {number}
   */
  getCanvasWidth() {
    return this.getPopupWidth() + this.shadow_offset[0];
  }


  /**
   * Returns canvas height (message window + shadow)
   * @return {number}
   */
  getCanvasHeight() {
    return this.getPopupHeight() + this.shadow_offset[1];
  }


  /**
   * Returns full message window width in pixels
   * @return {number}
   */
  getPopupWidth() {
    return this.message_size.width * this.border_size;
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
    return this.message_size.height * this.border_size;
  }


  /**
   * Returns free vertical space for text in pixels
   * @return {number}
   */
  getPopupHeightWithoutPadding() {
    return this.getPopupHeight() - this.getPadding("top") - this.getPadding("bottom");
  }


  /**
   * Renders message window's shadow on canvas
   * @return {undefined}
   */
  drawShadow() {
    this.context.beginPath();
    this.context.fillStyle = "rgba(0,0,0,.1)";
    this.context.rect(
      this.shadow_offset[0],
      this.shadow_offset[1],
      this.getPopupWidth(),
      this.getPopupHeight()
    );
    this.context.fill();

    this.context.beginPath();
    this.context.fillStyle = "rgba(0,0,0,.1)";
    this.context.rect(
      this.shadow_offset[0] + 1,
      this.shadow_offset[1] + 1,
      this.getPopupWidth() - 2,
      this.getPopupHeight() - 2
    );
    this.context.fill();
  }


  /**
   * Renders background on canvas
   * @return {undefined}
   */
  drawBackground() {
    var x_cycles = Math.ceil(this.message_size.width * this.border_size / this.bg_size);
    var y_cycles = Math.ceil(this.message_size.height * this.border_size / this.bg_size);
    for(var y=0;y<y_cycles;y++) {
      for(var x=0;x<x_cycles;x++) {
        var width_to_draw = this.bg_size;
        var height_to_draw = this.bg_size;
        if(x + 1 == x_cycles) {
          width_to_draw = this.getPopupWidth() - x * this.bg_size;
        }
        if(y + 1 == y_cycles) {
          height_to_draw = this.getPopupHeight() - y * this.bg_size;
        }

        this.context.drawImage(
          this.sprite, 
          648, 
          0, 
          width_to_draw, 
          height_to_draw,
          x * this.bg_size,
          y * this.bg_size,
          width_to_draw, 
          height_to_draw
        );
      }
    }
  }


  /**
   * Visually renders message window on canvas
   * @return {undefined}
   */
  drawMessageWindow() {
    this.drawShadow();

    if(this.use_color) {
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
          x_to_set = this.getPopupWidth() - this.border_size;
          x_to_cut = this.border_size;
          color_x_to_set = this.getPopupWidth() - 8 - this.color_corner_size;
        }
        var y_to_set = 0;
        var y_to_cut = 0;
        var color_y_to_set = 8;
        if (y == 1) {
          y_to_set = this.getPopupHeight() - this.border_size;
          y_to_cut = this.border_size;
          color_y_to_set = this.getPopupHeight() - 8 - this.color_corner_size;
        }

        this.context.drawImage(
          this.sprite, 
          x_to_cut, 
          y_to_cut, 
          this.border_size, 
          this.border_size,
          x_to_set,
          y_to_set,
          this.border_size, 
          this.border_size,
        );

        // color
        if(this.use_color) {
          this.context.drawImage(
            this.sprite, 
            color_info.corners_offset[0] + (1 + this.color_corner_size) * x, 
            color_info.corners_offset[1] + (1 + this.color_corner_size) * y, 
            this.color_corner_size, 
            this.color_corner_size,
            color_x_to_set,
            color_y_to_set,
            this.color_corner_size, 
            this.color_corner_size
          );
        }
      }
    }

    // horizontal borders
    for(var i=1;i<this.message_size.width-1;i++) {
      var x_to_set = i * this.border_size;
      var y_to_set = this.getCanvasHeight() - this.horizontal_border_height - this.shadow_offset[1];
      // upper
      this.context.drawImage(
        this.sprite, 
        this.border_size * 2,
        0,
        this.border_size, 
        this.horizontal_border_height,
        x_to_set,
        0,
        this.border_size, 
        this.horizontal_border_height
      );

      // lower
      this.context.drawImage(
        this.sprite, 
        this.border_size * 2,
        this.horizontal_border_height + this.border_size,
        this.border_size, 
        this.horizontal_border_height,
        x_to_set,
        y_to_set,
        this.border_size, 
        this.horizontal_border_height
      );

      // colors
      if(this.use_color) {
        // upper
        this.context.drawImage(
          this.sprite, 
          this.border_size * 2,
          color_info.horizontals_offset,
          this.border_size, 
          this.horizontal_color_height,
          x_to_set,
          8,
          this.border_size, 
          this.horizontal_color_height
        );

        // lower
        this.context.drawImage(
          this.sprite, 
          this.border_size * 2,
          color_info.horizontals_offset + 1 + this.horizontal_color_height,
          this.border_size, 
          this.horizontal_color_height,
          x_to_set,
          y_to_set + 2,
          this.border_size, 
          this.horizontal_color_height
        );
      }
    }

    // vertical
    for(var i=1;i<this.message_size.height-1;i++) {
      var right_x_to_set = this.getCanvasWidth() - this.vertical_border_width - this.shadow_offset[0];
      var y_to_set = i * this.border_size;
      // left
      this.context.drawImage(
        this.sprite, 
        this.border_size * 2,
        this.horizontal_border_height,
        this.vertical_border_width, 
        this.border_size,
        0,
        y_to_set,
        this.vertical_border_width, 
        this.border_size
      );

      // right
      this.context.drawImage(
        this.sprite, 
        this.border_size * 3 - this.vertical_border_width,
        this.horizontal_border_height,
        this.vertical_border_width,
        this.border_size, 
        right_x_to_set,
        y_to_set,
        this.vertical_border_width,
        this.border_size
      );

      // colors
      if(this.use_color) {
        // left
        this.context.drawImage(
          this.sprite, 
          color_info.verticals_offset,
          this.border_size * 2,
          this.vertical_color_width,
          this.border_size, 
          8,
          y_to_set,
          this.vertical_color_width,
          this.border_size
        );

        // right
        this.context.drawImage(
          this.sprite, 
          color_info.verticals_offset,
          this.border_size * 2,
          this.vertical_color_width,
          this.border_size, 
          right_x_to_set + 2,
          y_to_set,
          this.vertical_color_width,
          this.border_size
        );
      }
    }

    // buttons
    var buttons_number = ((this.buttons_show.ok) ? 1 : 0) + ((this.buttons_show.cancel) ? 1 : 0);
    var button_y = this.getPopupHeight() - this.button_size[1] - this.getPadding("bottom");
    if(this.buttons_show.ok) {
      var ok_x;
      if(buttons_number == 1) {
        ok_x = (this.getPopupWidth() - this.button_size[0]) / 2;
      }
      if(buttons_number == 2) {
        ok_x = this.getPopupWidth() / 2 - (this.button_size[0] + this.button_margin / 2);
      }
      this.context.drawImage(
        this.sprite, 
        516,
        228,
        this.button_size[0],
        this.button_size[1],
        ok_x,
        button_y,
        this.button_size[0],
        this.button_size[1]
      );
    }

    if(this.buttons_show.cancel) {
      var cancel_x;
      if(buttons_number == 2) {
        cancel_x = (this.getPopupWidth() + this.button_margin) / 2;
      }
      if(buttons_number == 1) {
        cancel_x = (this.getPopupWidth() - this.button_size[0]) / 2;
      }
      this.context.drawImage(
        this.sprite, 
        516,
        259,
        this.button_size[0],
        this.button_size[1],
        cancel_x,
        button_y,
        this.button_size[0],
        this.button_size[1]
      );
    }
  }


  /**
   * Gets padding from single direction plus border size
   * @param {string} which - direction (top / right / bottom / left)
   * @return {undefined}
   */
  getPadding(which) {
    if(which == "bottom" && !this.isButtonsVisible()) {
      return this.getPadding("top");
    }

    var padding_to_return = (typeof this.message_size.padding === "undefined" || typeof this.message_size.padding[which] === "undefined")
      ? this.padding[which]
      : this.message_size.padding[which];
    var border_size = (which == "top" || which == "bottom") 
      ? this.horizontal_border_height
      : this.vertical_border_width;
    return padding_to_return + border_size;
  }


  /**
   * Draws scrollbar on canvas
   * @return {undefined}
   */
  drawScroll() {
    var scroll_x = this.getPopupWidth() - this.vertical_border_width - this.scroll_side - this.scroll_margins.right;
    var scroll_start_y = this.horizontal_border_height + this.scroll_margins.top;
    var scroll_end_y = this.getPopupHeight() - this.getPadding("bottom") - (this.isButtonsVisible() ? (this.button_size[1] + this.scroll_margins.bottom) : 0);
    // top arrow
    this.context.drawImage(
      this.sprite, 
      714, 
      257,
      this.scroll_side, 
      this.scroll_side,
      scroll_x,
      scroll_start_y,
      this.scroll_side, 
      this.scroll_side
    );

    // scroll handle
    this.context.drawImage(
      this.sprite, 
      731, 
      257,
      this.scroll_side, 
      this.scroll_side,
      scroll_x,
      scroll_start_y + this.scroll_side,
      this.scroll_side, 
      this.scroll_side
    );

    // bottom arrow
    this.context.drawImage(
      this.sprite, 
      748, 
      257,
      this.scroll_side, 
      this.scroll_side,
      scroll_x,
      scroll_end_y - this.scroll_side,
      this.scroll_side, 
      this.scroll_side
    );

    // scroll track
    this.context.fillStyle = "#000";
    this.context.beginPath();
    this.context.rect(
      scroll_x,
      scroll_start_y + 32,
      this.scroll_side,
      scroll_end_y - scroll_start_y - 48
    );
    this.context.fill();
  }

  isButtonsVisible() {
    return this.buttons_show.ok || this.buttons_show.cancel;
  }


  /**
   * Clears canvas and sets defaults where necessary
   * @return {undefined}
   */
  setDefaults() {
    this.forced_width = 0;
    this.forced_height = 0;
    this.scroll_visible = false;
    this.context.clearRect(0, 0, 999999, 999999);
  }


  /**
   * Sets event listeners for controls
   * @return {undefined}
   */
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


  /**
   * Sets message window color and sets color flag as selected
   * @param {string} color - color id
   * @return {undefined}
   */
  setColor(color) {
    var colors = document.querySelectorAll(".color-item");
    for(var i=0;i<colors.length;i++) {
      colors[i].classList.remove("selected");
    }
    document.querySelector(".color-item[data-color='" + color + "']").classList.add("selected");
    this.color = color;

    this.render();
  }

  /**
   * Toggles checkbox for buttons set control
   * @param {string} button_id - data-button attribute value
   * @return {undefined}
   */
  toggleCheckbox(button_id) {
    var new_value = !this.buttons_show[button_id];
    this.buttons_show[button_id] = new_value;

    document.querySelector(".checkbox-wrapper[data-button='" + button_id + "'] .checkbox-icon").classList[new_value ? "add" : "remove"]("checked");

    this.render();
  }

  getResizeOrHalfAt(type) {
    if(typeof this.message_size.lines !== "undefined") {
      if(typeof this.message_size.lines[this.text_by_lines.length] !== "undefined") {
        if(type == "half") {
          if(typeof this.message_size.lines[this.text_by_lines.length].half !== "undefined") {
            return this.message_size.lines[this.text_by_lines.length].half;
          }
        }
        if(type == "resize") {
          if(typeof this.message_size.lines[this.text_by_lines.length].resize !== "undefined") {
            return this.message_size.lines[this.text_by_lines.length].resize;
          }
        }
      }
    }
    return false;
  }

  getHalfAt() {
    return this.getResizeOrHalfAt("half");
  }

  getResizeAt() {
    return this.getResizeOrHalfAt("resize");
  }


  /**
   * Returns Y position of letter on canvas for rendering
   * @param {number} line_index
   * @param {object} char_info
   * @return {number}
   */
  getLetterY(line_index, char_info) {
    var y_to_draw = 0;

    y_to_draw = 
      line_index * this.line_height
      + (this.line_height - char_info.height) // positioning regular char relative to line
    ;
    // special char y position
    if(typeof char_info.translateY !== "undefined") {
      y_to_draw += char_info.translateY;
    }

    if(!this.isButtonsVisible()) {
      y_to_draw += Math.round((this.getPopupHeight() - this.text_by_lines.length * this.line_height)/2) - 7; // dunno what is 7 but it works :[
      return y_to_draw;
    }

    y_to_draw += 
      this.getPadding("top")
      - (this.text_by_lines.length - 1) * (this.line_height / 2) // text moves up half-line every line (first line does not move)
    ;
          
    if (this.message_size.height > 2) {
      y_to_draw += 14 + (this.message_size.height - 2) * this.line_height;
    }

    // sorry, I don't care anymore.............
    if(this.message_size.width == 5) {
      if (this.text_by_lines.length >= 9) {
        y_to_draw += this.line_height;
      } else if (this.text_by_lines.length >= 5) {
        y_to_draw += this.line_height / 2;
      }
    } else if(this.message_size.width == 7) {
      if (this.text_by_lines.length >= 9) {
        y_to_draw += this.line_height;
      } else if (this.text_by_lines.length >= 7) {
        y_to_draw += this.line_height / 2;
      }
    } else if(this.message_size.width == 10) {
      if (this.text_by_lines.length >= 9) {
        y_to_draw += this.line_height / 2;
      }
    }

    // raise by half-line
    if (this.raise_by_half_line) {
      y_to_draw -= this.line_height / 2;
    }

    return y_to_draw;
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

HommMessageGenerator.sizes = [
  {
    "width": 4,
    "height": 2,
    "max_text_lines": 1,
    "last_line_width": 202
  },
  {
    "width": 5,
    "height": 2,
    "max_text_lines": 1,
    "padding": {
      "right": 19,
      "left": 18
    }
  },
  {
    "width": 5,
    "height": 3,
    "max_text_lines": 4,
    "lines": {
      2: {
        "half": 242
      },
      3: {
        "half": 222
      },
      4: {
        "resize": 206
      }
    },
  },
  {
    "width": 5,
    "height": 4,
    "max_text_lines": 8,
    "lines": {
      5: {
        "half": 190
      },
      6: {
        "half": 174
      },
      7: {
        "half": 158
      },
      8: {
        "resize": 142
      }
    },
    "padding": {
      "top": 16,
    }
  },
  {
    "width": 5,
    "height": 5,
    "max_text_lines": 9,
    "lines": {
      9: {
        "resize": 126
      }
    },
    "padding": {
      "top": 21,
    }
  },
  {
    "width": 7,
    "height": 4,
    "max_text_lines": 8,
    "lines": {
      7: {
        "half": 286
      },
      8: {
        "resize": 270
      }
    },
    "padding": {
      "top": 16
    }
  },
  {
    "width": 7,
    "height": 5,
    "max_text_lines": 11,
    "lines": {
      9: {
        "half": 254
      },
      10: {
        "half": 238
      },
      11: {
        "resize": 222
      }
    },
    "padding": {
      "top": 21
    }
  },
  {
    "width": 10,
    "height": 4,
    "max_text_lines": 8,
    "lines": {
      8: {
        "resize": 466
      },
    },
    "padding": {
      "top": 25
    }
  },
  {
    "width": 10,
    "height": 5,
    "max_text_lines": 11,
    "lines": {
      9: {
        "half": 446
      },
      10: {
        "half": 430
      },
      11: {
        "resize": 414
      }
    },
    "padding": {
      "top": 30
    }
  },
  {
    "width": 10,
    "height": 5,
    "scroll": true,
    "max_text_lines": 11,
    "padding": {
      "top": 29,
      "right": 38,
      "left": 11
    }
  }
];