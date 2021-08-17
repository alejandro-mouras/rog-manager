// Example#4

const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Me.metadata["gettext-domain"]);
const _ = Gettext.gettext;

function init() {}

const RogPrefsWidget = GObject.registerClass(
  class Rog_RogPrefsWidget extends Gtk.Grid {
    _init() {
      super._init();

      // this.margin = 20;
      // this.set_spacing(15);
      // this.set_orientation(Gtk.Orientation.VERTICAL);

      // this.connect("destroy", Gtk.main_quit);

      // let myLabel = new Gtk.Label({
      //   label: "Translated Text",
      // });

      // let spinButton = new Gtk.SpinButton();
      // spinButton.set_sensitive(true);
      // spinButton.set_range(-60, 60);
      // spinButton.set_value(0);
      // spinButton.set_increments(1, 2);

      // spinButton.connect("value-changed", function (w) {
      //   log(w.get_value_as_int());
      // });

      // let hBox = new Gtk.Box();
      // hBox.set_orientation(Gtk.Orientation.HORIZONTAL);

      // hBox.pack_start(myLabel, false, false, 0);
      // hBox.pack_end(spinButton, false, false, 0);

      // this.add(hBox);

      this._settings = ExtensionUtils.getSettings();

      let i = 0;
      this.attach(
        new Gtk.Label({
          label: _("Poll Sensors Every (sec)"),
          halign: Gtk.Align.END,
        }),
        0,
        i,
        1,
        1
      );
      let updateTime = Gtk.SpinButton.new_with_range(1, 60, 1);
      this.attach(updateTime, 1, i++, 1, 1);
      this._settings.bind("update-time", updateTime, "value", Gio.SettingsBindFlags.DEFAULT);

      let panelBoxIndex = Gtk.SpinButton.new_with_range(-1, 20, 1);
      this.attach(panelBoxIndex, 2, i, 1, 1);
      this._settings.bind("panel-box-index", panelBoxIndex, "value", Gio.SettingsBindFlags.DEFAULT);

      this._addComboBox({
        items: { left: _("Left"), center: _("Center"), right: _("Right") },
        key: "position-in-panel",
        y: i,
        x: 0,
        label: _("Position in Panel"),
      });
    }

    _addComboBox(params) {
      let model = new Gtk.ListStore();
      model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

      let combobox = new Gtk.ComboBox({ model: model });
      let renderer = new Gtk.CellRendererText();
      combobox.pack_start(renderer, true);
      combobox.add_attribute(renderer, "text", 1);

      for (let k in params.items) {
        model.set(model.append(), [0, 1], [k, params.items[k]]);
      }

      combobox.set_active(Object.keys(params.items).indexOf(this._settings.get_string(params.key)));

      combobox.connect("changed", (entry) => {
        let [success, iter] = combobox.get_active_iter();
        if (!success) return;
        this._settings.set_string(params.key, model.get_value(iter, 0));
      });

      this.attach(new Gtk.Label({ label: params.label, halign: Gtk.Align.END }), params.x, params.y, 1, 1);
      this.attach(combobox, params.x + 1, params.y, 1, 1);
    }
  }
);

function buildPrefsWidget() {
  let widget = new RogPrefsWidget();
  widget.show_all();
  return widget;
}
