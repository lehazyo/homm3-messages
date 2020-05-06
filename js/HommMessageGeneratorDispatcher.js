class HommMessageGeneratorDispatcher {
  constructor() {
    this.input = document.getElementById("input");
    this.input.addEventListener("input", this.render.bind(this));
    this.canvas = document.getElementById("canvas");
    this.context = this.canvas.getContext("2d");

    this.renderer = null;
    this.homm3 = new Homm3MessageGenerator(this);
    this.homm2 = new Homm2MessageGenerator(this);

    this.split_words = []; // text split into separate words and spaces blocks

    this.setRenderer("homm3");

    this.color = "red";
    this.buttons_show = {
      "ok": true,
      "cancel": false
    };
    this.draw_shadow = false;

    this.initControls();

    // this.setTestText("alphabets");
  }


  setRenderer(type) {
    if(!type.match(/^homm[23]$/)) {
      return;
    }
    if(this.renderer !== null) {
      this.renderer.is_current_renderer = false;
    }

    this.renderer = this[type];
    this.renderer.is_current_renderer = true;
    this.renderer.render();

    document.querySelector("body").classList.remove("homm2", "homm3");
    document.querySelector("body").classList.add(type);
  }

  render() {
    this.breakInputIntoWordsAndSpaces();

    this.renderer.render();
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

    var checkboxes = document.querySelectorAll(".checkbox-wrapper input");
    for(var i=0;i<checkboxes.length;i++) {
      checkboxes[i].addEventListener("change", this.toggleCheckbox.bind(this, checkboxes[i]));
    }

    var theme_radios = document.querySelectorAll(".input-wrapper-homm2-theme input");
    for(var i=0;i<theme_radios.length;i++) {
      theme_radios[i].addEventListener("change", this.changeThemeRadio.bind(this, theme_radios[i]));
    }

    var style_radios = document.querySelectorAll(".radios-wrapper-style input");
    for(var i=0;i<style_radios.length;i++) {
      style_radios[i].addEventListener("change", this.changeStyleRadio.bind(this, style_radios[i]));
    }

    document.querySelector(".about-icon.open").addEventListener("click", function() {
      document.querySelector(".left-panel").classList.add("about");
    });
    document.querySelector(".about-icon.close").addEventListener("click", function() {
      document.querySelector(".left-panel").classList.remove("about");
    });
    document.querySelector(".download-button").addEventListener("mousedown", this.prepareCurrentImageDownload.bind(this));
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
  toggleCheckbox(checkbox) {
    var new_value = checkbox.checked;
    var checkbox_name = checkbox.getAttribute("name");
    if(checkbox_name == "shadow") {
      this.draw_shadow = new_value;
    } else {
      this.buttons_show[checkbox_name] = new_value;
    }

    this.render();
  }

  changeThemeRadio(radio) {
    this.homm2.setTheme(radio.value);
  }

  changeStyleRadio(radio) {
    this.setRenderer(radio.value);
  }

  /**
   * Starts downloading of current image as file
   */
  prepareCurrentImageDownload() {
    var download_button = document.querySelector(".download-button");
    var current_date = new Date();
    download_button.download = "HoMM3-message-" + (current_date.getTime()) + ".png";
    download_button.href = this.canvas.toDataURL();
  }


  /**
   * Sets text 
   * @param {string} which 
   */
  setTestText(which) {
    var test_texts = {
      "long": "Cwm fjord veg balks nth pyx quiz. (Relaxing in basins at the end of inlets terminates the endless tests from the box.) Cwm fjord bank glyphs vext quiz. (Carved symbols in a mountain hollow on the bank of an inlet irritated an eccentric person.)[1] Jink cwm, zag veldt, fob qursh pyx. (Cross valley and plain to steal coins from Saudi mint. – created by Stephen Wagner) Junky qoph-flags vext crwd zimb. (An Abyssinian fly playing a Celtic violin was annoyed by trashy flags on which were the Hebrew letter qoph.) Squdgy fez, blank jimp crwth vox! (A short brimless felt hat barely blocks out the sound of a Celtic violin. – created by Claude Shannon) Veldt jynx grimps waqf zho buck (A grass-plains wryneck climbs upon a male yak-cattle hybrid that was donated under Islamic law.) Bortz waqf glyphs vex muck djin. (Signage indicating endowments for industrial diamonds annoy filth-spreading genies. – created by Ed Spargo)\n\nMorey Moseson didn’t know what he wanted to be when he grew up. Not for lack of options — the world seemed impossibly full. He was the class valedictorian, and the class clown. He loved to dance to Benny Goodman and Glenn Miller. His sister, Lee, two years older, taught him how to do the Lindy hop. They’d practice the eight-count step late at night, big band swing notes at 78 r.p.m. filling the rooms of their home in Jamaica, Queens.\n\nWhen Morey’s parents wanted to conceal a conversation from their prying kids, they spoke Yiddish. Ever resourceful, their son took up German to help him interpret the adult exchanges. His linguistic training proved prescient. When he turned 18, in 1944, he joined the legions of young American men serving the war effort, as a translator for the 318th Infantry Regiment.\n\nOne summer my father came across a vinyl that Morey, my great-uncle, recorded with his mother, father and sister in a Midtown Manhattan studio, just after his training at Fort McClellan and before he shipped out to Europe.\n\n“You’ve grown a lot in the last few months,” said his mother, Florence, to her 5-foot-10, 170-pound son. “Maybe you’ll help do the yard when you get home.”",
      "2pangrams": "The quick brown fox jumps over the lazy dog\n\nСъешь ещё этих мягких французских булок да выпей же чаю",
      "detsl": "Три кирпича на грудь меня чуть прибило под выстрелами пушки сердце биться не хотело тело двигать не могло по голове веслом размытая картина, но я дышу всем назло меня били ногами так чтоб я не мог встать какой там Кричать я Даже Не Мог простонать Один сукин сын Вколол в мою ногу Шило просто Так ему Ништяк Увидеть кровь по колено я полз как змея рассмАтривая злые рыла убитая одНа скотина Плюнуть на меня Посмела сжимаясь в комок теряя мысленный контроль Я Вылетел из Тела пулей Наблюдая за собой Я вспоминаю Интонации Структуру слова Из поСледних сил небесных Вернулся в Себя и Только Громкий смех Этих грязных скотов в памяти запечатлел Начало Войный без слов Три месяца спустя остыла голова я вЫшел из больницы На дворе была Уже весна мой Друг мне помог Найти адреса Изучить от начала и до конца" //  узнать
    };

    // all possible symbols divided by spaces
    test_texts.alphabets = "";
    for(var letter_keys in HommMessageGenerator.letters) {
      if(test_texts.alphabets.length) {
        test_texts.alphabets += " ";
      }
      test_texts.alphabets += letter_keys;
    }

    this.input.value = test_texts[which];
  }

  isButtonsVisible() {
    return this.buttons_show.ok || this.buttons_show.cancel;
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
  }

  getInputValue() {
    return this.input.value;
  }

  getInputValueLength() {
    return this.getInputValue().length;
  }

  getCharInfo(object, char) {
    if(typeof object.letters[char] === "undefined") {
      return null;
    }
    var original_char_info = object.letters[char];
    if(typeof original_char_info.same_as !== "undefined") {
      var real_char = original_char_info.same_as;
      return object.letters[real_char];
    } else {
      return original_char_info;
    }
  }
}