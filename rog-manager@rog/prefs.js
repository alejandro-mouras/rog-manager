// Example#4

const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Me.metadata["gettext-domain"]);
const _ = Gettext.gettext;

function init() {}

const RogPrefsWidget = GObject.registerClass(
  class Rog_RogPrefsWidget extends Gtk.Grid {
    _init() {
      super._init();
      this.margin = this.row_spacing = this.column_spacing = 20;

      this._settings = ExtensionUtils.getSettings();

      let i = 0;

      this._addComboBox({
        items: { left: _("Left"), center: _("Center"), right: _("Right") },
        key: "position-in-panel",
        y: i,
        x: 0,
        label: _("Position in Panel"),
      });

      let panelBoxIndex = Gtk.SpinButton.new_with_range(-1, 20, 1);
      this.attach(panelBoxIndex, 2, i, 1, 1);
      this._settings.bind("panel-box-index", panelBoxIndex, "value", Gio.SettingsBindFlags.DEFAULT);

      this._addLineEdit({
        text: { left: _("Left"), center: _("Center"), right: _("Right") },
        key: "upported-features",
        y: i + 1,
        x: 0,
        label: _("Supported features"),
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

    _addLineEdit(params) {
      let lbl = new Gtk.Label({ label: params.label, halign: Gtk.Align.END });
      this.attach(lbl, params.x, params.y, 1, 1);
      let text = new Gtk.Label({
        label: GLib.spawn_command_line_sync("asusctl -s")[1].toString(),
        halign: Gtk.Align.END,
      });
      this.attach(text, params.x, params.y, 1, 1);
    }
  }
);

function buildPrefsWidget() {
  let widget = new RogPrefsWidget();
  widget.show_all();
  return widget;
}
