const GObject = imports.gi.GObject;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;

var AsusItem = GObject.registerClass(
  class AsusItem extends PopupMenu.PopupBaseMenuItem {
    _init(key, label, value, displayName) {
      super._init();
      this._main = false;
      this._key = key;

      this._labelActor = new St.Label({
        text: displayName ? displayName : label,
        x_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
      });
      this.actor.add_child(this._labelActor);
    }

    set main(main) {
      if (main) this.setOrnament(PopupMenu.Ornament.CHECK);
      else this.setOrnament(PopupMenu.Ornament.NONE);
      this._main = main;
    }

    get main() {
      return this._main;
    }

    get key() {
      return this._key;
    }

    set display_name(text) {
      return (this._labelActor.text = text);
    }
    set value(value) {
      this._valueLabel.text = value;
    }
  }
);
